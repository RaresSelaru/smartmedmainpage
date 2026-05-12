export type SmartMedRole = "guest" | "user" | "premium" | "admin";

export type SmartMedSession = {
  userId: string;
  email: string;
  role: SmartMedRole;
};

/**
 * TODO: Install and wire Supabase here when auth is ready.
 *
 * Keep the client lazy, not initialized at module scope, so `next build`
 * stays safe when env vars are missing in preview or CI.
 *
 * Future env vars:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - SUPABASE_SERVICE_ROLE_KEY for server-only admin operations
 */
export function getSupabaseBrowserClient() {
  throw new Error(
    "Supabase is not configured yet. Install @supabase/supabase-js and replace this placeholder.",
  );
}

/**
 * TODO: Replace with real session lookup once Supabase Auth is added.
 * Planned usage: route protection, premium gates, dashboard personalization.
 */
export async function getCurrentSmartMedSession(): Promise<SmartMedSession | null> {
  return null;
}

export function canAccessPremiumContent(role: SmartMedRole) {
  return role === "premium" || role === "admin";
}
