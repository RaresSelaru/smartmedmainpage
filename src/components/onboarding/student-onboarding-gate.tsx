"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { StudentOnboardingFlow } from "@/components/onboarding/student-onboarding-flow";
import type { SmartMedSessionSummary } from "@/lib/auth/session";
import type { StudentOnboardingActionResult } from "@/lib/onboarding/actions";
import {
  canDisplayStudentOnboarding,
  getStudentOnboardingSessionRetryDelay,
  requiresStudentOnboarding,
} from "@/lib/onboarding/gate-policy";
import {
  OPEN_STUDENT_ONBOARDING_EVENT,
  STUDENT_ONBOARDING_UPDATED_EVENT,
  type StudentOnboardingProfile,
} from "@/lib/onboarding/schema";

type SessionResponse = {
  isConfigured: boolean;
  session: SmartMedSessionSummary | null;
};

type StudentOnboardingGateProps = {
  initialSession: SmartMedSessionSummary | null;
};

export function StudentOnboardingGate({
  initialSession,
}: StudentOnboardingGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountMode = searchParams.get("mode");
  const routeAllowsOnboarding = canDisplayStudentOnboarding(pathname, accountMode);
  const [session, setSession] =
    useState<SmartMedSessionSummary | null>(initialSession);
  const [flowOpen, setFlowOpen] = useState(
    () =>
      routeAllowsOnboarding && requiresStudentOnboarding(initialSession),
  );
  const pendingManualOpenRef = useRef(false);
  const sessionRef = useRef<SmartMedSessionSummary | null>(initialSession);
  const mountedRef = useRef(false);
  const refreshGenerationRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);

  const applySession = useCallback(
    (nextSession: SmartMedSessionSummary | null) => {
      sessionRef.current = nextSession;
      setSession(nextSession);
    },
    [],
  );

  const refreshSession = useCallback(async (generation: number) => {
    try {
      const response = await fetch("/auth/session", {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!response.ok) {
        return false;
      }

      const payload = (await response.json()) as SessionResponse;

      if (
        refreshGenerationRef.current !== generation ||
        !mountedRef.current
      ) {
        return true;
      }

      applySession(payload.session);

      if (pendingManualOpenRef.current && payload.session) {
        pendingManualOpenRef.current = false;
        setFlowOpen(true);
      } else if (!payload.session) {
        pendingManualOpenRef.current = false;
      }

      return true;
    } catch {
      return false;
    }
  }, [applySession]);

  const refreshSessionWithRetry = useCallback(() => {
    const generation = refreshGenerationRef.current + 1;
    refreshGenerationRef.current = generation;

    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const runAttempt = async (failedAttempt: number) => {
      const succeeded = await refreshSession(generation);

      if (
        succeeded ||
        !mountedRef.current ||
        refreshGenerationRef.current !== generation
      ) {
        return;
      }

      const retryDelay =
        getStudentOnboardingSessionRetryDelay(failedAttempt);

      if (retryDelay === null) {
        return;
      }

      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        void runAttempt(failedAttempt + 1);
      }, retryDelay);
    };

    void runAttempt(0);
  }, [refreshSession]);

  useEffect(() => {
    mountedRef.current = true;
    const initialRefresh = window.setTimeout(() => {
      refreshSessionWithRetry();
    }, 0);

    const handleAuthChange = () => {
      pendingManualOpenRef.current = false;
      setFlowOpen(false);
      refreshSessionWithRetry();
    };
    const handleManualOpen = () => {
      if (sessionRef.current) {
        setFlowOpen(true);
        return;
      }

      pendingManualOpenRef.current = true;
      refreshSessionWithRetry();
    };
    const handleOnline = () => refreshSessionWithRetry();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshSessionWithRetry();
      }
    };

    window.addEventListener("smartmed-auth-change", handleAuthChange);
    window.addEventListener(OPEN_STUDENT_ONBOARDING_EVENT, handleManualOpen);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      refreshGenerationRef.current += 1;
      window.clearTimeout(initialRefresh);

      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      window.removeEventListener("smartmed-auth-change", handleAuthChange);
      window.removeEventListener(OPEN_STUDENT_ONBOARDING_EVENT, handleManualOpen);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshSessionWithRetry]);

  const isStudentAccount = Boolean(session && session.role !== "admin");
  const onboardingRequired = requiresStudentOnboarding(session);

  useEffect(() => {
    if (!onboardingRequired || !routeAllowsOnboarding) {
      return;
    }

    const openRequiredFlow = window.setTimeout(() => {
      setFlowOpen(true);
    }, 0);

    return () => window.clearTimeout(openRequiredFlow);
  }, [onboardingRequired, routeAllowsOnboarding]);

  const handleProfileUpdated = (
    profile: StudentOnboardingProfile,
    result: StudentOnboardingActionResult,
  ) => {
    if (session) {
      setSession({ ...session, onboarding: profile });
    }

    window.dispatchEvent(
      new CustomEvent(STUDENT_ONBOARDING_UPDATED_EVENT, {
        detail: { profile, result },
      }),
    );

    if (profile.status === "completed") {
      router.refresh();
    }
  };

  if (
    !session ||
    !isStudentAccount ||
    !routeAllowsOnboarding ||
    !flowOpen
  ) {
    return null;
  }

  return (
    <StudentOnboardingFlow
      fullName={session.fullName}
      initialProfile={session.onboarding}
      onClose={() => {
        if (!onboardingRequired) {
          setFlowOpen(false);
        }
      }}
      onUpdated={handleProfileUpdated}
      required={onboardingRequired}
    />
  );
}
