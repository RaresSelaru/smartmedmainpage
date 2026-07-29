import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminCapability } from "@/lib/admin/auth";
import { createServerSupabaseClient } from "@/lib/auth/supabase";
import {
  CmsMediaValidationError,
  getCmsImageConfig,
  processCmsImage,
} from "@/lib/media/cms-media";
import { buildAdminCmsMediaUrl } from "@/lib/media/cms-media-record";
import {
  CmsMediaUploadRequestError,
  isExactSameOriginRequest,
  parseCmsMediaUpload,
} from "@/lib/media/cms-media-upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CMS_MEDIA_BUCKET = "cms-media";

type RegisterMediaArgs = {
  p_byte_size: number;
  p_caption: string | null;
  p_checksum_sha256: string;
  p_correlation_id: string;
  p_default_alt_text: string | null;
  p_height: number;
  p_metadata: Record<string, unknown>;
  p_mime_type: "image/webp";
  p_storage_path: string;
  p_title: string | null;
  p_width: number;
};

type RegisterMediaRpc = {
  rpc(
    name: "cms_register_media",
    args: RegisterMediaArgs,
  ): PromiseLike<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
};

const registerMediaResultSchema = z.object({
  changed: z.boolean().optional(),
  mediaId: z.number().int().positive(),
});

function noStoreHeaders() {
  return {
    "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
  };
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>,
) {
  return NextResponse.json(
    {
      code,
      ...(fieldErrors ? { fieldErrors } : {}),
      message,
      ok: false,
    },
    {
      headers: noStoreHeaders(),
      status,
    },
  );
}

function authorizationStatus(
  code:
    | "configuration"
    | "email-unconfirmed"
    | "forbidden"
    | "mfa-required"
    | "unauthenticated"
    | "unavailable",
) {
  if (code === "unauthenticated") {
    return 401;
  }

  if (code === "configuration" || code === "unavailable") {
    return 503;
  }

  return 403;
}

