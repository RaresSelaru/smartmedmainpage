export type SupabaseAuthConfig = {
  anonKey: string;
  isConfigured: boolean;
  missing: string[];
  url: string;
};

const publicEnvKeys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

function readEnvValue(key: (typeof publicEnvKeys)[number]) {
  return process.env[key]?.trim() ?? "";
}

export function getSupabaseAuthConfig(): SupabaseAuthConfig {
  const url = readEnvValue("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const missing = publicEnvKeys.filter((key) => !readEnvValue(key));

  return {
    anonKey,
    isConfigured: missing.length === 0,
    missing,
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
