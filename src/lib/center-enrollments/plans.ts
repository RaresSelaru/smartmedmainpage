export const LEGACY_CENTER_ENROLLMENT_PLAN_SLUGS = [
  "online-esential",
  "centru-plus",
  "module-signature",
] as const;

export const CURRENT_CENTER_ENROLLMENT_PLAN_SLUGS = [
  "esential-1-materie",
  "esential-2-materii",
  "avansat-1-materie",
  "avansat-2-materii",
  "performanta-1-materie",
  "performanta-2-materii",
] as const;

export const CENTER_ENROLLMENT_PLAN_SLUGS = [
  ...LEGACY_CENTER_ENROLLMENT_PLAN_SLUGS,
  ...CURRENT_CENTER_ENROLLMENT_PLAN_SLUGS,
] as const;

export type CenterEnrollmentPlanSlug =
  (typeof CENTER_ENROLLMENT_PLAN_SLUGS)[number];

export type CenterEnrollmentPlan = {
  accent: string;
  description: string;
  label: string;
  slug: CenterEnrollmentPlanSlug;
};

export const CENTER_ENROLLMENT_PLANS: Record<
  CenterEnrollmentPlanSlug,
  CenterEnrollmentPlan
> = {
  "online-esential": {
    accent: "Pregătire online",
    description:
      "Cursuri live și acces la platforma SmartMed, într-un ritm ușor de urmărit de oriunde.",
    label: "Online Esențial",
    slug: "online-esential",
  },
  "centru-plus": {
    accent: "Pregătire la centru",
    description:
      "Întâlniri la Centrul SmartMed și acces la modulele care completează pregătirea ta.",
    label: "Centru Plus",
    slug: "centru-plus",
  },
  "module-signature": {
    accent: "Module speciale",
    description:
      "Un parcurs concentrat pe module SmartMed speciale, fără includerea cursurilor standard.",
    label: "Module Signature",
    slug: "module-signature",
  },
  "esential-1-materie": {
    accent: "Plan Esențial",
    description:
      "Pregătire SmartMed Esențial pentru o singură materie, cu un parcurs clar și consecvent.",
    label: "Esențial · 1 materie",
    slug: "esential-1-materie",
  },
  "esential-2-materii": {
    accent: "Plan Esențial",
    description:
      "Pregătire SmartMed Esențial pentru două materii, organizate într-un ritm coerent.",
    label: "Esențial · 2 materii",
    slug: "esential-2-materii",
  },
  "avansat-1-materie": {
    accent: "Plan Avansat",
    description:
      "Pregătire SmartMed Avansat pentru o singură materie, cu aprofundare și exercițiu susținut.",
    label: "Avansat · 1 materie",
    slug: "avansat-1-materie",
  },
  "avansat-2-materii": {
    accent: "Plan Avansat",
    description:
      "Pregătire SmartMed Avansat pentru două materii, cu progres coordonat și aprofundare.",
    label: "Avansat · 2 materii",
    slug: "avansat-2-materii",
  },
  "performanta-1-materie": {
    accent: "Plan Performanță",
    description:
      "Pregătire SmartMed Performanță pentru o singură materie, orientată spre obiective ambițioase.",
    label: "Performanță · 1 materie",
    slug: "performanta-1-materie",
  },
  "performanta-2-materii": {
    accent: "Plan Performanță",
    description:
      "Pregătire SmartMed Performanță pentru două materii, cu strategie completă pentru admitere.",
    label: "Performanță · 2 materii",
    slug: "performanta-2-materii",
  },
};

export function parseCenterEnrollmentPlan(
  value: string | string[] | undefined,
): CenterEnrollmentPlan | null {
  const slug = Array.isArray(value) ? value[0] : value;

  if (
    !slug ||
    !CENTER_ENROLLMENT_PLAN_SLUGS.includes(slug as CenterEnrollmentPlanSlug)
  ) {
    return null;
  }

  return CENTER_ENROLLMENT_PLANS[slug as CenterEnrollmentPlanSlug];
}
