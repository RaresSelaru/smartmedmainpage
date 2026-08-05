"use server";

import { revalidatePath } from "next/cache";

import { getAuthConfigurationMessage } from "@/lib/auth/env";
import { getCurrentSmartMedSession } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/auth/supabase";
import { mapStudentOnboardingProfile } from "@/lib/onboarding/profile";
import {
  STUDENT_ONBOARDING_TOTAL_STEPS,
  STUDENT_ONBOARDING_VERSION,
  saveStudentOnboardingSchema,
  type StudentOnboardingProfile,
} from "@/lib/onboarding/schema";

export type StudentOnboardingActionResult = {
  message: string;
  profile?: StudentOnboardingProfile;
  status: "error" | "success";
};

const onboardingSelect =
  "focus_subjects, onboarding_completed_at, onboarding_snoozed_until, onboarding_started_at, onboarding_status, onboarding_step, onboarding_version, primary_learning_goal, signup_source, study_challenges, study_stage, target_exam_plan, target_exam_year, target_medical_center";

function actionError(message: string): StudentOnboardingActionResult {
  return { message, status: "error" };
}

async function getOnboardingContext() {
  const configurationMessage = getAuthConfigurationMessage();

  if (configurationMessage) {
    return {
      error: "Profilul de studiu nu este disponibil momentan.",
      session: null,
      supabase: null,
    };
  }

  const session = await getCurrentSmartMedSession();

  if (!session) {
    return {
      error: "Intră în cont pentru a salva profilul de studiu.",
      session: null,
      supabase: null,
    };
  }

  const supabase = await createServerSupabaseClient();

  return {
    error: supabase ? null : "Profilul de studiu nu este disponibil momentan.",
    session,
    supabase,
  };
}

export async function saveStudentOnboardingAction(
  input: unknown,
): Promise<StudentOnboardingActionResult> {
  const parsed = saveStudentOnboardingSchema.safeParse(input);

  if (!parsed.success) {
    return actionError("Verifică alegerea de la pasul curent și încearcă din nou.");
  }

  const { error: contextError, session, supabase } = await getOnboardingContext();

  if (!session || !supabase) {
    return actionError(contextError ?? "Profilul de studiu nu a putut fi salvat.");
  }

  const now = new Date().toISOString();
  const { answers, complete, currentStep } = parsed.data;
  const answerUpdate = {
    focus_subjects: answers.focusSubjects,
    onboarding_version: STUDENT_ONBOARDING_VERSION,
    primary_learning_goal: answers.primaryLearningGoal,
    study_challenges: answers.studyChallenges,
    study_stage: answers.studyStage,
    target_exam_plan: answers.targetExamPlan,
    target_exam_year:
      answers.targetExamPlan === "scheduled" && answers.targetExamYear
        ? Number(answers.targetExamYear)
        : null,
    target_medical_center: answers.targetMedicalCenter,
  };
  const lifecycleUpdate =
    complete
      ? {
          onboarding_completed_at: session.onboarding.completedAt ?? now,
          onboarding_snoozed_until: null,
          onboarding_started_at: session.onboarding.startedAt ?? now,
          onboarding_status: "completed",
          onboarding_step: STUDENT_ONBOARDING_TOTAL_STEPS,
        }
      : session.onboarding.status === "completed"
        ? {}
        : {
            onboarding_completed_at: null,
            onboarding_snoozed_until: null,
            onboarding_started_at: session.onboarding.startedAt ?? now,
            onboarding_status: "in_progress",
            onboarding_step: Math.min(
              currentStep + 1,
              STUDENT_ONBOARDING_TOTAL_STEPS,
            ),
          };

  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...answerUpdate,
      ...lifecycleUpdate,
    })
    .eq("id", session.id)
    .select(onboardingSelect)
    .single();

  if (error || !data) {
    console.error("SmartMed onboarding update failed", {
      code: error?.code,
      userId: session.id,
    });

    return actionError("Nu am putut salva răspunsurile. Încearcă din nou.");
  }

  revalidatePath("/cont");

  return {
    message: complete
      ? "Profilul tău de studiu este gata."
      : "Pas salvat.",
    profile: mapStudentOnboardingProfile(data),
    status: "success",
  };
}
