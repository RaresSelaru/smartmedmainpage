import assert from "node:assert/strict";
import test from "node:test";

import { CURRENT_CENTER_ENROLLMENT_PLAN_SLUGS } from "./plans.ts";
import { centerEnrollmentInputSchema } from "./schema.ts";

function validInput() {
  return {
    biologyLevel: "intermediate",
    birthDate: "2000-05-12",
    chemistryLevel: null,
    context: { flow: "center" },
    currentGrade: "grade_11",
    deliveryMode: "in_person",
    email: "student@example.com",
    examYear: 2028,
    fullName: "Student SmartMed",
    guardianEmail: null,
    guardianName: null,
    guardianPhone: null,
    highSchool: "Colegiul Național",
    idempotencyKey: "41000000-0000-4000-8000-000000000001",
    localityCounty: "București",
    participantStatus: "adult",
    phone: "0712345678",
    preparationTypes: ["courses"],
    previousTutoring: true,
    privacyAccepted: true,
    selectedPlanSlug: "centru-plus",
    sourceContext: "homepage-hero",
    studyProfile: "Științe ale naturii",
    subjects: ["biology_corint"],
    targetUniversity: "umf_bucharest",
    targetUniversityOther: null,
    website: "",
    whatsappOptIn: true,
  };
}

test("center enrolment accepts the complete adult path", () => {
  assert.equal(centerEnrollmentInputSchema.safeParse(validInput()).success, true);
});

for (const selectedPlanSlug of CURRENT_CENTER_ENROLLMENT_PLAN_SLUGS) {
  test(`center enrolment accepts the current plan ${selectedPlanSlug}`, () => {
    assert.equal(
      centerEnrollmentInputSchema.safeParse({
        ...validInput(),
        selectedPlanSlug,
      }).success,
      true,
    );
  });
}

test("minor enrolments require guardian details", () => {
  const result = centerEnrollmentInputSchema.safeParse({
    ...validInput(),
    birthDate: new Date().getFullYear() - 16 + "-08-01",
    participantStatus: "minor",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    const fields = result.error.flatten().fieldErrors;
    assert.ok(fields.guardianName);
    assert.ok(fields.guardianEmail);
    assert.ok(fields.guardianPhone);
  }
});

test("subject levels are required only for selected subjects", () => {
  const result = centerEnrollmentInputSchema.safeParse({
    ...validInput(),
    biologyLevel: null,
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.flatten().fieldErrors.biologyLevel);
  }
});

test("center enrolment requires one supported active-plan slug", () => {
  const result = centerEnrollmentInputSchema.safeParse({
    ...validInput(),
    selectedPlanSlug: "premium",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.flatten().fieldErrors.selectedPlanSlug);
  }
});