export async function POST(request: Request) {
  if (!isExactSameOriginRequest(request)) {
    return errorResponse(
      403,
      "invalid_origin",
      "Originea solicitării de încărcare nu este acceptată.",
    );
  }

  const authorization = await authorizeAdminCapability(
    "content.media.manage",
  );

  if (!authorization.ok) {
    return errorResponse(
      authorizationStatus(authorization.code),
      authorization.code,
      "Încărcarea media nu este autorizată.",
    );
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return errorResponse(
      503,
      "configuration",
      "Serviciul media nu este configurat.",
    );
  }

  let upload;

  try {
    upload = parseCmsMediaUpload(await request.formData());
  } catch (error) {
    if (error instanceof CmsMediaUploadRequestError) {
      return errorResponse(400, error.code, error.message, error.fieldErrors);
    }

    return errorResponse(
      400,
      "invalid_form",
      "Formularul de încărcare nu a putut fi citit.",
    );
  }

  const config = getCmsImageConfig();

  if (upload.file.size > config.maxBytes) {
    return errorResponse(
      413,
      "file_too_large",
      `Imaginea depășește limita de ${config.maxBytes} bytes.`,
      { file: [`Imaginea depășește limita de ${config.maxBytes} bytes.`] },
    );
  }

  let processed;

  try {
    processed = await processCmsImage({
      bytes: Buffer.from(await upload.file.arrayBuffer()),
      config,
      fileName: upload.originalFileName,
      mimeType: upload.file.type,
    });
  } catch (error) {
    if (error instanceof CmsMediaValidationError) {
      const status = error.code === "file_too_large" ? 413 : 400;
      return errorResponse(status, error.code, error.message, {
        file: [error.message],
      });
    }

    console.error("SmartMed CMS image processing failed", {
      userId: authorization.context.id,
    });
    return errorResponse(
      500,
      "processing_failed",
      "Imaginea nu a putut fi procesată în siguranță.",
    );
  }

  const objectId = randomUUID();
  const uploadedPaths: string[] = [];
  const variantRecords: Array<{
    byteSize: number;
    checksumSha256: string;
    height: number;
    key: "640" | "1280" | "1920" | "original";
    path: string;
    width: number;
  }> = [];

  const cleanupUploadedObjects = async () => {
    if (uploadedPaths.length === 0) {
      return;
    }

    const { error } = await supabase.storage
      .from(CMS_MEDIA_BUCKET)
      .remove(uploadedPaths);

    if (error) {
      console.error("SmartMed private CMS upload cleanup failed", {
        code: error.name,
        objectCount: uploadedPaths.length,
        userId: authorization.context.id,
      });
    }
  };

  for (const variant of processed.variants) {
    const storagePath = `cms/${objectId}/${variant.key}.webp`;
    const { error } = await supabase.storage
      .from(CMS_MEDIA_BUCKET)
      .upload(storagePath, variant.bytes, {
        cacheControl: "0",
        contentType: variant.mimeType,
        upsert: false,
      });

    if (error) {
      await cleanupUploadedObjects();
      console.error("SmartMed private CMS object upload failed", {
        code: error.name,
        userId: authorization.context.id,
        variant: variant.key,
      });
      return errorResponse(
        502,
        "storage_failed",
        "Imaginea nu a putut fi stocată.",
      );
    }

    uploadedPaths.push(storagePath);
    variantRecords.push({
      byteSize: variant.byteSize,
      checksumSha256: variant.checksumSha256,
      height: variant.height,
      key: variant.key,
      path: storagePath,
      width: variant.width,
    });
  }

  const originalVariant = variantRecords.find(
    (variant) => variant.key === "original",
  );

  if (!originalVariant) {
    await cleanupUploadedObjects();
    return errorResponse(
      500,
      "processing_failed",
      "Varianta originală procesată lipsește.",
    );
  }

  const correlationId = randomUUID();
  const registerResult = await (supabase as unknown as RegisterMediaRpc).rpc(
    "cms_register_media",
    {
      p_byte_size: originalVariant.byteSize,
      p_caption: upload.metadata.caption,
      p_checksum_sha256: originalVariant.checksumSha256,
      p_correlation_id: correlationId,
      p_default_alt_text: upload.metadata.decorative
        ? null
        : upload.metadata.altText,
      p_height: originalVariant.height,
      p_metadata: {
        credit: upload.metadata.credit,
        decorative: upload.metadata.decorative,
        originalFileName: upload.originalFileName,
        originalFormat: processed.originalFormat,
        rights: upload.metadata.rights,
        source: upload.metadata.source,
        variants: variantRecords,
        version: 1,
      },
      p_mime_type: "image/webp",
      p_storage_path: originalVariant.path,
      p_title: upload.metadata.title,
      p_width: originalVariant.width,
    },
  );
  const parsedRegistration = registerMediaResultSchema.safeParse(
    registerResult.data,
  );

  if (registerResult.error || !parsedRegistration.success) {
    await cleanupUploadedObjects();
    console.error("SmartMed CMS media registration failed", {
      code: registerResult.error?.code ?? "invalid_response",
      correlationId,
      userId: authorization.context.id,
    });
    return errorResponse(
      502,
      "registration_failed",
      "Metadatele imaginii nu au putut fi înregistrate.",
    );
  }

  return NextResponse.json(
    {
      data: {
        altText: upload.metadata.altText,
        caption: upload.metadata.caption,
        decorative: upload.metadata.decorative,
        height: originalVariant.height,
        id: parsedRegistration.data.mediaId,
        title: upload.metadata.title,
        variants: variantRecords.map((variant) => ({
          height: variant.height,
          key: variant.key,
          url: buildAdminCmsMediaUrl(
            parsedRegistration.data.mediaId,
            variant.key,
          ),
          width: variant.width,
        })),
        width: originalVariant.width,
      },
      ok: true,
    },
    {
      headers: noStoreHeaders(),
      status: 201,
    },
  );
}
