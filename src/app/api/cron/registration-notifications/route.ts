import { isAuthorizedCronRequest } from "@/lib/registrations/outbox-worker-core";
import { processRegistrationNotificationOutbox } from "@/lib/registrations/outbox-worker";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

const responseHeaders = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
};

export async function GET(request: Request) {
  if (
    !isAuthorizedCronRequest(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    return Response.json(
      { ok: false },
      { headers: responseHeaders, status: 401 },
    );
  }

  try {
    const result = await processRegistrationNotificationOutbox();
    return Response.json(
      { ok: true, result },
      { headers: responseHeaders, status: 200 },
    );
  } catch (error) {
    console.error("SmartMed registration notification worker failed", {
      code: error instanceof Error ? error.message : "unknown",
    });
    return Response.json(
      { ok: false },
      { headers: responseHeaders, status: 500 },
    );
  }
}
