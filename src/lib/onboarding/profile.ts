import {
  EMPTY_STUDENT_ONBOARDING_PROFILE,
  type FocusSubject,
  type PrimaryLearningGoal,
  type StudentOnboardingProfile,
  type StudentOnboardingStatus,
  type StudentOnboardingSource,
  type StudyChallenge,
  type StudyStage,
  type TargetExamPlan,
  type TargetMedicalCenter,
} from "@/lib/onboarding/schema";

export type StudentOnboardingProfileRow = {
  focus_subjects?: string[] | null;
  onboarding_completed_at?: string | null;
  onboarding_snoozed_until?: string | null;
  onboarding_started_at?: string | null;
  onboarding_status?: string | null;
  onboarding_step?: number | null;
  onboarding_version?: number | null;
  primary_learning_goal?: string | null;
  signup_source?: string | null;
  study_challenges?: string[] | null;
  study_stage?: string | null;
  target_exam_plan?: string | null;
  target_exam_year?: number | null;
  target_medical_center?: string | null;
};

export function mapStudentOnboardingProfile(
  row: StudentOnboardingProfileRow | null | undefined,
): StudentOnboardingProfile {
  if (!row) {
    return { ...EMPTY_STUDENT_ONBOARDING_PROFILE };
  }

  return {
    completedAt: row.onboarding_completed_at ?? null,
    currentStep: row.onboarding_step ?? 0,
    focusSubjects: (row.focus_subjects ?? []) as FocusSubject[],
    primaryLearningGoal:
      (row.primary_learning_goal as PrimaryLearningGoal | null | undefined) ?? null,
    source:
      (row.signup_source as StudentOnboardingSource | null | undefined) ??
      "account",
    snoozedUntil: row.onboarding_snoozed_until ?? null,
    startedAt: row.onboarding_started_at ?? null,
    status:
      (row.onboarding_status as StudentOnboardingStatus | null | undefined) ??
      "not_started",
    studyChallenges: (row.study_challenges ?? []) as StudyChallenge[],
    studyStage: (row.study_stage as StudyStage | null | undefined) ?? null,
    targetExamPlan:
      (row.target_exam_plan as TargetExamPlan | null | undefined) ?? null,
    targetExamYear:
      typeof row.target_exam_year === "number"
        ? String(row.target_exam_year)
        : null,
    targetMedicalCenter:
      (row.target_medical_center as TargetMedicalCenter | null | undefined) ?? null,
    version: row.onboarding_version ?? 1,
  };
}
