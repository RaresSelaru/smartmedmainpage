import assert from "node:assert/strict";
import test from "node:test";

import type { SmartMedRole } from "../auth/access-control.ts";
import {
  EMPTY_STUDENT_ONBOARDING_PROFILE,
  type StudentOnboardingProfile,
} from "./schema.ts";
import {
  canDisplayStudentOnboarding,
  getStudentOnboardingSessionRetryDelay,
  requiresStudentOnboarding,
  STUDENT_ONBOARDING_SESSION_RETRY_DELAYS_MS,
} from "./gate-policy.ts";

function session(
  role: SmartMedRole,
  onboarding: StudentOnboardingProfile = EMPTY_STUDENT_ONBOARDING_PROFILE,
) {
  return { onboarding, role };
}

test("mandatory onboarding applies to every incomplete non-admin account", () => {
  assert.equal(requiresStudentOnboarding(session("user")), true);
  assert.equal(requiresStudentOnboarding(session("premium")), true);
  assert.equal(requiresStudentOnboarding(session("admin")), false);
  assert.equal(requiresStudentOnboarding(null), false);
});

test("completed onboarding no longer blocks the student", () => {
  assert.equal(
    requiresStudentOnboarding(
      session("user", {
        ...EMPTY_STUDENT_ONBOARDING_PROFILE,
        completedAt: "2026-08-02T10:00:00.000Z",
        status: "completed",
      }),
    ),
    false,
  );
});

test("auth, admin, and password recovery routes remain exempt", () => {
  assert.equal(canDisplayStudentOnboarding("/", null), true);
  assert.equal(canDisplayStudentOnboarding("/inscriere", null), true);
  assert.equal(canDisplayStudentOnboarding("/auth/callback", null), false);
  assert.equal(canDisplayStudentOnboarding("/admin", null), false);
  assert.equal(canDisplayStudentOnboarding("/admin/inscrieri", null), false);
  assert.equal(canDisplayStudentOnboarding("/cont", "parola-noua"), false);
  assert.equal(canDisplayStudentOnboarding("/cont", null), true);
});

test("session refresh retries use a finite exponential schedule", () => {
  assert.deepEqual(STUDENT_ONBOARDING_SESSION_RETRY_DELAYS_MS, [
    750,
    1_500,
    3_000,
    6_000,
  ]);
  assert.equal(getStudentOnboardingSessionRetryDelay(0), 750);
  assert.equal(getStudentOnboardingSessionRetryDelay(3), 6_000);
  assert.equal(getStudentOnboardingSessionRetryDelay(4), null);
  assert.equal(getStudentOnboardingSessionRetryDelay(-1), null);
  assert.equal(getStudentOnboardingSessionRetryDelay(1.5), null);
});
