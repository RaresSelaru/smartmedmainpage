import type { SmartMedRole } from "@/lib/auth/access-control";
import type { StudentOnboardingProfile } from "@/lib/onboarding/schema";
import { shouldPromptStudentOnboarding } from "@/lib/onboarding/schema";

type StudentOnboardingSession = {
  onboarding: StudentOnboardingProfile;
  role: SmartMedRole;
};

export const STUDENT_ONBOARDING_SESSION_RETRY_DELAYS_MS = [
  750,
  1_500,
  3_000,
  6_000,
] as const;

export function canDisplayStudentOnboarding(
  pathname: string,
  accountMode: string | null,
) {
  const isSettingNewPassword =
    pathname === "/cont" && accountMode === "parola-noua";

  return (
    !pathname.startsWith("/auth/") &&
    pathname !== "/admin" &&
    !pathname.startsWith("/admin/") &&
    !isSettingNewPassword
  );
}

export function requiresStudentOnboarding(
  session: StudentOnboardingSession | null,
) {
  return Boolean(
    session &&
      session.role !== "admin" &&
      shouldPromptStudentOnboarding(session.onboarding),
  );
}

export function getStudentOnboardingSessionRetryDelay(
  failedAttempt: number,
) {
  if (!Number.isInteger(failedAttempt) || failedAttempt < 0) {
    return null;
  }

  return STUDENT_ONBOARDING_SESSION_RETRY_DELAYS_MS[failedAttempt] ?? null;
}
