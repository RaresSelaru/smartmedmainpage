"use client";

import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  ChevronLeft,
  Compass,
  GraduationCap,
  HeartPulse,
  MapPin,
  Sparkles,
  X,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  saveStudentOnboardingAction,
  type StudentOnboardingActionResult,
} from "@/lib/onboarding/actions";
import {
  STUDENT_ONBOARDING_TOTAL_STEPS,
  type FocusSubject,
  type PrimaryLearningGoal,
  type StudentOnboardingAnswers,
  type StudentOnboardingProfile,
  type StudyChallenge,
  type StudyStage,
  type TargetMedicalCenter,
} from "@/lib/onboarding/schema";
import { cn } from "@/lib/utils";

import styles from "./student-onboarding.module.css";

type StudentOnboardingFlowProps = {
  fullName: string;
  initialProfile: StudentOnboardingProfile;
  onClose: () => void;
  onUpdated: (
    profile: StudentOnboardingProfile,
    result: StudentOnboardingActionResult,
  ) => void;
  required?: boolean;
};

type Choice<T extends string> = {
  description: string;
  icon: ReactNode;
  label: string;
  value: T;
};

const stageChoices: Choice<StudyStage>[] = [
  {
    description: "Îți construiești fundația fără presiunea cronometrului.",
    icon: <BookOpen aria-hidden="true" className="size-5" />,
    label: "Clasa a IX-a / a X-a",
    value: "high_school_9_10",
  },
  {
    description: "Începi pregătirea concentrată pentru admitere.",
    icon: <GraduationCap aria-hidden="true" className="size-5" />,
    label: "Clasa a XI-a",
    value: "high_school_11",
  },
  {
    description: "E anul în care fiecare săptămână contează.",
    icon: <HeartPulse aria-hidden="true" className="size-5" />,
    label: "Clasa a XII-a",
    value: "high_school_12",
  },
  {
    description: "Te pregătești din nou, cu experiență și o strategie mai bună.",
    icon: <Sparkles aria-hidden="true" className="size-5" />,
    label: "An de pregătire / dau din nou",
    value: "graduate",
  },
  {
    description: "Încă îți clarifici traseul spre Medicină.",
    icon: <Compass aria-hidden="true" className="size-5" />,
    label: "Încă explorez",
    value: "exploring",
  },
];

const centerChoices: Choice<TargetMedicalCenter>[] = [
  ["bucharest", "București"],
  ["cluj", "Cluj-Napoca"],
  ["iasi", "Iași"],
  ["timisoara", "Timișoara"],
  ["targu_mures", "Târgu Mureș"],
  ["craiova", "Craiova"],
  ["other", "Alt centru"],
  ["exploring", "Încă explorez"],
].map(([value, label]) => ({
  description:
    value === "exploring"
      ? "E perfect în regulă — poți reveni oricând."
      : "Vom putea prioritiza informațiile relevante pentru centrul tău.",
  icon:
    value === "exploring" ? (
      <Compass aria-hidden="true" className="size-5" />
    ) : (
      <MapPin aria-hidden="true" className="size-5" />
    ),
  label,
  value: value as TargetMedicalCenter,
}));

const subjectChoices: Choice<FocusSubject>[] = [
  {
    description: "Anatomie, fiziologie și conexiuni care se țin minte.",
    icon: <HeartPulse aria-hidden="true" className="size-5" />,
    label: "Biologie / Anatomie",
    value: "biology",
  },
  {
    description: "De la reacții la logica din spatele problemelor.",
    icon: <Sparkles aria-hidden="true" className="size-5" />,
    label: "Chimie",
    value: "chemistry",
  },
  {
    description: "Concepte clare, formule puse în context.",
    icon: <Compass aria-hidden="true" className="size-5" />,
    label: "Fizică",
    value: "physics",
  },
  {
    description: "Te ajutăm să îți clarifici opțiunile.",
    icon: <BookOpen aria-hidden="true" className="size-5" />,
    label: "Încă nu m-am hotărât",
    value: "undecided",
  },
];

