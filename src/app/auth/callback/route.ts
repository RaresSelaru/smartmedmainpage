import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { sanitizeInternalPath } from "@/lib/auth/access-control";
import { getSupabaseAuthConfig } from "@/lib/auth/env";
import { createServerSupabaseClient } from "@/lib/auth/supabase";
import { consumePendingCenterEnrollmentLink } from "@/lib/center-enrollments/account-link";

function redirectWithStatus(
  request: Request,
  path: string,
  key: "error" | "status",
  value: string,
  responseHeaders?: Headers,
) {
  const target = new URL(sanitizeInternalPath(path), request.url);
  target.searchParams.set(key, value);
  const response = NextResponse.redirect(target);

  responseHeaders?.forEach((headerValue, headerName) => {
    response.headers.set(headerName, headerValue);
  });
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");

  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const callbackError = requestUrl.searchParams.get("error");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpType = requestUrl.searchParams.get("type");
  const nextPath = sanitizeInternalPath(requestUrl.searchParams.get("next"));
  const config = getSupabaseAuthConfig();

  if (!config.isConfigured) {
    return redirectWithStatus(request, "/cont?mode=conectare", "error", "auth-not-configured");
  }

  if (callbackError) {
    return redirectWithStatus(
      request,
      "/cont?mode=conectare",
      "error",
      callbackError === "access_denied" ? "oauth-cancelled" : "oauth-failed",
    );
  }

  const supportedOtpTypes = new Set<EmailOtpType>([
    "email",
    "email_change",
    "invite",
    "magiclink",
    "recovery",
    "signup",
  ]);
  const hasTokenHashFlow =
    Boolean(tokenHash) && Boolean(otpType) && supportedOtpTypes.has(otpType as EmailOtpType);

  if (!code && !hasTokenHashFlow) {
    return redirectWithStatus(request, "/cont?mode=conectare", "error", "callback-invalid");
  }

  const responseHeaders = new Headers();
  const supabase = await createServerSupabaseClient({
    onResponseHeaders(headersToSet) {
      Object.entries(headersToSet).forEach(([headerName, headerValue]) => {
        responseHeaders.set(headerName, headerValue);
      });
    },
    requireCookieWrites: true,
  });

  if (!supabase) {
    return redirectWithStatus(request, "/cont?mode=conectare", "error", "auth-not-configured");
  }

  const authResult = hasTokenHashFlow
    ? await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        type: otpType as EmailOtpType,
      })
    : await supabase.auth.exchangeCodeForSession(code!);

  if (authResult.error) {
    return redirectWithStatus(
      request,
      "/cont?mode=conectare",
      "error",
      "callback-invalid",
      responseHeaders,
    );
  }

  const isRecoveryFlow =
    (hasTokenHashFlow && otpType === "recovery") ||
    (!hasTokenHashFlow && nextPath.includes("mode=parola-noua"));
  const destination = isRecoveryFlow ? "/cont?mode=parola-noua" : nextPath;
  const enrollmentLink = await consumePendingCenterEnrollmentLink(supabase);
  const provider = authResult.data.user?.app_metadata?.provider;
  const isSocialProvider = provider === "google" || provider === "facebook";
  const status = isRecoveryFlow
    ? "recovery-ready"
    : enrollmentLink.linked
      ? "enrollment-linked"
    : isSocialProvider
      ? "social-connected"
      : "email-confirmed";

  return redirectWithStatus(request, destination, "status", status, responseHeaders);
}
