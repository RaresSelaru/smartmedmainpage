import type { Metadata } from "next";

import {
  EvaluationBooking,
  type EvaluationViewer,
} from "@/components/evaluation/evaluation-booking";
import { EvaluationHero } from "@/components/evaluation/evaluation-hero";
import { EvaluationInfoSections } from "@/components/evaluation/evaluation-info-sections";
import { getCurrentSmartMedSession } from "@/lib/auth/session";
import {
  getEvaluationSlots,
  getOwnEvaluations,
} from "@/lib/evaluations/repository";
import type {
  EvaluationAppointment,
  EvaluationSlot,
} from "@/lib/evaluations/types";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const description =
  "Programează evaluarea inițială SmartMed și clarifică nivelul, obiectivul și traseul de pregătire potrivit pentru Admiterea la Medicină.";

export const metadata: Metadata = {
  alternates: {
    canonical: "/evaluare",
  },
  description,
  openGraph: {
    description,
    siteName: siteConfig.fullName,
    title: `Evaluare inițială | ${siteConfig.name}`,
    type: "website",
  },
  title: "Evaluare inițială",
};

type EvaluationPageProps = {
  searchParams?: Promise<{
    source?: string | string[];
  }>;
};

const stageLabels: Record<string, string> = {
  exploring: "În explorare",
  graduate: "An de pregătire",
  high_school_11: "Clasa a XI-a",
  high_school_12: "Clasa a XII-a",
  high_school_9_10: "Clasa a IX-a / a X-a",
};

const subjectLabels: Record<string, string> = {
  biology: "Biologie",
  chemistry: "Chimie",
  physics: "Fizică",
  undecided: "Materii în explorare",
};

function safeSource(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate || !/^[a-z0-9_-]{1,80}$/iu.test(candidate)) {
    return "home-hero";
  }

  return candidate;
}

function evaluationViewer(
  session: Awaited<ReturnType<typeof getCurrentSmartMedSession>>,
): EvaluationViewer | null {
  if (!session) return null;

  const summary = [
    session.onboarding.studyStage
      ? stageLabels[session.onboarding.studyStage]
      : null,
    session.onboarding.targetExamYear
      ? `Admitere ${session.onboarding.targetExamYear}`
      : session.profile.examYear
        ? `Admitere ${session.profile.examYear}`
        : null,
    ...session.onboarding.focusSubjects
      .map((subject) => subjectLabels[subject])
      .filter((subject): subject is string => Boolean(subject)),
  ]
    .filter((item): item is string => Boolean(item))
    .slice(0, 4);

  return {
    email: session.email,
    emailConfirmed: session.emailConfirmed,
    fullName: session.fullName,
    phone: session.profile.phone,
    profileSummary: summary,
  };
}

export default async function EvaluarePage({ searchParams }: EvaluationPageProps) {
  const referenceNow = new Date().toISOString();
  const params = await searchParams;
  const source = safeSource(params?.source);
  const session = await getCurrentSmartMedSession();
  let appointments: EvaluationAppointment[] = [];
  let slots: EvaluationSlot[] = [];
  let dataError: string | null = null;

  if (session?.emailConfirmed) {
    try {
      [appointments, slots] = await Promise.all([
        getOwnEvaluations(),
        getEvaluationSlots(),
      ]);
    } catch (error) {
      console.error("SmartMed evaluation page failed to load", {
        message: error instanceof Error ? error.message : "unknown",
      });
      dataError =
        "A apărut o problemă temporară la încărcarea calendarului. Încearcă din nou peste câteva momente.";
    }
  }

  return (
    <>
      <EvaluationHero />
      <EvaluationBooking
        appointments={appointments}
        dataError={dataError}
        referenceNow={referenceNow}
        slots={slots}
        source={source}
        viewer={evaluationViewer(session)}
      />
      <EvaluationInfoSections />
    </>
  );
}
