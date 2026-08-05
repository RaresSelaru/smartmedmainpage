import { NextResponse } from "next/server";

import { getSupabaseAuthConfig } from "@/lib/auth/env";
import { getCurrentSmartMedSessionSummaryResult } from "@/lib/auth/session";

export async function GET() {
  const config = getSupabaseAuthConfig();

  if (!config.isConfigured) {
    return NextResponse.json(
      {
        isConfigured: false,
        session: null,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  }

  const result = await getCurrentSmartMedSessionSummaryResult();

  if (result.status === "unavailable") {
    return NextResponse.json(
      {
        isConfigured: true,
        retryable: true,
        session: null,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "Retry-After": "1",
        },
        status: 503,
      },
    );
  }

  return NextResponse.json(
    {
      isConfigured: true,
      session: result.session,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
