import { NextResponse } from "next/server";

import { sanitizeInternalPath } from "@/lib/auth/access-control";
import { getSupabaseAuthConfig } from "@/lib/auth/env";
import { createServerSupabaseClient } from "@/lib/auth/supabase";

function redirectWithStatus(request: Request, path: string, key: "error" | "status", value: string) {
  const target = new URL(sanitizeInternalPath(path), request.url);
  target.searchParams.set(key, value);

  return NextResponse.redirect(target);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = sanitizeInternalPath(requestUrl.searchParams.get("next"));
  const config = getSupabaseAuthConfig();

  if (!config.isConfigured) {
    return redirectWithStatus(request, "/cont?mode=conectare", "error", "auth-not-configured");
  }

  if (!code) {
    return redirectWithStatus(request, "/cont?mode=conectare", "error", "callback-invalid");
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return redirectWithStatus(request, "/cont?mode=conectare", "error", "auth-not-configured");
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectWithStatus(request, "/cont?mode=conectare", "error", "callback-invalid");
  }

  const status = nextPath.includes("mode=parola-noua") ? "recovery-ready" : "email-confirmed";

  return redirectWithStatus(request, nextPath, "status", status);
}
