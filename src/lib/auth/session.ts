import "server-only";

import { redirect } from "next/navigation";

import {
  buildRestrictedAccessPath,
  canAccessPremiumContent,
  canRoleAccess,
  type ProtectedRouteRule,
  type SmartMedRole,
} from "@/lib/auth/access-control";
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
  hasPremiumAccess: boolean;
  id: string;
  profile: SmartMedProfile;
  role: SmartMedRole;
};

export type SmartMedSessionSummary = Pick<SmartMedSession, "fullName" | "id">;

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

  const entitlementCheckTime = new Date().toISOString();
  const [profileResult, roleResult, entitlementResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone, city, exam_year, school")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("account_roles").select("role").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("entitlements")
      .select("id")
      .eq("resource_type", "platform")
      .is("resource_id", null)
      .is("revoked_at", null)
      .lte("valid_from", entitlementCheckTime)
      .or(`valid_until.is.null,valid_until.gt.${entitlementCheckTime}`)
      .limit(1)
      .maybeSingle(),
  ]);
  const profile = profileResult.data;
  const roleRow = roleResult.data;
  const role = normalizeRole(roleRow?.role);

  if (profileResult.error) {
    console.error("SmartMed profile query failed", {
      code: profileResult.error.code,
      userId: user.id,
    });
  }

  if (roleResult.error) {
    console.error("SmartMed role query failed", {
      code: roleResult.error.code,
      userId: user.id,
    });
  }

  if (entitlementResult.error) {
    console.error("SmartMed entitlement query failed", {
      code: entitlementResult.error.code,
      userId: user.id,
    });
  }

  const metadataName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const fullName = profile?.full_name?.trim() || metadataName.trim() || fallbackName(user.email);

  return {
    email: user.email,
    emailConfirmed: Boolean(user.email_confirmed_at),
    fullName,
    hasPremiumAccess:
      role === "admin" || role === "premium" || Boolean(entitlementResult.data),
    id: user.id,
    profile: {
      city: profile?.city ?? null,
      examYear: profile?.exam_year ?? null,
      fullName,
      phone: profile?.phone ?? null,
      school: profile?.school ?? null,
    },
    role,
  };
}

export async function getCurrentSmartMedSessionSummary(): Promise<SmartMedSessionSummary | null> {
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

  const profileResult = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileResult.error) {
    console.error("SmartMed navigation profile query failed", {
      code: profileResult.error.code,
      userId: user.id,
    });
  }

  const metadataName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";

  return {
    fullName:
      profileResult.data?.full_name?.trim() || metadataName.trim() || fallbackName(user.email),
    id: user.id,
  };
}

export async function requireSmartMedSession(nextPath = "/cont") {
  const session = await getCurrentSmartMedSession();

  if (!session) {
    redirect(buildRestrictedAccessPath(nextPath));
  }

  return session;
}

export async function requireSmartMedAccess(
  rule: ProtectedRouteRule,
  nextPath = rule.path,
) {
  const session = await requireSmartMedSession(nextPath);

  if (rule.requireEmailConfirmed && !session.emailConfirmed) {
    redirect(`/cont?error=email-not-confirmed&next=${encodeURIComponent(nextPath)}`);
  }

  if (
    !canRoleAccess(session.role, rule) ||
    (rule.requirePremiumAccess && !canAccessPremiumContent(session))
  ) {
    redirect(`/cont?error=access-forbidden&next=${encodeURIComponent(nextPath)}`);
  }

  return session;
}

export { canAccessPremiumContent };
