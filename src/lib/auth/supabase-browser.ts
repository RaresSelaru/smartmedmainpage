"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { SmartMedDatabase } from "@/lib/auth/database.types";
import { getSupabaseAuthConfig } from "@/lib/auth/env";

type SmartMedSupabaseClient = SupabaseClient<SmartMedDatabase>;

let browserClient: SmartMedSupabaseClient | null = null;

export function createBrowserSupabaseClient() {
  const config = getSupabaseAuthConfig();

  if (!config.isConfigured) {
    return null;
  }

  browserClient ??= createBrowserClient<SmartMedDatabase>(
    config.url,
    config.publishableKey,
  );

  return browserClient;
}
