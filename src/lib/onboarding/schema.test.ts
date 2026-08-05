import assert from "node:assert/strict";
import test from "node:test";

import {
  saveStudentOnboardingSchema,
  shouldPromptStudentOnboarding,
  type StudentOnboardingProfile,
} from "./schema.ts";

const completeInput = {
  answers: {
    focusSubjects: ["biology", "chemistry"],
    primaryLearningGoal: "study_plan",
    studyChallenges: ["consistency", "retention"],
    studyStage: "high_school_12",
    targetExamPlan: "scheduled",
    targetExamYear: "2027",
    targetMedicalCenter: "bucharest",
  },
  complete: true,
  currentStep: 6,
};

test("a complete onboarding payload accepts the six intended answers", () => {
  assert.equal(saveStudentOnboardingSchema.safeParse(completeInput).success, true);
});

test("undecided subject remains an exclusive choice", () => {
  const result = saveStudentOnboardingSchema.safeParse({
    ...completeInput,
    answers: {
      ...completeInput.answers,
      focusSubjects: ["undecided", "biology"],
    },
  });

  assert.equal(result.success, false);
});

test("a student can select at most two current challenges", () => {
  const result = saveStudentOnboardingSchema.safeParse({
    ...completeInput,
    answers: {
      ...completeInput.answers,
      studyChallenges: ["starting", "retention", "confidence"],
    },
  });

  assert.equal(result.success, false);
});

test("scheduled admission requires a valid target year", () => {
  const result = saveStudentOnboardingSchema.safeParse({
    ...completeInput,
    answers: {
      ...completeInput.answers,
      targetExamYear: null,
    },
  });

  assert.equal(result.success, false);
});

test("incomplete drafts may be saved before every answer exists", () => {
  const result = saveStudentOnboardingSchema.safeParse({
    answers: {
      focusSubjects: [],
      primaryLearningGoal: null,
      studyChallenges: [],
      studyStage: "high_school_11",
      targetExamPlan: null,
      targetExamYear: null,
      targetMedicalCenter: null,
    },
    complete: false,
    currentStep: 1,
  });

  assert.equal(result.success, true);
});

test("incomplete student onboarding remains required despite a legacy snooze", () => {
  const baseProfile: StudentOnboardingProfile = {
    completedAt: null,
    currentStep: 2,
    focusSubjects: [],
    primaryLearningGoal: null,
    source: "account",
    snoozedUntil: "2026-08-07T10:00:00.000Z",
    startedAt: "2026-07-31T10:00:00.000Z",
    status: "in_progress",
    studyChallenges: [],
    studyStage: "high_school_12",
    targetExamPlan: null,
    targetExamYear: null,
    targetMedicalCenter: null,
    version: 1,
  };

  assert.equal(shouldPromptStudentOnboarding(baseProfile), true);
  assert.equal(
    shouldPromptStudentOnboarding(
      {
        ...baseProfile,
        completedAt: "2026-08-01T10:00:00.000Z",
        status: "completed",
      },
    ),
    false,
  );
});
