import { NextResponse } from "next/server";

import { authorizeAdminCapability } from "@/lib/admin/auth";
import { createServerSupabaseClient } from "@/lib/auth/supabase";
import { getCmsMediaVariant } from "@/lib/media/cms-media-record";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
    variant: string;
  }>;
};

function privateHeaders(etag?: string) {
  return {
    "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
    ...(etag ? { ETag: etag } : {}),
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  };
}

export async function GET(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminCapability("content.preview");

  if (!authorization.ok) {
    const status =
      authorization.code === "unauthenticated"
        ? 401
        : authorization.code === "configuration" ||
            authorization.code === "unavailable"
          ? 503
          : 403;
    return NextResponse.json(
      {
        code: authorization.code,
        message: "Accesul la imaginea de previzualizare este refuzat.",
        ok: false,
      },
      { headers: privateHeaders(), status },
    );
  }

  const { id: rawId, variant: rawVariant } = await context.params;
  const mediaId = Number(rawId);

  if (!Number.isSafeInteger(mediaId) || mediaId <= 0) {
    return new NextResponse(null, { headers: privateHeaders(), status: 404 });
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return new NextResponse(null, { headers: privateHeaders(), status: 503 });
  }

  const { data: media, error } = await supabase
    .from("media_assets")
    .select("id, metadata, status, storage_bucket")
    .eq("id", mediaId)
    .eq("storage_bucket", "cms-media")
    .neq("status", "archived")
    .maybeSingle();
  const variant = getCmsMediaVariant(media?.metadata, rawVariant);

  if (error || !media || !variant) {
    return new NextResponse(null, { headers: privateHeaders(), status: 404 });
  }

  const etag = `"${variant.checksumSha256}"`;

  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      headers: privateHeaders(etag),
      status: 304,
    });
  }

  const { data: object, error: downloadError } = await supabase.storage
    .from(media.storage_bucket)
    .download(variant.path);

  if (downloadError || !object) {
    return new NextResponse(null, { headers: privateHeaders(), status: 404 });
  }

  return new NextResponse(await object.arrayBuffer(), {
    headers: {
      ...privateHeaders(etag),
      "Content-Length": String(variant.byteSize),
      "Content-Type": "image/webp",
    },
    status: 200,
  });
}
