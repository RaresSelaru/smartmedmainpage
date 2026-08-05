"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  CircleUserRound,
  Compass,
  GraduationCap,
  HeartHandshake,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { CenterEnrollmentPlan } from "@/lib/center-enrollments/plans";
import type { RegistrationContext } from "@/lib/registration-context";
import { cn } from "@/lib/utils";

import {
  CenterEnrollmentFlow,
  type CenterEnrollmentPrefill,
  type CenterEnrollmentSubject,
} from "./center-enrollment-flow";

type GuestStep = "direction" | "form" | "intro" | "preferences" | "stage";
type GuestGrade = NonNullable<CenterEnrollmentPrefill["currentGrade"]>;
type GuestMedicalCenter =
  | "exploring"
  | NonNullable<CenterEnrollmentPrefill["targetUniversity"]>;
type GuestFocus = "biology" | "chemistry" | "exploring";

type GuestAnswers = {
  accountRequested: boolean;
  currentGrade: GuestGrade | "";
  examYear: string;
  focus: GuestFocus[];
  targetUniversity: GuestMedicalCenter | "";
};

type DedicatedCenterEnrollmentProps = {
  authenticated: boolean;
  basePrefill: CenterEnrollmentPrefill;
  plan: CenterEnrollmentPlan;
  referenceDate: string;
  registrationContext: RegistrationContext;
};

const stageOptions: Array<{
  description: string;
  label: string;
  value: GuestGrade;
}> = [
  {
    description: "Construim baza fără grabă și fără goluri.",
    label: "Clasa a X-a",
    value: "grade_10",
  },
  {
    description: "E momentul potrivit pentru un ritm constant.",
    label: "Clasa a XI-a",
    value: "grade_11",
  },
  {
    description: "Ne concentrăm pe examen și pe claritate.",
    label: "Clasa a XII-a",
    value: "grade_12",
  },
  {
    description: "Revenim cu un plan mai bine calibrat.",
    label: "Am terminat liceul",
    value: "graduate",
  },
];

const universityOptions: Array<{ label: string; value: GuestMedicalCenter }> = [
  { label: "UMF București", value: "umf_bucharest" },
  { label: "UMF Brașov", value: "umf_brasov" },
  { label: "UMF Sibiu", value: "umf_sibiu" },
  { label: "UMF Cluj", value: "umf_cluj" },
  { label: "UMF Târgu Mureș", value: "umf_targu_mures" },
  { label: "UMF Iași", value: "umf_iasi" },
  { label: "UMF Craiova", value: "umf_craiova" },
  { label: "UMF Constanța", value: "umf_constanta" },
  { label: "UMF Timișoara", value: "umf_timisoara" },
  { label: "Alt centru universitar", value: "other" },
  { label: "Încă explorez", value: "exploring" },
];

const focusOptions: Array<{
  description: string;
  label: string;
  value: GuestFocus;
}> = [
  {
    description: "Anatomie, fiziologie și legături ușor de reținut.",
    label: "Biologie",
    value: "biology",
  },
  {
    description: "Mecanisme, reacții și aplicarea lor în grile.",
    label: "Chimie",
    value: "chemistry",
  },
  {
    description: "Este în regulă — clarificăm împreună în formular.",
    label: "Încă explorez",
    value: "exploring",
  },
];

function deriveExamYear(grade: GuestGrade | "", referenceDate: string) {
  const year = Number(referenceDate.slice(0, 4));
  if (grade === "grade_10") return String(year + 3);
  if (grade === "grade_11") return String(year + 2);
  return String(year + 1);
}

function planDefaults(
  plan: CenterEnrollmentPlan,
): Pick<
  CenterEnrollmentPrefill,
  "deliveryMode" | "preparationTypes"
