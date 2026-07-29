import { z } from "zod";

export const cmsMediaVariantKeySchema = z.union([
  z.literal("640"),
  z.literal("1280"),
  z.literal("1920"),
  z.literal("original"),
]);

const cmsMediaVariantSchema = z.object({
  byteSize: z.number().int().nonnegative(),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
  height: z.number().int().positive(),
  key: cmsMediaVariantKeySchema,
  path: z
    .string()
    .regex(
      /^cms\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/(?:640|1280|1920|original)\.webp$/,
    )
    .max(1024),
  width: z.number().int().positive(),
});

export const cmsMediaMetadataSchema = z.object({
  credit: z.string().max(500).nullable().optional(),
  originalFileName: z.string().max(255),
  originalFormat: z.enum(["jpeg", "png", "webp"]),
  rights: z.string().max(500).nullable().optional(),
  source: z
    .string()
    .url()
    .max(2048)
    .refine((value) => new URL(value).protocol === "https:", {
      message: "Sursa media trebuie să folosească HTTPS.",
    })
    .nullable()
    .optional(),
  variants: z.array(cmsMediaVariantSchema).min(1).max(4),
  version: z.literal(1),
});

export type CmsMediaMetadata = z.infer<typeof cmsMediaMetadataSchema>;
export type CmsMediaVariantKey = z.infer<typeof cmsMediaVariantKeySchema>;

export function getCmsMediaVariant(
  metadata: unknown,
  key: unknown,
) {
  const parsedKey = cmsMediaVariantKeySchema.safeParse(key);
  const parsedMetadata = cmsMediaMetadataSchema.safeParse(metadata);

  if (!parsedKey.success || !parsedMetadata.success) {
    return null;
  }

  const exact = parsedMetadata.data.variants.find(
    (variant) => variant.key === parsedKey.data,
  );

  if (exact || parsedKey.data === "original") {
    return exact ?? null;
  }

  const requestedWidth = Number(parsedKey.data);
  const sortedVariants = [...parsedMetadata.data.variants].sort(
    (left, right) => left.width - right.width,
  );

  return (
    sortedVariants.find((variant) => variant.width >= requestedWidth) ??
    sortedVariants.at(-1) ??
    null
  );
}

export function buildPublicCmsMediaUrl(
  mediaId: number,
  key: CmsMediaVariantKey = "original",
) {
  if (!Number.isSafeInteger(mediaId) || mediaId <= 0) {
    throw new Error("ID-ul media CMS este invalid.");
  }

  return `/media/cms/${mediaId}/${key}`;
}

export function buildAdminCmsMediaUrl(
  mediaId: number,
  key: CmsMediaVariantKey = "original",
) {
  if (!Number.isSafeInteger(mediaId) || mediaId <= 0) {
    throw new Error("ID-ul media CMS este invalid.");
  }

  return `/admin/media/${mediaId}/${key}`;
}
