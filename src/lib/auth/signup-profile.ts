import { z } from "zod";

import {
  focusSubjects,
  studentOnboardingSources,
  studyStages,
  targetExamPlans,
  targetMedicalCenters,
} from "@/lib/onboarding/schema";

export const smartMedSignupSources = studentOnboardingSources;

export type SmartMedSignupSource = (typeof smartMedSignupSources)[number];

const optionalMetadataText = (maxLength: number, minimumLength = 2) =>
  z
    .string()
    .trim()
    .min(minimumLength)
    .max(maxLength)
    .optional();

/**
 * Canonical metadata contract used while creating a SmartMed identity.
 *
 * These values only prefill the user's own profile. They are intentionally
 * never suitable for permissions because Supabase user metadata is editable by
 * the account owner. The database trigger repeats the allow-list validation so
 * malformed metadata cannot make account creation fail.
 */
export const smartMedSignupProfileMetadataSchema = z
  .object({
    city: optionalMetadataText(80),
    focus_subjects: z.array(z.enum(focusSubjects)).max(3).optional(),
    full_name: z.string().trim().min(2).max(100),
    phone: optionalMetadataText(32, 7),
    school: optionalMetadataText(160),
    signup_source: z.enum(smartMedSignupSources),
    study_stage: z.enum(studyStages).optional(),
    target_exam_plan: z.enum(targetExamPlans).optional(),
    target_exam_year: z.number().int().min(2026).max(2045).optional(),
    target_medical_center: z.enum(targetMedicalCenters).optional(),
  })
  .strict()
  .superRefine((metadata, context) => {
    const subjects = metadata.focus_subjects ?? [];

    if (new Set(subjects).size !== subjects.length) {
      context.addIssue({
        code: "custom",
        message: "Materiile pentru precompletare trebuie să fie unice.",
        path: ["focus_subjects"],
      });
    }

    if (subjects.includes("undecided") && subjects.length > 1) {
      context.addIssue({
        code: "custom",
        message: "«Încă explorez» nu se combină cu alte materii.",
        path: ["focus_subjects"],
      });
    }

    if (
      metadata.target_exam_plan === "scheduled" &&
      metadata.target_exam_year === undefined
    ) {
      context.addIssue({
        code: "custom",
        message: "Anul este necesar pentru o admitere programată.",
        path: ["target_exam_year"],
      });
    }

    if (
      metadata.target_exam_plan !== "scheduled" &&
      metadata.target_exam_year !== undefined
    ) {
      context.addIssue({
        code: "custom",
        message: "Anul se completează doar pentru o admitere programată.",
        path: ["target_exam_year"],
      });
    }
  });

export type SmartMedSignupProfileMetadata = z.infer<
  typeof smartMedSignupProfileMetadataSchema
>;
