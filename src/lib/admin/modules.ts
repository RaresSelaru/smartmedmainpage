import "server-only";

import type { AdminCapability } from "@/lib/admin/capabilities";
import type { AdminModuleSummary } from "@/lib/admin/module-types";

export type AdminModuleDefinition = AdminModuleSummary & {
  requiredCapability: AdminCapability;
};

const moduleDefinitions = [
  {
    description:
      "Centralizează înscrierile la centru, urmărește parcursul fiecărui candidat și gestionează răspunsurile echipei.",
    href: "/admin/inscrieri",
    icon: "enrollments",
    id: "enrollments",
    label: "Înscrieri centru",
    order: 20,
    requiredCapability: "enrollments.read",
  },
  {
    description:
      "Creează, verifică și publică articolele Blog. Știrile rămân în circuit editorial intern.",
    href: "/admin/content",
    icon: "files",
    id: "content",
    label: "Conținut",
    order: 10,
    requiredCapability: "content.read",
  },
  {
    description:
      "Publică simulări, teste și webinarii, urmărește locurile și gestionează participanții.",
    href: "/admin/events",
    icon: "calendar",
    id: "events",
    label: "Evenimente",
    order: 30,
    requiredCapability: "events.read",
  },
  {
    description:
      "Urmărește programările pentru evaluarea inițială, replanifică întâlniri și verifică notificările trimise.",
    href: "/admin/evaluari",
    icon: "evaluations",
    id: "evaluations",
    label: "Evaluări",
    order: 40,
    requiredCapability: "evaluations.read",
  },
] as const satisfies readonly AdminModuleDefinition[];

function validateModuleRegistry(
  modules: readonly AdminModuleDefinition[],
): readonly AdminModuleDefinition[] {
  const ids = new Set<string>();
  const paths = new Set<string>();

  for (const definition of modules) {
    if (ids.has(definition.id)) {
      throw new Error(`Duplicate admin module id: ${definition.id}`);
    }

    if (paths.has(definition.href)) {
      throw new Error(`Duplicate admin module path: ${definition.href}`);
    }

    if (
      definition.href !== "/admin" &&
      !definition.href.startsWith("/admin/")
    ) {
      throw new Error(
        `Admin module path is outside /admin: ${definition.href}`,
      );
    }

    ids.add(definition.id);
    paths.add(definition.href);
  }

  return [...modules].sort((left, right) => left.order - right.order);
}

const adminModuleRegistry = validateModuleRegistry(moduleDefinitions);

export function getVisibleAdminModules(
  capabilities: readonly AdminCapability[],
): readonly AdminModuleSummary[] {
  const granted = new Set(capabilities);

  return adminModuleRegistry
    .filter((definition) => granted.has(definition.requiredCapability))
    .map((definition) => ({
      description: definition.description,
      href: definition.href,
      icon: definition.icon,
      id: definition.id,
      label: definition.label,
      order: definition.order,
    }));
}
