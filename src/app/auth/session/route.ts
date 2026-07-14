import { NextResponse } from "next/server";

import { getSupabaseAuthConfig } from "@/lib/auth/env";
import { getCurrentSmartMedSession } from "@/lib/auth/session";

export async function GET() {
  const config = getSupabaseAuthConfig();
  const session = config.isConfigured ? await getCurrentSmartMedSession() : null;

  return NextResponse.json(
    {
      isConfigured: config.isConfigured,
      session,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
