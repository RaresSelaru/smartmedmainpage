import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CircleAlert } from "lucide-react";

import type { CenterEnrollmentPrefill } from "@/components/registration/center-enrollment-flow";
import { DedicatedCenterEnrollment } from "@/components/registration/dedicated-center-enrollment";
import { getCurrentSmartMedSession } from "@/lib/auth/session";
import { parseCenterEnrollmentPlan } from "@/lib/center-enrollments/plans";
import type { StudyStage } from "@/lib/onboarding/schema";
import {
  parseRegistrationContext,
  type RegistrationContext,
} from "@/lib/registration-context";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const description =
  "Finalizează înscrierea la Centrul SmartMed după alegerea abonamentului potrivit pentru pregătirea admiterii la Medicină.";

export const metadata: Metadata = {
  title: "Înscriere la Centrul SmartMed",
  description,
  openGraph: {
    title: `Înscriere la Centrul SmartMed | ${siteConfig.name}`,
    description,
    siteName: siteConfig.fullName,
    type: "website",
  },
  alternates: { canonical: "/inscriere/centru" },
};

type CenterRegistrationPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function gradeFromOnboarding(
  stage: StudyStage | null,
): CenterEnrollmentPrefill["currentGrade"] {
  if (stage === "high_school_9_10") return "grade_10";
  if (stage === "high_school_11") return "grade_11";
  if (stage === "high_school_12") return "grade_12";
  if (stage === "graduate") return "graduate";
  return null;
}

function gradeFromContext(
  grade: RegistrationContext["grade"],
): CenterEnrollmentPrefill["currentGrade"] {
  if (grade === "10") return "grade_10";
  if (grade === "11") return "grade_11";
  if (grade === "12") return "grade_12";
  return null;
}

function universityFromOnboarding(
  center: string | null,
): CenterEnrollmentPrefill["targetUniversity"] {
  const mapping: Record<
    string,
    NonNullable<CenterEnrollmentPrefill["targetUniversity"]>
  > = {
    bucharest: "umf_bucharest",
    cluj: "umf_cluj",
    craiova: "umf_craiova",
    iasi: "umf_iasi",
    other: "other",
    targu_mures: "umf_targu_mures",
    timisoara: "umf_timisoara",
  };

  return center ? (mapping[center] ?? null) : null;
}

function bucharestDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Bucharest",
    year: "numeric",
  }).format(now);
}

export default async function CenterRegistrationPage({
  searchParams,
}: CenterRegistrationPageProps) {
  const query = await searchParams;
  const plan = parseCenterEnrollmentPlan(query.plan);
  const registrationContext = parseRegistrationContext(query);

  if (!plan) {
    return (
      <section className="relative isolate min-h-[760px] overflow-hidden bg-smart-sand px-5 pb-24 pt-36 sm:px-7 lg:px-8 lg:pt-40">
        <div className="absolute -left-40 top-28 size-[420px] rounded-full bg-smart-aqua/22 blur-3xl" />
        <div className="absolute -right-28 bottom-10 size-[460px] rounded-full border border-smart-teal/10" />
        <div className="relative mx-auto flex min-h-[520px] max-w-3xl flex-col items-center justify-center rounded-[2.5rem] border border-smart-abyss/10 bg-white/72 p-8 text-center shadow-[0_30px_90px_rgba(31,111,120,0.12)] sm:p-12">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-smart-gold/14 text-smart-gold">
            <CircleAlert aria-hidden="true" className="size-7" />
          </span>
          <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.2em] text-smart-teal">
            Un pas înainte de înscriere
          </p>
          <h1 className="mt-4 max-w-2xl font-serif text-5xl font-semibold leading-[0.94] sm:text-6xl">
            Alege mai întâi abonamentul potrivit.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-smart-ink/58">
            Înscrierea la centru pornește de la abonament, ca formularul și
            recomandarea echipei să țină cont de experiența pe care ai ales-o.
          </p>
          <Link
            className="group mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-smart-dark px-7 text-sm font-extrabold text-white shadow-[0_16px_38px_rgba(3,17,28,0.2)] transition duration-300 hover:bg-smart-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
            href="/#abonamente"
          >
            <ArrowLeft aria-hidden="true" className="size-4 transition-transform group-hover:-translate-x-1" />
            Vezi abonamentele
          </Link>
        </div>
      </section>
    );
  }

  const session = await getCurrentSmartMedSession();
  const prefill: CenterEnrollmentPrefill = {
    authenticated: Boolean(session),
    currentGrade:
      gradeFromContext(registrationContext.grade) ??
      gradeFromOnboarding(session?.onboarding.studyStage ?? null),
    email: session?.email ?? "",
    examYear:
      session?.profile.examYear ?? session?.onboarding.targetExamYear ?? "",
    fullName: session?.fullName ?? "",
    highSchool: session?.profile.school ?? "",
    localityCounty: session?.profile.city ?? "",
    phone: session?.profile.phone ?? "",
    subjects: [
      ...(session?.onboarding.focusSubjects.includes("biology")
        ? (["biology_corint"] as const)
        : []),
      ...(session?.onboarding.focusSubjects.includes("chemistry")
        ? (["organic_chemistry"] as const)
        : []),
    ],
    targetUniversity: universityFromOnboarding(
      session?.onboarding.targetMedicalCenter ?? null,
    ),
  };
  const referenceDate = bucharestDate(new Date());

  return (
    <section className="relative isolate overflow-hidden bg-smart-sand px-4 pb-28 pt-32 sm:px-6 sm:pt-36 lg:px-8 lg:pb-32 lg:pt-40">
      <div className="absolute -left-48 top-52 size-[500px] rounded-full bg-smart-aqua/20 blur-3xl" />
      <div className="absolute -right-48 bottom-20 size-[520px] rounded-full border border-smart-teal/10" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(180deg,transparent,rgba(156,206,208,0.18))]" />
      <div className="relative z-10">
        <h1 className="sr-only">Înscriere la Centrul SmartMed</h1>
        <DedicatedCenterEnrollment
          authenticated={Boolean(session)}
          basePrefill={prefill}
          plan={plan}
          referenceDate={referenceDate}
          registrationContext={registrationContext}
        />
      </div>
    </section>
  );
}
