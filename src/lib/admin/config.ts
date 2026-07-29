export type AdminMfaPolicyReason =
  | "invalid-requirement"
  | "missing-requirement"
  | "unsafe-runtime"
  | "unsafe-supabase-origin";

export type AdminMfaPolicy = {
  isValid: boolean;
  localBypass: boolean;
  reason: AdminMfaPolicyReason | null;
  required: boolean;
};

export type AdminMfaEnvironment = {
  CMS_REQUIRE_ADMIN_MFA?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NODE_ENV?: string;
};

const allowedLocalSupabaseOrigins = new Set([
  "http://127.0.0.1:54321",
  "http://localhost:54321",
]);

function invalidPolicy(reason: AdminMfaPolicyReason): AdminMfaPolicy {
  return {
    isValid: false,
    localBypass: false,
    reason,
    required: true,
  };
}

function parseExactSupabaseOrigin(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);

    if (
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

export function resolveAdminMfaPolicy(
  environment: AdminMfaEnvironment,
): AdminMfaPolicy {
  const requirement = environment.CMS_REQUIRE_ADMIN_MFA?.trim();

  if (!requirement) {
    return invalidPolicy("missing-requirement");
  }

  if (requirement === "true") {
    return {
      isValid: true,
      localBypass: false,
      reason: null,
      required: true,
    };
  }

  if (requirement !== "false") {
    return invalidPolicy("invalid-requirement");
  }

  if (
    environment.NODE_ENV !== "development" &&
    environment.NODE_ENV !== "test"
  ) {
    return invalidPolicy("unsafe-runtime");
  }

  const supabaseOrigin = parseExactSupabaseOrigin(
    environment.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  );

  if (!supabaseOrigin || !allowedLocalSupabaseOrigins.has(supabaseOrigin)) {
    return invalidPolicy("unsafe-supabase-origin");
  }

  return {
    isValid: true,
    localBypass: true,
    reason: null,
    required: false,
  };
}

export function getAdminMfaPolicy() {
  return resolveAdminMfaPolicy({
    CMS_REQUIRE_ADMIN_MFA: process.env.CMS_REQUIRE_ADMIN_MFA,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  });
}
