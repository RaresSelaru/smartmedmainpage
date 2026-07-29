import { sanitizeInternalPath } from "../auth/access-control.ts";

const internalUrlBase = "https://smartmed.internal";
const defaultAdminPath = "/admin";
const adminMfaPath = "/admin/mfa";

function getPathname(path: string) {
  try {
    return new URL(path, internalUrlBase).pathname;
  } catch {
    return "";
  }
}

export function isAdminPath(path: string) {
  const pathname = getPathname(path);

  return pathname === defaultAdminPath || pathname.startsWith(`${defaultAdminPath}/`);
}

export function sanitizeAdminNextPath(
  value: unknown,
  fallback = defaultAdminPath,
) {
  const safeFallback = isAdminPath(fallback)
    ? sanitizeInternalPath(fallback, defaultAdminPath)
    : defaultAdminPath;
  const sanitized = sanitizeInternalPath(value, safeFallback);

  return isAdminPath(sanitized) ? sanitized : safeFallback;
}

export function buildAdminMfaPath(nextPath: unknown) {
  const sanitized = sanitizeAdminNextPath(nextPath);
  const safeNextPath =
    getPathname(sanitized) === adminMfaPath ? defaultAdminPath : sanitized;
  const params = new URLSearchParams({
    next: safeNextPath,
  });

  return `${adminMfaPath}?${params.toString()}`;
}