const challengeChoices: Choice<StudyChallenge>[] = [
  {
    description: "Am nevoie de o primă direcție clară.",
    icon: <Compass aria-hidden="true" className="size-5" />,
    label: "Nu știu de unde să încep",
    value: "starting",
  },
  {
    description: "Înțeleg pe moment, apoi informația se pierde.",
    icon: <Brain aria-hidden="true" className="size-5" />,
    label: "Înțeleg, dar uit repede",
    value: "retention",
  },
  {
    description: "Distractorii și nuanțele mă fac să ezit.",
    icon: <BookOpen aria-hidden="true" className="size-5" />,
    label: "Mă încurcă grilele-capcană",
    value: "trick_questions",
  },
  {
    description: "Îmi e greu să păstrez ritmul săptămână de săptămână.",
    icon: <HeartPulse aria-hidden="true" className="size-5" />,
    label: "Nu reușesc să fiu constant(ă)",
    value: "consistency",
  },
  {
    description: "Știu materia, dar timpul de examen mă presează.",
    icon: <CalendarDays aria-hidden="true" className="size-5" />,
    label: "Gestionarea timpului",
    value: "exam_time",
  },
  {
    description: "Vreau mai multă siguranță în ceea ce știu.",
    icon: <Sparkles aria-hidden="true" className="size-5" />,
    label: "Emoțiile și încrederea",
    value: "confidence",
  },
];

const goalChoices: Choice<PrimaryLearningGoal>[] = [
  {
    description: "Să știu exact ce fac azi, săptămâna aceasta și luna aceasta.",
    icon: <CalendarDays aria-hidden="true" className="size-5" />,
    label: "Un plan clar de învățare",
    value: "study_plan",
  },
  {
    description: "Să văd legăturile dintre idei, nu doar să le memorez.",
    icon: <Brain aria-hidden="true" className="size-5" />,
    label: "Explicații vizuale și conexiuni",
    value: "visual_explanations",
  },
  {
    description: "Să exersez și să înțeleg imediat unde greșesc.",
    icon: <BookOpen aria-hidden="true" className="size-5" />,
    label: "Grile și feedback",
    value: "questions_feedback",
  },
  {
    description: "Să mă antrenez în condiții apropiate de examen.",
    icon: <GraduationCap aria-hidden="true" className="size-5" />,
    label: "Simulări realiste",
    value: "realistic_simulations",
  },
  {
    description: "Să transform pregătirea într-un ritm pe care îl pot păstra.",
    icon: <HeartPulse aria-hidden="true" className="size-5" />,
    label: "Ritm și consecvență",
    value: "consistency",
  },
];

const subjectLabels: Record<FocusSubject, string> = {
  biology: "Biologie",
  chemistry: "Chimie",
  physics: "Fizică",
  undecided: "Materii în explorare",
};

const centerLabels: Record<TargetMedicalCenter, string> = {
  bucharest: "București",
  cluj: "Cluj-Napoca",
  craiova: "Craiova",
  exploring: "Centru în explorare",
  iasi: "Iași",
  other: "Alt centru",
  targu_mures: "Târgu Mureș",
  timisoara: "Timișoara",
};

function ChoiceCard<T extends string>({
  choice,
  multi,
  onSelect,
  selected,
}: {
  choice: Choice<T>;
  multi?: boolean;
  onSelect: (value: T) => void;
  selected: boolean;
}) {
  return (
    <button
      aria-pressed={selected}
      className={cn(
        styles.choice,
        "group relative flex min-h-[112px] w-full items-start gap-3 rounded-[22px] border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-teal",
        selected
          ? "border-smart-teal bg-smart-teal/[0.09] shadow-[0_12px_34px_rgba(31,111,120,0.12)]"
          : "border-smart-abyss/10 bg-white/66 hover:-translate-y-0.5 hover:border-smart-teal/28 hover:bg-white",
      )}
      onClick={() => onSelect(choice.value)}
      type="button"
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-2xl transition",
          selected
            ? "bg-smart-teal text-white"
            : "bg-smart-cream-deep text-smart-teal group-hover:bg-smart-teal/10",
        )}
      >
        {choice.icon}
      </span>
      <span className="min-w-0 pr-5">
        <span className="block text-sm font-extrabold leading-5 text-smart-ink">
          {choice.label}
        </span>
        <span className="mt-1.5 block text-xs leading-5 text-smart-ink/70">
          {choice.description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute right-3 top-3 flex size-6 items-center justify-center border transition",
          multi ? "rounded-lg" : "rounded-full",
          selected
            ? "border-smart-teal bg-smart-teal text-white"
            : "border-smart-abyss/14 bg-white/60 text-transparent",
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    </button>
  );
}

