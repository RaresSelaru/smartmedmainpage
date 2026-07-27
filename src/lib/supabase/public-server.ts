import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { SmartMedDatabase } from "@/lib/auth/database.types";

type PublicServerSupabase = {
  client: SupabaseClient<SmartMedDatabase>;
  projectUrl: string;
};

let publicServerSupabase: PublicServerSupabase | null | undefined;

function readPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    "";

  if (!url || !publishableKey) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      return null;
    }

    return {
      publishableKey,
      projectUrl: parsedUrl.toString().replace(/\/$/, ""),
    };
  } catch {
    return null;
  }
}

export function getPublicServerSupabaseClient(): PublicServerSupabase | null {
  if (publicServerSupabase !== undefined) {
    return publicServerSupabase;
  }

  const config = readPublicSupabaseConfig();

  if (!config) {
    publicServerSupabase = null;
    return publicServerSupabase;
  }

  publicServerSupabase = {
    client: createClient<SmartMedDatabase>(config.projectUrl, config.publishableKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    }),
    projectUrl: config.projectUrl,
  };

  return publicServerSupabase;
}
