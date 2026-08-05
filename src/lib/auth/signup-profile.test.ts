import assert from "node:assert/strict";
import test from "node:test";

import { smartMedSignupProfileMetadataSchema } from "@/lib/auth/signup-profile";

test("accepts the canonical center enrollment prefill contract", () => {
  const result = smartMedSignupProfileMetadataSchema.safeParse({
    city: "Brașov",
    focus_subjects: ["biology", "chemistry"],
    full_name: "Ana Student",
    phone: "+40722111222",
    school: "Colegiul Național",
    signup_source: "center_enrollment",
    study_stage: "high_school_11",
    target_exam_plan: "scheduled",
    target_exam_year: 2028,
    target_medical_center: "other",
  });

  assert.equal(result.success, true);
});

test("rejects contradictory onboarding prefill metadata", () => {
  const result = smartMedSignupProfileMetadataSchema.safeParse({
    focus_subjects: ["undecided", "biology"],
    full_name: "Ana Student",
    signup_source: "center_enrollment",
    target_exam_plan: "later",
    target_exam_year: 2028,
  });

  assert.equal(result.success, false);
});
