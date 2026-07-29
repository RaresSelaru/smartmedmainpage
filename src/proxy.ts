import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { buildRestrictedAccessPath, getAccessRuleForPath } from "@/lib/auth/access-control";
import type { SmartMedDatabase } from "@/lib/auth/database.types";
import { getSupabaseAuthConfig } from "@/lib/auth/env";

const authResponseHeaderNames = ["cache-control", "expires", "pragma"] as const;

function isAdminRequestPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function applyAdminResponseHeaders(response: NextResponse, pathname: string) {
  if (!isAdminRequestPath(pathname)) {
    return response;
  }

  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive, nosnippet",
  );

  return response;
}

function createAuthRedirect(target: URL, authResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(target);

  authResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  authResponseHeaderNames.forEach((name) => {
    const value = authResponse.headers.get(name);

    if (value) {
      redirectResponse.headers.set(name, value);
    }
  });
  redirectResponse.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  redirectResponse.headers.set("Expires", "0");
  redirectResponse.headers.set("Pragma", "no-cache");

  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });
  const config = getSupabaseAuthConfig();

  if (!config.isConfigured) {
    return applyAdminResponseHeaders(response, request.nextUrl.pathname);
  }

  const supabase = createServerClient<SmartMedDatabase>(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headersToSet).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  // Calling getClaims on every matched request is what lets @supabase/ssr
  // refresh expired tokens and propagate the new cookies through setAll.
  const { data: claimsData } = await supabase.auth.getClaims();
  const rule = getAccessRuleForPath(request.nextUrl.pathname);

  if (!rule) {
    return applyAdminResponseHeaders(response, request.nextUrl.pathname);
  }

  if (!claimsData?.claims.sub) {
    return applyAdminResponseHeaders(
      createAuthRedirect(
        new URL(
          buildRestrictedAccessPath(
            `${request.nextUrl.pathname}${request.nextUrl.search}`,
          ),
          request.url,
        ),
        response,
      ),
      request.nextUrl.pathname,
    );
  }

  if (rule.requireEmailConfirmed) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email_confirmed_at) {
      const target = new URL("/cont", request.url);
      target.searchParams.set("error", "email-not-confirmed");
      target.searchParams.set("next", request.nextUrl.pathname);

      return applyAdminResponseHeaders(
        createAuthRedirect(target, response),
        request.nextUrl.pathname,
      );
    }
  }

  // Role/capability authorization remains in the request-time data access
  // layer. Proxy is only an optimistic authenticated-session check.
  return applyAdminResponseHeaders(response, request.nextUrl.pathname);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
