import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { SmartMedDatabase } from "@/lib/auth/database.types";
import { getSupabaseAuthConfig } from "@/lib/auth/env";

type ServerSupabaseClientOptions = {
  onResponseHeaders?: (headers: Record<string, string>) => void;
  requireCookieWrites?: boolean;
};

export async function createServerSupabaseClient(options?: ServerSupabaseClientOptions) {
  const config = getSupabaseAuthConfig();

  if (!config.isConfigured) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<SmartMedDatabase>(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        options?.onResponseHeaders?.(headersToSet);

        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          if (options?.requireCookieWrites) {
            throw error;
          }

          // Server Components cannot write cookies. Proxy/Actions handle refresh writes.
        }
      },
    },
  });
}
