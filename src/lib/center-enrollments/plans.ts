export const CENTER_ENROLLMENT_PLAN_SLUGS = [
  "online-esential",
  "centru-plus",
  "module-signature",
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
