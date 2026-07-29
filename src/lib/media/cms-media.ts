import { createHash } from "node:crypto";
import path from "node:path";

import sharp from "sharp";
import { z } from "zod";

const MEBIBYTE = 1024 * 1024;
const DEFAULT_MAX_BYTES = 6 * MEBIBYTE;
const HARD_MAX_BYTES = 10 * MEBIBYTE;
const DEFAULT_MAX_DIMENSION = 4096;
const HARD_MAX_DIMENSION = 6000;
const RESPONSIVE_WIDTHS = [640, 1280, 1920] as const;

const rasterMimeTypes = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

const rasterExtensions = {
  ".jpeg": "jpeg",
  ".jpg": "jpeg",
  ".png": "png",
  ".webp": "webp",
} as const;

type AcceptedRasterFormat = keyof typeof rasterMimeTypes;

export type CmsImageConfig = {
  maxBytes: number;
  maxHeight: number;
  maxWidth: number;
};

export type CmsImageVariant = {
  bytes: Buffer;
  byteSize: number;
  checksumSha256: string;
  height: number;
  key: "640" | "1280" | "1920" | "original";
  mimeType: "image/webp";
  width: number;
};

export type ProcessedCmsImage = {
  originalFormat: AcceptedRasterFormat;
  originalHeight: number;
  originalWidth: number;
  variants: CmsImageVariant[];
};

export class CmsMediaValidationError extends Error {
  constructor(
    public readonly code:
      | "empty_file"
      | "file_too_large"
      | "unsupported_extension"
      | "unsupported_mime"
      | "signature_mismatch"
      | "decode_failed"
      | "invalid_dimensions"
      | "animated_image",
    message: string,
  ) {
    super(message);
    this.name = "CmsMediaValidationError";
  }
}

const imageEnvironmentSchema = z.object({
  CMS_MAX_IMAGE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .max(HARD_MAX_BYTES)
    .default(DEFAULT_MAX_BYTES),
  CMS_MAX_IMAGE_HEIGHT: z.coerce
    .number()
    .int()
    .positive()
    .max(HARD_MAX_DIMENSION)
    .default(DEFAULT_MAX_DIMENSION),
  CMS_MAX_IMAGE_WIDTH: z.coerce
    .number()
    .int()
    .positive()
    .max(HARD_MAX_DIMENSION)
    .default(DEFAULT_MAX_DIMENSION),
});

export function getCmsImageConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): CmsImageConfig {
  const parsed = imageEnvironmentSchema.safeParse(environment);

  if (!parsed.success) {
    throw new Error("Configurația limitelor media CMS este invalidă.");
  }

  return {
    maxBytes: parsed.data.CMS_MAX_IMAGE_BYTES,
    maxHeight: parsed.data.CMS_MAX_IMAGE_HEIGHT,
    maxWidth: parsed.data.CMS_MAX_IMAGE_WIDTH,
  };
}

function signatureFormat(bytes: Buffer): AcceptedRasterFormat | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    return "png";
  }

  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

function expectedFormat(fileName: string, mimeType: string): AcceptedRasterFormat {
  const extension = path.extname(fileName).toLowerCase();
  const extensionFormat =
    rasterExtensions[extension as keyof typeof rasterExtensions];

  if (!extensionFormat) {
    throw new CmsMediaValidationError(
      "unsupported_extension",
      "Sunt acceptate doar fișiere JPEG, PNG sau WebP.",
    );
  }

  const mimeFormat = Object.entries(rasterMimeTypes).find(
    ([, acceptedMime]) => acceptedMime === mimeType.toLowerCase(),
  )?.[0] as AcceptedRasterFormat | undefined;

  if (!mimeFormat) {
    throw new CmsMediaValidationError(
      "unsupported_mime",
      "Tipul MIME trebuie să fie JPEG, PNG sau WebP.",
    );
  }

  if (extensionFormat !== mimeFormat) {
    throw new CmsMediaValidationError(
      "signature_mismatch",
      "Extensia fișierului nu corespunde tipului MIME declarat.",
    );
  }

  return extensionFormat;
}

function checksum(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function processCmsImage(input: {
  bytes: Buffer;
  fileName: string;
  mimeType: string;
  config?: CmsImageConfig;
}): Promise<ProcessedCmsImage> {
  const config = input.config ?? getCmsImageConfig();

  if (input.bytes.length === 0) {
    throw new CmsMediaValidationError("empty_file", "Fișierul este gol.");
  }

  if (input.bytes.length > config.maxBytes) {
    throw new CmsMediaValidationError(
      "file_too_large",
      `Imaginea depășește limita de ${config.maxBytes} bytes.`,
    );
  }

  const declaredFormat = expectedFormat(input.fileName, input.mimeType);
  const detectedSignature = signatureFormat(input.bytes);

  if (!detectedSignature || detectedSignature !== declaredFormat) {
    throw new CmsMediaValidationError(
      "signature_mismatch",
      "Semnătura fișierului nu corespunde formatului declarat.",
    );
  }

  const metadata = await (async () => {
    try {
      return await sharp(input.bytes, {
        animated: true,
        failOn: "error",
        limitInputPixels: HARD_MAX_DIMENSION * HARD_MAX_DIMENSION,
      }).metadata();
    } catch {
      throw new CmsMediaValidationError(
        "decode_failed",
        "Imaginea nu a putut fi decodată în siguranță.",
      );
    }
  })();

  if (
    metadata.format !== declaredFormat ||
    !metadata.width ||
    !metadata.height
  ) {
    throw new CmsMediaValidationError(
      "decode_failed",
      "Formatul decodat nu corespunde imaginii declarate.",
    );
  }

  if ((metadata.pages ?? 1) > 1) {
    throw new CmsMediaValidationError(
      "animated_image",
      "Imaginile animate nu sunt acceptate.",
    );
  }

  const rotated = metadata.autoOrient;
  const originalWidth = rotated?.width ?? metadata.width;
  const originalHeight = rotated?.height ?? metadata.height;

  if (
    originalWidth > config.maxWidth ||
    originalHeight > config.maxHeight
  ) {
    throw new CmsMediaValidationError(
      "invalid_dimensions",
      `Imaginea depășește dimensiunea maximă ${config.maxWidth}×${config.maxHeight}.`,
    );
  }

  const requestedWidths = [
    ...RESPONSIVE_WIDTHS.filter((width) => width < originalWidth),
    originalWidth,
  ];
  const uniqueWidths = [...new Set(requestedWidths)].sort((left, right) => left - right);
  const variants: CmsImageVariant[] = [];

  for (const width of uniqueWidths) {
    const { data, info } = await sharp(input.bytes, {
      failOn: "error",
      limitInputPixels: HARD_MAX_DIMENSION * HARD_MAX_DIMENSION,
    })
      .rotate()
      .resize({
        fit: "inside",
        height: config.maxHeight,
        width,
        withoutEnlargement: true,
      })
      .webp({
        effort: 4,
        quality: 82,
      })
      .toBuffer({ resolveWithObject: true });

    variants.push({
      bytes: data,
      byteSize: data.byteLength,
      checksumSha256: checksum(data),
      height: info.height,
      key:
        width === originalWidth
          ? "original"
          : (`${width}` as "640" | "1280" | "1920"),
      mimeType: "image/webp",
      width: info.width,
    });
  }

  return {
    originalFormat: declaredFormat,
    originalHeight,
    originalWidth,
    variants,
  };
}
