import path from "node:path";

import { z } from "zod";

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() !== "" ? value.trim() : null,
    z.string().max(maximum).nullable(),
  );

const uploadMetadataSchema = z
  .object({
    altText: optionalText(500),
    caption: optionalText(500),
    credit: optionalText(500),
    decorative: z.preprocess(
      (value) => value === "true" || value === "on",
      z.boolean(),
    ),
    rights: optionalText(500),
    source: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() !== ""
          ? value.trim()
          : null,
      z
        .string()
        .url()
        .max(2048)
        .refine((value) => new URL(value).protocol === "https:", {
          message: "Sursa trebuie să folosească HTTPS.",
        })
        .nullable(),
    ),
    title: optionalText(160),
  })
  .superRefine((value, context) => {
    if (!value.decorative && !value.altText) {
      context.addIssue({
        code: "custom",
        message:
          "Textul alternativ este obligatoriu pentru imaginile informative.",
        path: ["altText"],
      });
    }
  });

export type CmsMediaUploadMetadata = z.infer<typeof uploadMetadataSchema>;

export type ParsedCmsMediaUpload = {
  file: File;
  metadata: CmsMediaUploadMetadata;
  originalFileName: string;
};

export class CmsMediaUploadRequestError extends Error {
  constructor(
    public readonly code:
      | "invalid_form"
      | "missing_file"
      | "invalid_metadata"
      | "invalid_filename",
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "CmsMediaUploadRequestError";
  }
}

export function isExactSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function parseCmsMediaUpload(formData: FormData): ParsedCmsMediaUpload {
  const fileValue = formData.get("file");

  if (!(fileValue instanceof File)) {
    throw new CmsMediaUploadRequestError(
      "missing_file",
      "Selectați o imagine pentru încărcare.",
      { file: ["Selectați o imagine pentru încărcare."] },
    );
  }

  const originalFileName = path.basename(fileValue.name);

  if (
    originalFileName.length === 0 ||
    originalFileName.length > 255 ||
    /[\u0000-\u001f\u007f]/.test(originalFileName)
  ) {
    throw new CmsMediaUploadRequestError(
      "invalid_filename",
      "Numele fișierului este invalid.",
      { file: ["Numele fișierului este invalid."] },
    );
  }

  const parsedMetadata = uploadMetadataSchema.safeParse({
    altText: formData.get("altText"),
    caption: formData.get("caption"),
    credit: formData.get("credit"),
    decorative: formData.get("decorative"),
    rights: formData.get("rights"),
    source: formData.get("source"),
    title: formData.get("title"),
  });

  if (!parsedMetadata.success) {
    const flattened = z.flattenError(parsedMetadata.error);

    throw new CmsMediaUploadRequestError(
      "invalid_metadata",
      "Metadatele imaginii sunt invalide.",
      Object.fromEntries(
        Object.entries(flattened.fieldErrors).filter(
          (entry): entry is [string, string[]] =>
            Array.isArray(entry[1]) && entry[1].length > 0,
        ),
      ),
    );
  }

  return {
    file: fileValue,
    metadata: parsedMetadata.data,
    originalFileName,
  };
}
