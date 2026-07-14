export type SmartMedRole = "guest" | "user" | "premium" | "admin";

export const authenticatedRoles = ["user", "premium", "admin"] as const satisfies SmartMedRole[];

export type ProtectedRouteRule = {
  mode?: "exact" | "prefix";
  path: string;
  requireEmailConfirmed?: boolean;
  roles?: SmartMedRole[];
};

export const protectedRouteRules: readonly ProtectedRouteRule[] = [];

export const authModes = [
  "conectare",
  "creare-cont",
  "recuperare-parola",
  "parola-noua",
] as const;

export type AuthMode = (typeof authModes)[number];

const defaultAccountPath = "/cont";
const unsafePathPattern = /[\u0000-\u001f\u007f]/;

export function isAuthMode(value: unknown): value is AuthMode {
  return typeof value === "string" && authModes.includes(value as AuthMode);
}

export function sanitizeInternalPath(value: unknown, fallback = defaultAccountPath) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//") || unsafePathPattern.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}

export function buildRestrictedAccessPath(nextPath: string) {
  const params = new URLSearchParams({
    access: "required",
    next: sanitizeInternalPath(nextPath),
  });

  return `${defaultAccountPath}?${params.toString()}`;
}

export function getAccessRuleForPath(pathname: string): ProtectedRouteRule | null {
  return (
    protectedRouteRules.find((rule) => {
      if (rule.mode === "prefix") {
        return pathname === rule.path || pathname.startsWith(`${rule.path}/`);
      }

      return pathname === rule.path;
    }) ?? null
  );
}

export function canRoleAccess(role: SmartMedRole, rule: ProtectedRouteRule) {
  if (!rule.roles?.length) {
    return role !== "guest";
  }

  return rule.roles.includes(role);
}

export function canAccessPremiumContent(role: SmartMedRole) {
  return role === "premium" || role === "admin";
}
