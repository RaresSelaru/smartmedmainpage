import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import {
  hasAdminCapability,
  resolveAdminCapabilities,
  type AdminCapability,
} from "@/lib/admin/capabilities";
import { getAdminMfaPolicy } from "@/lib/admin/config";
import {
  buildAdminMfaPath,
  sanitizeAdminNextPath,
} from "@/lib/admin/redirects";
import {
  buildRestrictedAccessPath,
} from "@/lib/auth/access-control";
import { createServerSupabaseClient } from "@/lib/auth/supabase";

export type AdminAssuranceLevel = "aal1" | "aal2";

export type AdminIdentity = {
  currentAal: AdminAssuranceLevel;
  email: string;
  fullName: string;
  id: string;
  mfaRequired: boolean;
  nextAal: AdminAssuranceLevel;
  role: "admin";
};

export type AdminContext = AdminIdentity & {
  capabilities: readonly AdminCapability[];
};

type AdminIdentityFailure =
  | "configuration"
  | "email-unconfirmed"
  | "forbidden"
  | "unauthenticated"
  | "unavailable";

type AdminIdentityResult =
  | {
      identity: AdminIdentity;
      ok: true;
    }
  | {
      failure: AdminIdentityFailure;
      ok: false;
    };

type RequireAdminIdentityOptions = {
  allowAal1?: boolean;
  nextPath?: unknown;
};

export type AdminAuthorizationFailureCode =
  | AdminIdentityFailure
  | "mfa-required";

export type AdminAuthorizationResult =
  | {
      context: AdminContext;
      ok: true;
    }
  | {
      code: AdminAuthorizationFailureCode;
      ok: false;
    };

function normalizeAssuranceLevel(value: unknown): AdminAssuranceLevel | null {
  return value === "aal1" || value === "aal2" ? value : null;
}

function buildAccessDeniedPath(nextPath: string) {
  const params = new URLSearchParams({
    error: "access-forbidden",
    next: nextPath,
  });

  return `/cont?${params.toString()}`;
}

const loadAdminIdentity = cache(async (): Promise<AdminIdentityResult> => {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      failure: "unauthenticated",
      ok: false,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return {
      failure: "unauthenticated",
      ok: false,
    };
  }

  if (user.is_anonymous === true) {
    return {
      failure: "forbidden",
      ok: false,
    };
  }

  if (!user.email_confirmed_at) {
    return {
      failure: "email-unconfirmed",
      ok: false,
    };
  }

  const [profileResult, roleResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("account_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (profileResult.error || roleResult.error) {
    console.error("SmartMed admin identity lookup failed", {
      profileCode: profileResult.error?.code ?? null,
      roleCode: roleResult.error?.code ?? null,
      userId: user.id,
    });

    return {
      failure: "unavailable",
      ok: false,
    };
  }

  if (
    !profileResult.data ||
    profileResult.data.id !== user.id ||
    !roleResult.data ||
    roleResult.data.role !== "admin"
  ) {
    return {
      failure: "forbidden",
      ok: false,
    };
  }

  const mfaPolicy = getAdminMfaPolicy();

  if (!mfaPolicy.isValid) {
    console.error("SmartMed admin MFA configuration rejected", {
      reason: mfaPolicy.reason,
    });

    return {
      failure: "configuration",
      ok: false,
    };
  }

  const { data: assuranceData, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const currentAal = normalizeAssuranceLevel(assuranceData?.currentLevel);
  const nextAal =
    normalizeAssuranceLevel(assuranceData?.nextLevel) ?? currentAal;

  if (assuranceError || !currentAal || !nextAal) {
    console.error("SmartMed admin assurance lookup failed", {
      code: assuranceError?.code ?? null,
      userId: user.id,
    });

    return {
      failure: "unavailable",
      ok: false,
    };
  }

  const profileName = profileResult.data.full_name?.trim() ?? "";

  return {
    identity: {
      currentAal,
      email: user.email,
      fullName: profileName || user.email,
      id: user.id,
      mfaRequired: mfaPolicy.required,
      nextAal,
      role: "admin",
    },
    ok: true,
  };
});

export function isAdminMfaSatisfied(identity: AdminIdentity) {
  return !identity.mfaRequired || identity.currentAal === "aal2";
}

export function getGrantedAdminCapabilities(
  identity: AdminIdentity,
): readonly AdminCapability[] {
  return isAdminMfaSatisfied(identity)
    ? resolveAdminCapabilities(identity.role)
    : [];
}

export async function authorizeAdminCapability(
  capability: AdminCapability,
): Promise<AdminAuthorizationResult> {
  const result = await loadAdminIdentity();

  if (!result.ok) {
    return {
      code: result.failure,
      ok: false,
    };
  }

  if (!isAdminMfaSatisfied(result.identity)) {
    return {
      code: "mfa-required",
      ok: false,
    };
  }

  if (!hasAdminCapability(result.identity.role, capability)) {
    return {
      code: "forbidden",
      ok: false,
    };
  }

  return {
    context: {
      ...result.identity,
      capabilities: resolveAdminCapabilities(result.identity.role),
    },
    ok: true,
  };
}

export async function requireAdminIdentity(
  options: RequireAdminIdentityOptions = {},
): Promise<AdminIdentity> {
  const nextPath = sanitizeAdminNextPath(options.nextPath);
  const result = await loadAdminIdentity();

  if (!result.ok) {
    if (result.failure === "unauthenticated") {
      redirect(buildRestrictedAccessPath(nextPath));
    }

    if (result.failure === "email-unconfirmed") {
      const params = new URLSearchParams({
        error: "email-not-confirmed",
        next: nextPath,
      });

      redirect(`/cont?${params.toString()}`);
    }

    redirect(buildAccessDeniedPath(nextPath));
  }

  if (
    result.identity.mfaRequired &&
    result.identity.currentAal !== "aal2" &&
    !options.allowAal1
  ) {
    redirect(buildAdminMfaPath(nextPath));
  }

  return result.identity;
}

export async function requireAdminCapability(
  capability: AdminCapability,
  options: Omit<RequireAdminIdentityOptions, "allowAal1"> = {},
): Promise<AdminContext> {
  const identity = await requireAdminIdentity(options);

  if (!hasAdminCapability(identity.role, capability)) {
    redirect(
      buildAccessDeniedPath(sanitizeAdminNextPath(options.nextPath)),
    );
  }

  return {
    ...identity,
    capabilities: resolveAdminCapabilities(identity.role),
  };
}
