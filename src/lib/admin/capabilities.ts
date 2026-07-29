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
] as const;

export type AdminCapability = (typeof adminCapabilities)[number];

const adminCapabilitySet = new Set<string>(adminCapabilities);
const noCapabilities = Object.freeze([]) as readonly AdminCapability[];

export function isAdminCapability(value: unknown): value is AdminCapability {
  return typeof value === "string" && adminCapabilitySet.has(value);
}

export function resolveAdminCapabilities(role: unknown): readonly AdminCapability[] {
  return role === "admin" ? adminCapabilities : noCapabilities;
}

export function hasAdminCapability(role: unknown, capability: unknown): boolean {
  return (
    isAdminCapability(capability) &&
    resolveAdminCapabilities(role).includes(capability)
  );
}
