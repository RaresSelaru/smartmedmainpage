import { createBrowserClient, createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { SmartMedDatabase } from "@/lib/auth/database.types";
import { getSupabaseAuthConfig } from "@/lib/auth/env";

type SmartMedSupabaseClient = SupabaseClient<SmartMedDatabase>;

let browserClient: SmartMedSupabaseClient | null = null;

export function createBrowserSupabaseClient() {
  const config = getSupabaseAuthConfig();

  if (!config.isConfigured) {
    return null;
  }

  browserClient ??= createBrowserClient<SmartMedDatabase>(config.url, config.anonKey);

  return browserClient;
}

export async function createServerSupabaseClient() {
  const config = getSupabaseAuthConfig();

  if (!config.isConfigured) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<SmartMedDatabase>(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. Proxy/Actions handle refresh writes.
        }
      },
    },
  });
}