> {
  if (plan.slug === "online-esential") {
    return { deliveryMode: "online", preparationTypes: ["courses"] };
  }
  if (plan.slug === "centru-plus") {
    return {
      deliveryMode: "in_person",
      preparationTypes: ["courses", "special_modules"],
    };
  }
  return { deliveryMode: null, preparationTypes: ["special_modules"] };
}

function subjectsFromFocus(focus: GuestFocus[]): CenterEnrollmentSubject[] {
  return [
    ...(focus.includes("biology")
      ? (["biology_corint"] as CenterEnrollmentSubject[])
      : []),
    ...(focus.includes("chemistry")
      ? (["organic_chemistry"] as CenterEnrollmentSubject[])
      : []),
  ];
}

function focusFromSubjects(
  subjects: CenterEnrollmentSubject[] | undefined,
): GuestFocus[] {
  if (!subjects?.length) return [];

  return [
    ...(subjects.some((subject) => subject.startsWith("biology_"))
      ? (["biology"] as GuestFocus[])
      : []),
    ...(subjects.includes("organic_chemistry")
      ? (["chemistry"] as GuestFocus[])
      : []),
  ];
}

function SelectionCard({
  active,
  description,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "relative min-h-[104px] rounded-[1.4rem] border p-4 text-left transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-teal",
        active
          ? "border-smart-teal bg-smart-aqua/12 shadow-[0_14px_38px_rgba(31,111,120,0.12)] ring-1 ring-inset ring-smart-teal/20"
          : "border-smart-abyss/10 bg-white/70 hover:-translate-y-0.5 hover:border-smart-teal/30 hover:bg-white",
      )}
      onClick={onClick}
      type="button"
    >
      <span className="block pr-9 text-sm font-extrabold text-smart-ink">
        {label}
      </span>
      <span className="mt-1.5 block text-xs leading-5 text-smart-ink/54">
        {description}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute right-4 top-4 flex size-6 items-center justify-center rounded-full border transition",
          active
            ? "border-smart-teal bg-smart-teal text-white"
            : "border-smart-abyss/14 bg-white text-transparent",
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    </button>
  );
}

