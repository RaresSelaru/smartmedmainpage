import { z } from "zod";

export const STUDENT_ONBOARDING_VERSION = 1;
export const STUDENT_ONBOARDING_TOTAL_STEPS = 6;
export const OPEN_STUDENT_ONBOARDING_EVENT = "smartmed-open-student-onboarding";
export const STUDENT_ONBOARDING_UPDATED_EVENT = "smartmed-student-onboarding-updated";

export const studyStages = [
  "high_school_9_10",
  "high_school_11",
  "high_school_12",
  "graduate",
  "exploring",
] as const;
export const targetExamPlans = ["scheduled", "later", "exploring"] as const;
export const targetMedicalCenters = [
  "bucharest",
  "cluj",
  "iasi",
  "timisoara",
  "targu_mures",
  "craiova",
  "other",
  "exploring",
] as const;
export const focusSubjects = ["biology", "chemistry", "physics", "undecided"] as const;
export const studyChallenges = [
  "starting",
  "retention",
  "trick_questions",
  "consistency",
  "exam_time",
  "confidence",
] as const;
export const primaryLearningGoals = [
  "study_plan",
  "visual_explanations",
  "questions_feedback",
  "realistic_simulations",
  "consistency",
] as const;
export const onboardingStatuses = ["not_started", "in_progress", "completed"] as const;
export const studentOnboardingSources = [
  "account",
  "center_enrollment",
  "event_enrollment",
  "oauth",
] as const;

export type StudyStage = (typeof studyStages)[number];
export type TargetExamPlan = (typeof targetExamPlans)[number];
export type TargetMedicalCenter = (typeof targetMedicalCenters)[number];
export type FocusSubject = (typeof focusSubjects)[number];
export type StudyChallenge = (typeof studyChallenges)[number];
export type PrimaryLearningGoal = (typeof primaryLearningGoals)[number];
export type StudentOnboardingStatus = (typeof onboardingStatuses)[number];
export type StudentOnboardingSource = (typeof studentOnboardingSources)[number];

export type StudentOnboardingAnswers = {
  focusSubjects: FocusSubject[];
  primaryLearningGoal: PrimaryLearningGoal | null;
  studyChallenges: StudyChallenge[];
  studyStage: StudyStage | null;
  targetExamPlan: TargetExamPlan | null;
  targetExamYear: string | null;
  targetMedicalCenter: TargetMedicalCenter | null;
};

export type StudentOnboardingProfile = StudentOnboardingAnswers & {
  completedAt: string | null;
  currentStep: number;
  source: StudentOnboardingSource;
  snoozedUntil: string | null;
  startedAt: string | null;
  status: StudentOnboardingStatus;
  version: number;
};

export const EMPTY_STUDENT_ONBOARDING_PROFILE: StudentOnboardingProfile = {
  completedAt: null,
  currentStep: 0,
  focusSubjects: [],
  primaryLearningGoal: null,
  source: "account",
  snoozedUntil: null,
  startedAt: null,
  status: "not_started",
  studyChallenges: [],
  studyStage: null,
  targetExamPlan: null,
  targetExamYear: null,
  targetMedicalCenter: null,
  version: STUDENT_ONBOARDING_VERSION,
};

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).nullable();

export const studentOnboardingAnswersSchema = z
  .object({
    focusSubjects: z.array(z.enum(focusSubjects)).max(3),
    primaryLearningGoal: optionalEnum(primaryLearningGoals),
    studyChallenges: z.array(z.enum(studyChallenges)).max(2),
    studyStage: optionalEnum(studyStages),
    targetExamPlan: optionalEnum(targetExamPlans),
    targetExamYear: z
      .string()
      .regex(/^[0-9]{4}$/)
      .refine((value) => Number(value) >= 2026 && Number(value) <= 2045)
      .nullable(),
    targetMedicalCenter: optionalEnum(targetMedicalCenters),
  })
  .strict()
  .superRefine((answers, context) => {
    if (
      answers.focusSubjects.includes("undecided") &&
      answers.focusSubjects.length > 1
    ) {
      context.addIssue({
        code: "custom",
        message: "Opțiunea «Încă explorez» nu se combină cu alte materii.",
        path: ["focusSubjects"],
      });
    }

    if (new Set(answers.focusSubjects).size !== answers.focusSubjects.length) {
      context.addIssue({
        code: "custom",
        message: "Aceeași materie nu poate fi selectată de două ori.",
        path: ["focusSubjects"],
      });
    }

    if (new Set(answers.studyChallenges).size !== answers.studyChallenges.length) {
      context.addIssue({
        code: "custom",
        message: "Aceeași dificultate nu poate fi selectată de două ori.",
        path: ["studyChallenges"],
      });
    }

    if (answers.targetExamPlan === "scheduled" && !answers.targetExamYear) {
      context.addIssue({
        code: "custom",
        message: "Alege anul admiterii.",
        path: ["targetExamYear"],
      });
    }

    if (
      answers.targetExamPlan &&
      answers.targetExamPlan !== "scheduled" &&
      answers.targetExamYear
    ) {
      context.addIssue({
        code: "custom",
        message: "Anul se completează doar pentru o admitere programată.",
        path: ["targetExamYear"],
      });
    }
  });

export const saveStudentOnboardingSchema = z
  .object({
    answers: studentOnboardingAnswersSchema,
    complete: z.boolean(),
    currentStep: z.number().int().min(1).max(STUDENT_ONBOARDING_TOTAL_STEPS),
  })
  .strict()
  .superRefine((input, context) => {
    if (!input.complete) {
      return;
    }

    const requiredAnswers: Array<[unknown, keyof StudentOnboardingAnswers]> = [
      [input.answers.studyStage, "studyStage"],
      [input.answers.targetExamPlan, "targetExamPlan"],
      [input.answers.targetMedicalCenter, "targetMedicalCenter"],
      [input.answers.primaryLearningGoal, "primaryLearningGoal"],
    ];

    for (const [value, path] of requiredAnswers) {
      if (!value) {
        context.addIssue({
          code: "custom",
          message: "Răspunsul este necesar pentru finalizare.",
          path: ["answers", path],
        });
      }
    }

    if (input.answers.focusSubjects.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Alege cel puțin o materie.",
        path: ["answers", "focusSubjects"],
      });
    }

    if (input.answers.studyChallenges.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Alege cel puțin o dificultate.",
        path: ["answers", "studyChallenges"],
      });
    }
  });

export function shouldPromptStudentOnboarding(
  profile: StudentOnboardingProfile,
) {
  return profile.status !== "completed";
}
