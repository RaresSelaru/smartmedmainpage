import { NextResponse } from "next/server";

import { getCmsMediaVariant } from "@/lib/media/cms-media-record";
import { getPublicServerSupabaseClient } from "@/lib/supabase/public-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
    variant: string;
  }>;
};

function publicHeaders(etag?: string) {
  return {
    "Cache-Control": "public, max-age=0, must-revalidate",
    ...(etag ? { ETag: etag } : {}),
    "X-Content-Type-Options": "nosniff",
  };
}

export async function GET(request: Request, context: RouteContext) {
  const { id: rawId, variant: rawVariant } = await context.params;
  const mediaId = Number(rawId);

  if (!Number.isSafeInteger(mediaId) || mediaId <= 0) {
    return new NextResponse(null, { headers: publicHeaders(), status: 404 });
  }

  const publicSupabase = getPublicServerSupabaseClient();

  if (!publicSupabase) {
    return new NextResponse(null, { headers: publicHeaders(), status: 503 });
  }

  const { data: media, error } = await publicSupabase.client
    .from("media_assets")
    .select("access_level, metadata, status, storage_bucket")
    .eq("id", mediaId)
    .eq("storage_bucket", "cms-media")
    .eq("status", "active")
    .eq("access_level", "public")
    .maybeSingle();
  const variant = getCmsMediaVariant(media?.metadata, rawVariant);

  if (error || !media || !variant) {
    return new NextResponse(null, { headers: publicHeaders(), status: 404 });
  }

  const etag = `"${variant.checksumSha256}"`;

  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      headers: publicHeaders(etag),
      status: 304,
    });
  }

  const { data: object, error: downloadError } =
    await publicSupabase.client.storage
      .from(media.storage_bucket)
      .download(variant.path);

  if (downloadError || !object) {
    return new NextResponse(null, { headers: publicHeaders(), status: 404 });
  }

  return new NextResponse(await object.arrayBuffer(), {
    headers: {
      ...publicHeaders(etag),
      "Content-Length": String(variant.byteSize),
      "Content-Type": "image/webp",
    },
    status: 200,
  });
}