export function DedicatedCenterEnrollment({
  authenticated,
  basePrefill,
  plan,
  referenceDate,
  registrationContext,
}: DedicatedCenterEnrollmentProps) {
  const [step, setStep] = useState<GuestStep>(authenticated ? "form" : "intro");
  const [message, setMessage] = useState("");
  const [answers, setAnswers] = useState<GuestAnswers>({
    accountRequested: false,
    currentGrade: basePrefill.currentGrade ?? "",
    examYear: basePrefill.examYear,
    focus: focusFromSubjects(basePrefill.subjects),
    targetUniversity: basePrefill.targetUniversity ?? "",
  });
  const currentYear = Number(referenceDate.slice(0, 4));
  const examYears = useMemo(
    () => Array.from({ length: 9 }, (_, index) => String(currentYear + index)),
    [currentYear],
  );
  const context: RegistrationContext = {
    flow: "centru",
    grade: registrationContext.grade,
    source: registrationContext.source ?? `plan-${plan.slug}`,
  };
  const prefill = useMemo<CenterEnrollmentPrefill>(
    () => ({
      ...basePrefill,
      ...planDefaults(plan),
      currentGrade:
        basePrefill.currentGrade || answers.currentGrade || null,
      examYear: basePrefill.examYear || answers.examYear,
      subjects:
        basePrefill.subjects?.length
          ? basePrefill.subjects
          : subjectsFromFocus(answers.focus),
      targetUniversity:
        basePrefill.targetUniversity ||
        (answers.targetUniversity && answers.targetUniversity !== "exploring"
          ? answers.targetUniversity
          : null),
    }),
    [answers, basePrefill, plan],
  );

  const updateGrade = (currentGrade: GuestGrade) => {
    setAnswers((current) => ({
      ...current,
      currentGrade,
      examYear: deriveExamYear(currentGrade, referenceDate),
    }));
    setMessage("");
  };

  const toggleFocus = (value: GuestFocus) => {
    setAnswers((current) => {
      if (value === "exploring") {
        return {
          ...current,
          focus: current.focus.includes("exploring") ? [] : ["exploring"],
        };
      }
      const withoutExploring = current.focus.filter(
        (item) => item !== "exploring",
      );
      return {
        ...current,
        focus: withoutExploring.includes(value)
          ? withoutExploring.filter((item) => item !== value)
          : [...withoutExploring, value],
      };
    });
    setMessage("");
  };

  const next = () => {
    if (step === "intro") {
      setStep("stage");
      return;
    }
    if (step === "stage") {
      if (!answers.currentGrade) {
        setMessage("Alege etapa în care ești acum.");
        return;
      }
      setStep("direction");
      return;
    }
    if (step === "direction") {
      if (!answers.targetUniversity || !answers.examYear) {
        setMessage("Alege direcția și anul în care vrei să dai admiterea.");
        return;
      }
      setStep("preferences");
      return;
    }
    if (step === "preferences") {
      if (!answers.focus.length) {
        setMessage("Alege materia care te interesează sau «Încă explorez».");
        return;
      }
      setStep("form");
    }
  };

  const back = () => {
    setMessage("");
    if (step === "stage") setStep("intro");
    if (step === "direction") setStep("stage");
    if (step === "preferences") setStep("direction");
  };

  if (step === "form") {
    return (
      <CenterEnrollmentFlow
        context={context}
        dedicated
        headline={{
          description:
            "Răspunsurile tale sunt deja aici. Mai completăm doar datele necesare pentru înscriere și revenim prin email.",
          eyebrow: plan.accent,
          title: authenticated
            ? "Continuăm cu datele tale SmartMed."
            : "Acum finalizăm înscrierea.",
        }}
        initialAccountRequested={answers.accountRequested}
        prefill={prefill}
        referenceDate={referenceDate}
        selectedPlan={plan}
      />
    );
  }

  const onboardingStep =
    step === "intro" ? 0 : step === "stage" ? 1 : step === "direction" ? 2 : 3;

  return (
    <div className="mx-auto w-full max-w-[1180px] overflow-hidden rounded-[2.35rem] border border-smart-abyss/10 bg-white/76 shadow-[0_30px_90px_rgba(31,111,120,0.14)]">
      <div className="grid min-h-[650px] lg:grid-cols-[0.72fr_1.28fr]">
        <aside className="relative overflow-hidden bg-[linear-gradient(155deg,#3697a1_0%,#287f89_52%,#206c76_100%)] px-7 py-9 text-white sm:px-10 lg:px-11 lg:py-12">
          <div className="absolute -left-28 top-28 size-80 rounded-full border border-white/12" />
          <div className="absolute -bottom-28 -right-24 size-80 rounded-full bg-smart-aqua/24 blur-3xl" />
          <div className="grain-overlay" />
          <div className="relative z-10 flex h-full flex-col">
            <span className="flex size-14 items-center justify-center rounded-2xl border border-white/22 bg-white/12">
              <HeartHandshake aria-hidden="true" className="size-6" />
            </span>
            <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.2em] text-smart-gold-light">
              Înscriere la Centrul SmartMed
            </p>
            <h1 className="mt-4 max-w-md font-serif text-5xl font-semibold leading-[0.94]">
              Un început clar, construit în jurul tău.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/72">
              SmartMed combină explicațiile medicilor, exercițiul ghidat și un
              ritm realist pentru admiterea la Medicină.
            </p>

            <div className="mt-8 rounded-[1.4rem] border border-white/18 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-smart-gold-light">
                Ai ales
              </p>
              <p className="mt-2 text-xl font-extrabold">{plan.label}</p>
              <p className="mt-2 text-xs leading-5 text-white/68">
                {plan.description}
              </p>
              <Link
                className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-white/76 transition hover:text-white"
                href="/#abonamente"
              >
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                Schimbă abonamentul
              </Link>
            </div>

            <div className="mt-auto hidden items-center gap-3 pt-8 text-xs font-semibold text-white/62 lg:flex">
              <LockKeyhole aria-hidden="true" className="size-4 text-smart-aqua" />
              Datele tale sunt folosite doar pentru înscriere.
            </div>
          </div>
        </aside>

        <section className="flex flex-col px-6 py-9 sm:px-10 sm:py-11 lg:px-14 lg:py-12">
          <div className="flex items-center justify-between gap-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-smart-teal">
              {step === "intro"
                ? "Bine ai venit"
                : `Ne cunoaștem · ${onboardingStep} din 3`}
            </p>
            {step !== "intro" ? (
              <span className="rounded-full border border-smart-teal/16 bg-smart-aqua/8 px-3 py-1.5 text-[0.68rem] font-extrabold text-smart-teal">
                Durează sub 1 minut
              </span>
            ) : null}
          </div>

          {step !== "intro" ? (
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-smart-abyss/8">
              <span
                className="block h-full rounded-full bg-[linear-gradient(90deg,#1f6f78,#9cced0)] transition-[width] duration-500"
                style={{ width: `${onboardingStep * 33.333}%` }}
              />
            </div>
          ) : null}

          <div className="flex flex-1 flex-col pt-7">
            {step === "intro" ? (
              <div className="my-auto">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-smart-aqua/12 text-smart-teal">
                  <Sparkles aria-hidden="true" className="size-6" />
                </span>
                <h2 className="mt-6 max-w-2xl font-serif text-5xl font-semibold leading-[0.94] sm:text-6xl">
                  Vrei să ne cunoaștem puțin?
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-8 text-smart-ink/60">
                  Înainte de formular, răspunzi la trei întrebări scurte. Le
                  folosim pentru a precompleta înscrierea și pentru ca echipa să
                  înțeleagă din prima ce ți se potrivește.
                </p>
                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: GraduationCap, label: "Etapa ta" },
                    { icon: Compass, label: "Direcția ta" },
                    { icon: BookOpenCheck, label: "Ce vrei să studiezi" },
                  ].map(({ icon: Icon, label }) => (
                    <span
                      className="flex items-center gap-3 rounded-2xl border border-smart-abyss/9 bg-smart-sand/45 px-4 py-3 text-xs font-bold text-smart-ink/68"
                      key={label}
                    >
                      <Icon aria-hidden="true" className="size-4 text-smart-teal" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {step === "stage" ? (
              <div>
                <h2 className="font-serif text-5xl font-semibold leading-none">
                  Unde ești acum?
                </h2>
                <p className="mt-3 text-sm leading-6 text-smart-ink/54">
                  Alegerea ne ajută să precompletăm anul admiterii.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {stageOptions.map((option) => (
                    <SelectionCard
                      active={answers.currentGrade === option.value}
                      description={option.description}
                      key={option.value}
                      label={option.label}
                      onClick={() => updateGrade(option.value)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {step === "direction" ? (
              <div>
                <h2 className="font-serif text-5xl font-semibold leading-none">
                  Spre ce destinație mergem?
                </h2>
                <p className="mt-3 text-sm leading-6 text-smart-ink/54">
                  Poți schimba oricând răspunsurile în formular.
                </p>
                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-extrabold text-smart-ink">
                    Centrul universitar
                    <select
                      className="min-h-14 rounded-2xl border border-smart-abyss/12 bg-white px-4 text-sm font-semibold outline-none transition focus:border-smart-teal focus:ring-4 focus:ring-smart-aqua/14"
                      onChange={(event) => {
                        setAnswers((current) => ({
                          ...current,
                          targetUniversity: event.target.value as GuestMedicalCenter,
                        }));
                        setMessage("");
                      }}
                      value={answers.targetUniversity}
                    >
                      <option value="">Alege destinația</option>
                      {universityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-extrabold text-smart-ink">
                    Anul admiterii
                    <select
                      className="min-h-14 rounded-2xl border border-smart-abyss/12 bg-white px-4 text-sm font-semibold outline-none transition focus:border-smart-teal focus:ring-4 focus:ring-smart-aqua/14"
                      onChange={(event) => {
                        setAnswers((current) => ({
                          ...current,
                          examYear: event.target.value,
                        }));
                        setMessage("");
                      }}
                      value={answers.examYear}
                    >
                      <option value="">Alege anul</option>
                      {examYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-6 rounded-2xl border border-smart-teal/14 bg-smart-aqua/8 p-5">
                  <p className="text-sm font-extrabold text-smart-ink">
                    Nu trebuie să ai totul hotărât acum.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-smart-ink/54">
                    Echipa SmartMed verifică răspunsurile și discută cu tine înainte
                    de stabilirea grupei.
                  </p>
                </div>
              </div>
            ) : null}

            {step === "preferences" ? (
              <div>
                <h2 className="font-serif text-5xl font-semibold leading-none">
                  Ce vrei să aprofundezi?
                </h2>
                <p className="mt-3 text-sm leading-6 text-smart-ink/54">
                  Poți alege una sau ambele materii.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {focusOptions.map((option) => (
                    <SelectionCard
                      active={answers.focus.includes(option.value)}
                      description={option.description}
                      key={option.value}
                      label={option.label}
                      onClick={() => toggleFocus(option.value)}
                    />
                  ))}
                </div>

                <button
                  aria-pressed={answers.accountRequested}
                  className={cn(
                    "mt-6 flex w-full items-start gap-4 rounded-[1.4rem] border p-5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-teal",
                    answers.accountRequested
                      ? "border-smart-teal bg-smart-aqua/11 ring-1 ring-inset ring-smart-teal/20"
                      : "border-smart-abyss/10 bg-white/68 hover:border-smart-teal/28 hover:bg-white",
                  )}
                  onClick={() =>
                    setAnswers((current) => ({
                      ...current,
                      accountRequested: !current.accountRequested,
                    }))
                  }
                  type="button"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-smart-teal text-white">
                    <CircleUserRound aria-hidden="true" className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-extrabold text-smart-ink">
                      Vreau să creez și un cont SmartMed
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-smart-ink/54">
                      Datele relevante vor rămâne precompletate. Parola o alegi în
                      siguranță după ce înscrierea este salvată.
                    </span>
                  </span>
                  <span
                    className={cn(
                      "ml-auto flex size-6 shrink-0 items-center justify-center rounded-full border",
                      answers.accountRequested
                        ? "border-smart-teal bg-smart-teal text-white"
                        : "border-smart-abyss/14 bg-white text-transparent",
                    )}
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                </button>
              </div>
            ) : null}

            <div className="mt-auto pt-7">
              {message ? (
                <p
                  aria-live="polite"
                  className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
                  role="status"
                >
                  {message}
                </p>
              ) : null}
              <div className="flex items-center justify-between gap-3 border-t border-smart-abyss/8 pt-5">
                {step !== "intro" ? (
                  <button
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-smart-abyss/10 bg-white px-5 text-sm font-bold text-smart-ink/60 transition hover:border-smart-teal/30 hover:text-smart-teal"
                    onClick={back}
                    type="button"
                  >
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    Înapoi
                  </button>
                ) : (
                  <span />
                )}
                <button
                  className="group inline-flex min-h-13 items-center justify-center gap-3 rounded-2xl bg-smart-dark px-7 text-sm font-extrabold text-white shadow-[0_16px_38px_rgba(3,17,28,0.2)] transition duration-300 hover:bg-smart-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-teal"
                  onClick={next}
                  type="button"
                >
                  {step === "intro" ? "Da, hai să începem" : "Continuă"}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-1"
                  />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
