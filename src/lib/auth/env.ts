export type SupabaseAuthConfig = {
  isConfigured: boolean;
  missing: string[];
  publishableKey: string;
  url: string;
};

export function getSupabaseAuthConfig(): SupabaseAuthConfig {
  // These references must remain static. Next.js only inlines NEXT_PUBLIC_ values
  // in browser bundles when process.env.<NAME> is accessed directly.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    "";
  const missing = [
    ...(!url ? ["NEXT_PUBLIC_SUPABASE_URL"] : []),
    ...(!publishableKey ? ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] : []),
  ];

  return {
    isConfigured: missing.length === 0,
    missing,
    publishableKey,
    url,
  };
}

export function getAuthConfigurationMessage() {
  const config = getSupabaseAuthConfig();

  if (config.isConfigured) {
    return null;
  }

  return `Autentificarea SmartMed nu este configurată încă. Lipsesc: ${config.missing.join(", ")}.`;
}
