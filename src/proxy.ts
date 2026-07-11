import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { buildRestrictedAccessPath, getAccessRuleForPath } from "@/lib/auth/access-control";
import type { SmartMedDatabase } from "@/lib/auth/database.types";
import { getSupabaseAuthConfig } from "@/lib/auth/env";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });
  const config = getSupabaseAuthConfig();

  if (!config.isConfigured) {
    return response;
  }

  const supabase = createServerClient<SmartMedDatabase>(config.url, config.anonKey, {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const rule = getAccessRuleForPath(request.nextUrl.pathname);

  if (rule && !user) {
    return NextResponse.redirect(new URL(buildRestrictedAccessPath(request.nextUrl.pathname), request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