function getInitialStep(profile: StudentOnboardingProfile) {
  if (profile.status === "completed") {
    return 1;
  }

  return Math.min(
    Math.max(profile.currentStep || 1, 1),
    STUDENT_ONBOARDING_TOTAL_STEPS,
  );
}

export function StudentOnboardingFlow({
  fullName,
  initialProfile,
  onClose,
  onUpdated,
  required = false,
}: StudentOnboardingFlowProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(!required);
  const pendingRef = useRef(false);
  const [step, setStep] = useState(() => getInitialStep(initialProfile));
  const [answers, setAnswers] = useState<StudentOnboardingAnswers>({
    focusSubjects: initialProfile.focusSubjects,
    primaryLearningGoal: initialProfile.primaryLearningGoal,
    studyChallenges: initialProfile.studyChallenges,
    studyStage: initialProfile.studyStage,
    targetExamPlan: initialProfile.targetExamPlan,
    targetExamYear: initialProfile.targetExamYear,
    targetMedicalCenter: initialProfile.targetMedicalCenter,
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [finished, setFinished] = useState(false);
  const closeFlow = useCallback(() => {
    if (!pendingRef.current && dismissibleRef.current) {
      onCloseRef.current();
    }
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    dismissibleRef.current = !required || finished;
  }, [finished, required]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => titleRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeFlow();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      const activeElement = document.activeElement;

      if (!first || !last) {
        return;
      }

      if (
        event.shiftKey &&
        (activeElement === first ||
          activeElement === titleRef.current ||
          !dialogRef.current.contains(activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (activeElement === last || !dialogRef.current.contains(activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      const previousFocus = previousFocusRef.current;

      window.requestAnimationFrame(() => {
        const persistentFallback =
          document.querySelector<HTMLElement>(
            "[data-student-onboarding-trigger='true']",
          ) ?? document.querySelector<HTMLElement>("a[href='/cont']");

        if (previousFocus?.isConnected) {
          previousFocus.focus();
        } else {
          persistentFallback?.focus();
        }
      });
    };
  }, [closeFlow]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }

    titleRef.current?.focus();
  }, [finished, step]);

  const currentYear = new Date().getFullYear();
  const admissionYears = useMemo(() => {
    const dynamicYears = [
      currentYear + 1,
      currentYear + 2,
      currentYear + 3,
      currentYear + 4,
    ]
      .filter((year) => year <= 2045)
      .map(String);

    if (
      answers.targetExamYear &&
      !dynamicYears.includes(answers.targetExamYear)
    ) {
      return [answers.targetExamYear, ...dynamicYears].sort();
    }

    return dynamicYears;
  }, [answers.targetExamYear, currentYear]);

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return Boolean(answers.studyStage);
      case 2:
        return Boolean(
          answers.targetExamPlan &&
            (answers.targetExamPlan !== "scheduled" ||
              answers.targetExamYear),
        );
      case 3:
        return Boolean(answers.targetMedicalCenter);
      case 4:
        return answers.focusSubjects.length > 0;
      case 5:
        return answers.studyChallenges.length > 0;
      case 6:
        return Boolean(answers.primaryLearningGoal);
      default:
        return false;
    }
  }, [answers, step]);

  const selectExam = (value: string) => {
    setMessage("");

    if (value.startsWith("year:")) {
      setAnswers((current) => ({
        ...current,
        targetExamPlan: "scheduled",
        targetExamYear: value.slice(5),
      }));
      return;
    }

    setAnswers((current) => ({
      ...current,
      targetExamPlan: value === "later" ? "later" : "exploring",
      targetExamYear: null,
    }));
  };

  const toggleSubject = (subject: FocusSubject) => {
    setMessage("");
    setAnswers((current) => {
      if (subject === "undecided") {
        return {
          ...current,
          focusSubjects: current.focusSubjects.includes("undecided")
            ? []
            : ["undecided"],
        };
      }

      const withoutUndecided = current.focusSubjects.filter(
        (item) => item !== "undecided",
      );
      const selected = withoutUndecided.includes(subject);

      return {
        ...current,
        focusSubjects: selected
          ? withoutUndecided.filter((item) => item !== subject)
          : [...withoutUndecided, subject],
      };
    });
  };

  const toggleChallenge = (challenge: StudyChallenge) => {
    setMessage("");
    setAnswers((current) => {
      const selected = current.studyChallenges.includes(challenge);

      if (!selected && current.studyChallenges.length >= 2) {
        setMessage("Alege maximum două — cele care îți influențează cel mai mult ritmul.");
        return current;
      }

      return {
        ...current,
        studyChallenges: selected
          ? current.studyChallenges.filter((item) => item !== challenge)
          : [...current.studyChallenges, challenge],
      };
    });
  };

  const handleContinue = async () => {
    if (!canContinue || pending) {
      return;
    }

    setPending(true);
    setMessage("");
    const complete = step === STUDENT_ONBOARDING_TOTAL_STEPS;
    const result = await saveStudentOnboardingAction({
      answers,
      complete,
      currentStep: step,
    });
    setPending(false);

    if (result.status === "error" || !result.profile) {
      setMessage(result.message);
      return;
    }

    onUpdated(result.profile, result);

    if (complete) {
      setFinished(true);
      return;
    }

    setStep((current) =>
      Math.min(current + 1, STUDENT_ONBOARDING_TOTAL_STEPS),
    );
  };

  const firstName = fullName.trim().split(/\s+/)[0] || "viitor medic";
  const progress = ((step - 1) / (STUDENT_ONBOARDING_TOTAL_STEPS - 1)) * 100;
  const targetSummary =
    answers.targetExamPlan === "scheduled" && answers.targetExamYear
      ? `Admitere ${answers.targetExamYear}`
      : answers.targetExamPlan === "later"
        ? "Admitere mai târziu"
        : "Țintă în explorare";

  const questionHeading = {
    1: ["Punctul de plecare", "Unde ești acum în parcurs?"],
    2: ["Ținta", "Când vrei să dai admiterea?"],
    3: ["Destinația", "Ce centru universitar ai în minte?"],
    4: ["Materiile", "Din ce materii te pregătești?"],
    5: ["Hopul actual", "Ce te încetinește cel mai mult acum?"],
    6: ["Prima prioritate", "Cu ce vrei să te ajute SmartMed mai întâi?"],
  }[step] ?? ["Profil de studiu", "Hai să ne cunoaștem"];

  return (
    <div
      className={`${styles.backdrop} fixed inset-0 z-[120] flex items-end justify-center bg-black/72 p-0 backdrop-blur-lg sm:items-center sm:p-5`}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          closeFlow();
        }
      }}
    >
      <div
        aria-describedby="student-onboarding-description"
        aria-labelledby="student-onboarding-title"
        aria-modal="true"
        className={`${styles.dialog} grid w-full max-w-[1120px] overflow-hidden rounded-t-[34px] border border-white/12 bg-smart-cream text-smart-ink shadow-[0_38px_140px_rgba(0,0,0,0.58)] sm:rounded-[38px] lg:grid-cols-[0.36fr_0.64fr]`}
        data-student-onboarding-dialog="true"
        ref={dialogRef}
        role="dialog"
      >
        <aside className="relative hidden min-h-0 overflow-hidden bg-smart-abyss p-8 text-smart-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute -left-28 top-20 size-72 rounded-full border border-smart-aqua/12" />
          <div className="pointer-events-none absolute -bottom-28 -right-20 size-80 rounded-full border border-smart-gold/16" />
          <div className="pointer-events-none absolute right-0 top-1/3 size-52 rounded-full bg-smart-teal/16 blur-3xl" />
          <div className="relative">
            <span className="flex size-13 items-center justify-center rounded-[20px] bg-smart-aqua/12 text-smart-aqua ring-1 ring-smart-aqua/24">
              <HeartPulse aria-hidden="true" className="size-7" />
            </span>
            <p className="mt-7 text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-smart-gold-light">
              Profilul tău de studiu
            </p>
            <h2 className="mt-3 font-serif text-5xl font-semibold leading-[0.92]">
              Mai puțin formular.
              <br />
              Mai mult „tu”.
            </h2>
            <p
              className="mt-5 text-sm leading-7 text-smart-white/76"
            >
              {initialProfile.source === "center_enrollment"
                ? "Am precompletat ce știm deja din înscriere. Mai sunt șase alegeri scurte, ca SmartMed să pornească exact de unde ești."
                : "Șase alegeri scurte completează profilul tău și fac experiența SmartMed mai relevantă pentru drumul tău. Le poți schimba oricând."}
            </p>
          </div>
          <div className={`${styles.sideQuote} relative rounded-[24px] border border-white/10 bg-white/[0.045] p-5`}>
            <Sparkles aria-hidden="true" className="size-5 text-smart-aqua" />
            <p className="mt-3 font-serif text-2xl font-semibold leading-tight">
              „Nu trebuie să ai totul clar ca să începi.”
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-smart-white/68">
              SmartMed Academy
            </p>
          </div>
        </aside>

        <section className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-[radial-gradient(circle_at_100%_0%,rgba(31,111,120,0.10),transparent_32%),linear-gradient(180deg,#fbf7ef_0%,#f4ecdf_100%)]">
          <p className="sr-only" id="student-onboarding-description">
            Șase alegeri scurte completează profilul de studiu SmartMed.
            {required ? " Profilul trebuie finalizat pentru a continua." : ""}
          </p>
          <header className="relative z-10 shrink-0 border-b border-smart-abyss/8 bg-smart-cream/84 px-5 py-5 backdrop-blur-xl sm:px-8">
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-smart-teal">
                  <HeartPulse aria-hidden="true" className="size-4 lg:hidden" />
                  {finished
                    ? "Profil complet"
                    : `Pasul ${step} din ${STUDENT_ONBOARDING_TOTAL_STEPS}`}
                </div>
                <h2
                  className="mt-2 font-serif text-3xl font-semibold leading-none outline-none sm:text-4xl"
                  id="student-onboarding-title"
                  ref={titleRef}
                  tabIndex={-1}
                >
                  {finished ? `Perfect, ${firstName}.` : questionHeading[1]}
                </h2>
              </div>
              {!required || finished ? (
                <button
                  aria-label="Închide profilul de studiu"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border border-smart-abyss/10 bg-white/72 text-smart-ink/72 transition hover:border-smart-teal/28 hover:text-smart-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-teal disabled:opacity-50"
                  disabled={pending}
                  onClick={closeFlow}
                  type="button"
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
              ) : (
                <span className="rounded-full border border-smart-teal/16 bg-smart-teal/8 px-3 py-2 text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-smart-teal">
                  Profil necesar
                </span>
              )}
            </div>

            {!finished ? (
              <div className="mt-5">
                <div
                  aria-label="Progresul profilului de studiu"
                  aria-valuemax={STUDENT_ONBOARDING_TOTAL_STEPS}
                  aria-valuemin={1}
                  aria-valuenow={step}
                  aria-valuetext={`Pasul ${step} din ${STUDENT_ONBOARDING_TOTAL_STEPS}`}
                  className={styles.progressTrack}
                  role="progressbar"
                >
                  <span
                    className={styles.progressFill}
                    style={{ width: `${progress}%` }}
                  />
                  {Array.from(
                    { length: STUDENT_ONBOARDING_TOTAL_STEPS },
                    (_, index) => (
                      <span
                        aria-hidden="true"
                        className={cn(
                          styles.progressDot,
                          index + 1 <= step && styles.progressDotActive,
                        )}
                        key={index}
                        style={{
                          left: `${(index / (STUDENT_ONBOARDING_TOTAL_STEPS - 1)) * 100}%`,
                        }}
                      />
                    ),
                  )}
                </div>
              </div>
            ) : null}
          </header>

          <div
            className={`${styles.contentScroller} min-h-0 overflow-y-auto px-5 py-6 sm:px-8 sm:py-7`}
            ref={contentRef}
          >
            {finished ? (
              <div className="mx-auto flex min-h-[420px] max-w-xl flex-col items-center justify-center text-center">
                <span className={`${styles.successPulse} flex size-20 items-center justify-center rounded-full bg-smart-teal text-white shadow-[0_24px_60px_rgba(31,111,120,0.28)]`}>
                  <Check aria-hidden="true" className="size-9" strokeWidth={2.5} />
                </span>
                <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.2em] text-smart-teal">
                  Știm de unde pornim
                </p>
                <h3 className="mt-3 font-serif text-5xl font-semibold leading-[0.94]">
                  SmartMed e acum puțin mai aproape de tine.
                </h3>
                <p className="mt-5 max-w-lg text-sm leading-7 text-smart-ink/72">
                  Răspunsurile rămân în contul tău și le poți actualiza oricând
                  din pagina de profil.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <span className="rounded-full bg-smart-teal/10 px-4 py-2 text-xs font-extrabold text-smart-teal">
                    {targetSummary}
                  </span>
                  {answers.targetMedicalCenter ? (
                    <span className="rounded-full bg-smart-gold/14 px-4 py-2 text-xs font-extrabold text-smart-ink/68">
                      {centerLabels[answers.targetMedicalCenter]}
                    </span>
                  ) : null}
                  {answers.focusSubjects.map((subject) => (
                    <span
                      className="rounded-full bg-white/72 px-4 py-2 text-xs font-extrabold text-smart-ink/64 ring-1 ring-smart-abyss/8"
                      key={subject}
                    >
                      {subjectLabels[subject]}
                    </span>
                  ))}
                </div>
                <button
                  className="mt-8 inline-flex min-h-13 items-center gap-2 rounded-full bg-smart-teal px-7 py-3 text-sm font-extrabold text-white shadow-[0_18px_44px_rgba(31,111,120,0.24)] transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
                  onClick={onClose}
                  type="button"
                >
                  Continuă pe SmartMed
                  <ArrowRight aria-hidden="true" className="size-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-smart-gold">
                    {questionHeading[0]}
                  </p>
                  <p
                    className="mt-2 text-sm leading-6 text-smart-ink/68"
                    id="student-onboarding-step-help"
                  >
                    {step === 4
                      ? "Poți selecta mai multe materii."
                      : step === 5
                        ? "Alege maximum două variante."
                        : "Alege varianta care ți se potrivește cel mai bine acum."}
                  </p>
                </div>

                <div
                  aria-describedby="student-onboarding-step-help"
                  aria-labelledby="student-onboarding-title"
                  className="grid gap-3 sm:grid-cols-2"
                  role="group"
                >
                  {step === 1
                    ? stageChoices.map((choice) => (
                        <ChoiceCard
                          choice={choice}
                          key={choice.value}
                          onSelect={(value) => {
                            setMessage("");
                            setAnswers((current) => ({
                              ...current,
                              studyStage: value,
                            }));
                          }}
                          selected={answers.studyStage === choice.value}
                        />
                      ))
                    : null}

                  {step === 2
                    ? [
                        ...admissionYears.map((year) => ({
                          description: "Ținta este clară; o putem pune într-un plan realist.",
                          icon: <CalendarDays aria-hidden="true" className="size-5" />,
                          label: `Admitere ${year}`,
                          value: `year:${year}`,
                        })),
                        {
                          description: "Știi direcția, dar nu vrei să fixezi anul încă.",
                          icon: <GraduationCap aria-hidden="true" className="size-5" />,
                          label: "Mai târziu",
                          value: "later",
                        },
                        {
                          description: "Îți lași spațiu să descoperi ce ți se potrivește.",
                          icon: <Compass aria-hidden="true" className="size-5" />,
                          label: "Încă explorez",
                          value: "exploring",
                        },
                      ].map((choice) => (
                        <ChoiceCard
                          choice={choice}
                          key={choice.value}
                          onSelect={selectExam}
                          selected={
                            choice.value.startsWith("year:")
                              ? answers.targetExamPlan === "scheduled" &&
                                answers.targetExamYear === choice.value.slice(5)
                              : answers.targetExamPlan === choice.value
                          }
                        />
                      ))
                    : null}

                  {step === 3
                    ? centerChoices.map((choice) => (
                        <ChoiceCard
                          choice={choice}
                          key={choice.value}
                          onSelect={(value) => {
                            setMessage("");
                            setAnswers((current) => ({
                              ...current,
                              targetMedicalCenter: value,
                            }));
                          }}
                          selected={
                            answers.targetMedicalCenter === choice.value
                          }
                        />
                      ))
                    : null}

                  {step === 4
                    ? subjectChoices.map((choice) => (
                        <ChoiceCard
                          choice={choice}
                          key={choice.value}
                          multi
                          onSelect={toggleSubject}
                          selected={answers.focusSubjects.includes(choice.value)}
                        />
                      ))
                    : null}

                  {step === 5
                    ? challengeChoices.map((choice) => (
                        <ChoiceCard
                          choice={choice}
                          key={choice.value}
                          multi
                          onSelect={toggleChallenge}
                          selected={answers.studyChallenges.includes(choice.value)}
                        />
                      ))
                    : null}

                  {step === 6
                    ? goalChoices.map((choice) => (
                        <ChoiceCard
                          choice={choice}
                          key={choice.value}
                          onSelect={(value) => {
                            setMessage("");
                            setAnswers((current) => ({
                              ...current,
                              primaryLearningGoal: value,
                            }));
                          }}
                          selected={
                            answers.primaryLearningGoal === choice.value
                          }
                        />
                      ))
                    : null}
                </div>

                <p
                  aria-live={message ? "assertive" : "polite"}
                  className={cn(
                    "mt-4 min-h-5 text-xs font-bold",
                    message ? "text-red-700" : "text-smart-ink/62",
                  )}
                  role={message ? "alert" : "status"}
                >
                  {message || "Progresul se salvează după fiecare pas."}
                </p>
              </>
            )}
          </div>

          {!finished ? (
            <footer className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-t border-smart-abyss/8 bg-smart-cream/92 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-16px_36px_rgba(3,17,28,0.05)] backdrop-blur-xl sm:px-8">
              <button
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-smart-ink/70 transition hover:text-smart-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-teal disabled:cursor-not-allowed disabled:opacity-40"
                disabled={step === 1 || pending}
                onClick={() => {
                  setMessage("");
                  setStep((current) => Math.max(1, current - 1));
                }}
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                Înapoi
              </button>
              <button
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-smart-teal px-6 py-3 text-sm font-extrabold text-white shadow-[0_16px_38px_rgba(31,111,120,0.22)] transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-teal disabled:cursor-not-allowed disabled:opacity-42 disabled:hover:translate-y-0"
                disabled={!canContinue || pending}
                onClick={() => void handleContinue()}
                type="button"
              >
                {pending
                  ? "Se salvează…"
                  : step === STUDENT_ONBOARDING_TOTAL_STEPS
                    ? initialProfile.status === "completed"
                      ? "Salvează preferințele"
                      : "Finalizează profilul"
                    : "Continuă"}
                {!pending ? (
                  <ArrowRight aria-hidden="true" className="size-4" />
                ) : null}
              </button>
            </footer>
          ) : null}
        </section>
      </div>
    </div>
  );
}
