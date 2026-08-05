export const adminCapabilities = [
  "admin.access",
  "content.read",
  "content.create",
  "content.update",
  "content.preview",
  "content.publish",
  "content.unpublish",
  "content.archive",
  "content.media.manage",
  "events.read",
  "events.create",
  "events.update",
  "events.publish",
  "events.cancel",
  "events.registrations.read",
  "events.registrations.update",
  "enrollments.read",
  "enrollments.update",
  "enrollments.notifications.retry",
  "evaluations.read",
  "evaluations.update",
  "evaluations.notifications.retry",
  "evaluations.slots.manage",
] as const;

export const superAdminCapabilities = [
  "administrators.read",
  "administrators.manage",
] as const;

export const allAdminCapabilities = [
  ...adminCapabilities,
  ...superAdminCapabilities,
] as const;

export type AdminCapability = (typeof allAdminCapabilities)[number];

const adminCapabilitySet = new Set<string>(allAdminCapabilities);
const noCapabilities = Object.freeze([]) as readonly AdminCapability[];

export function isAdminCapability(value: unknown): value is AdminCapability {
  return typeof value === "string" && adminCapabilitySet.has(value);
}

export function resolveAdminCapabilities(
  role: unknown,
  isSuperAdmin = false,
): readonly AdminCapability[] {
  if (role !== "admin") return noCapabilities;

  return isSuperAdmin ? allAdminCapabilities : adminCapabilities;
}

export function hasAdminCapability(
  role: unknown,
  capability: unknown,
  isSuperAdmin = false,
): boolean {
  return (
    isAdminCapability(capability) &&
    resolveAdminCapabilities(role, isSuperAdmin).includes(capability)
  );
}
