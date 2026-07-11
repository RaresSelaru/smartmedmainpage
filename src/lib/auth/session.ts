import { redirect } from "next/navigation";

import { buildRestrictedAccessPath, canAccessPremiumContent, type SmartMedRole } from "@/lib/auth/access-control";
import { createServerSupabaseClient } from "@/lib/auth/supabase";

export type SmartMedProfile = {
  city: string | null;
  examYear: string | null;
  fullName: string;
  phone: string | null;
  school: string | null;
};

export type SmartMedSession = {
  email: string;
  emailConfirmed: boolean;
  fullName: string;
  id: string;
  profile: SmartMedProfile;
  role: SmartMedRole;
};

function normalizeRole(value: unknown): SmartMedRole {
  return value === "premium" || value === "admin" || value === "user" ? value : "user";
}

function fallbackName(email: string) {
  const [prefix] = email.split("@");

  return prefix ? prefix.replace(/[._-]+/g, " ") : "Student SmartMed";
}

export async function getCurrentSmartMedSession(): Promise<SmartMedSession | null> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return null;
  }

  const [{ data: profile }, { data: roleRow }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone, city, exam_year, school")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("account_roles").select("role").eq("user_id", user.id).maybeSingle(),
  ]);

  const metadataName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const fullName = profile?.full_name?.trim() || metadataName.trim() || fallbackName(user.email);

  return {
    email: user.email,
    emailConfirmed: Boolean(user.email_confirmed_at || user.confirmed_at),
    fullName,
    id: user.id,
    profile: {
      city: profile?.city ?? null,
      examYear: profile?.exam_year ?? null,
      fullName,
      phone: profile?.phone ?? null,
      school: profile?.school ?? null,
    },
    role: normalizeRole(roleRow?.role),
  };
}

export async function requireSmartMedSession(nextPath = "/cont") {
  const session = await getCurrentSmartMedSession();

  if (!session) {
    redirect(buildRestrictedAccessPath(nextPath));
  }

  return session;
}

export { canAccessPremiumContent };
