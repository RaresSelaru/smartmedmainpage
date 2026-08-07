"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleUserRound,
  GraduationCap,
  HeartHandshake,
  LoaderCircle,
  MailCheck,
  MapPin,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  createCenterEnrollmentAccountAction,
  saveCenterEnrollmentPreferencesAction,
  submitCenterEnrollmentAction,
} from "@/app/inscriere/actions";
import type { CenterEnrollmentPlan } from "@/lib/center-enrollments/plans";
import type { RegistrationContext } from "@/lib/registration-context";
import { cn } from "@/lib/utils";

import styles from "./center-enrollment-flow.module.css";

type CurrentGrade = "grade_10" | "grade_11" | "grade_12" | "graduate";
export type CenterEnrollmentDeliveryMode = "in_person" | "online";
type Level = "advanced" | "beginner" | "intermediate" | "mastery";
export type CenterEnrollmentPreparationType = "courses" | "special_modules";
export type CenterEnrollmentSubject =
  | "biology_barrons"
  | "biology_corint"
  | "organic_chemistry";
type TargetUniversity =
  | "other"
  | "umf_brasov"
  | "umf_bucharest"
  | "umf_cluj"
  | "umf_constanta"
  | "umf_craiova"
  | "umf_iasi"
  | "umf_sibiu"
  | "umf_targu_mures"
  | "umf_timisoara";

export type CenterEnrollmentPrefill = {
  authenticated: boolean;
  currentGrade: CurrentGrade | null;
  deliveryMode?: CenterEnrollmentDeliveryMode | null;
  email: string;
  examYear: string;
  fullName: string;
  highSchool: string;
  localityCounty: string;
  phone: string;
  preparationTypes?: CenterEnrollmentPreparationType[];
  subjects?: CenterEnrollmentSubject[];
  targetUniversity: TargetUniversity | null;
};

type CenterEnrollmentFlowProps = {
  context: RegistrationContext;
  dedicated?: boolean;
  headline: {
    description: string;
    eyebrow: string;
    title: string;
  };
  initialAccountRequested?: boolean;
  prefill: CenterEnrollmentPrefill;
  referenceDate: string;
  selectedPlan: CenterEnrollmentPlan;
};

type FormState = {
  biologyLevel: Level | "";
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  chemistryLevel: Level | "";
  city: string;
  county: string;
  currentGrade: CurrentGrade | "";
  deliveryMode: CenterEnrollmentDeliveryMode | "";
  email: string;
  examYear: string;
  firstName: string;
  guardianEmail: string;
  guardianName: string;
  guardianPhone: string;
  highSchool: string;
  lastName: string;
  phone: string;
  preparationTypes: CenterEnrollmentPreparationType[];
  previousTutoring: boolean | null;
  privacyAccepted: boolean;
  studyProfile: string;
  subjects: CenterEnrollmentSubject[];
  targetUniversity: TargetUniversity | "";
  targetUniversityOther: string;
  whatsappOptIn: boolean | null;
  website: string;
};

type FieldErrors = Record<string, string[]>;

const steps = [
  {
    description: "Datele de contact și, doar dacă este cazul, tutorele.",
    icon: CircleUserRound,
    label: "Despre tine",
  },
  {
    description: "Clasa, facultatea vizată și momentul admiterii.",
    icon: GraduationCap,
    label: "Direcția ta",
  },
  {
    description: "Materiile, nivelul și formatul care ți se potrivesc.",
    icon: BookOpenCheck,
    label: "Pregătirea",
  },
  {
    description: "Ultimele preferințe și acordul pentru înscriere.",
    icon: ShieldCheck,
    label: "Confirmare",
  },
] as const;

const gradeOptions: Array<{ label: string; value: CurrentGrade }> = [
  { label: "Clasa a X-a", value: "grade_10" },
  { label: "Clasa a XI-a", value: "grade_11" },
  { label: "Clasa a XII-a", value: "grade_12" },
  { label: "Am terminat liceul", value: "graduate" },
];

const universityOptions: Array<{ label: string; value: TargetUniversity }> = [
  { label: "UMF București", value: "umf_bucharest" },
  { label: "UMF Brașov", value: "umf_brasov" },
  { label: "UMF Sibiu", value: "umf_sibiu" },
  { label: "UMF Cluj", value: "umf_cluj" },
  { label: "UMF Târgu Mureș", value: "umf_targu_mures" },
  { label: "UMF Iași", value: "umf_iasi" },
  { label: "UMF Craiova", value: "umf_craiova" },
  { label: "UMF Constanța", value: "umf_constanta" },
  { label: "UMF Timișoara", value: "umf_timisoara" },
  { label: "Altă facultate", value: "other" },
];

const subjectOptions: Array<{
  description: string;
  label: string;
  value: CenterEnrollmentSubject;
}> = [
  {
    description: "Programa și grilele din manualul Corint.",
    label: "Biologie Corint",
    value: "biology_corint",
  },
  {
    description: "Pregătire construită pe Barron’s.",
    label: "Biologie Barron’s",
    value: "biology_barrons",
  },
  {
    description: "Mecanisme, reacții și aplicare în grile.",
    label: "Chimie organică",
    value: "organic_chemistry",
  },
];

const levelOptions: Array<{ label: string; value: Level }> = [
  { label: "Începător · fără testare", value: "beginner" },
  { label: "Intermediar", value: "intermediate" },
  { label: "Avansat", value: "advanced" },
  { label: "Perfecționare", value: "mastery" },
];

const monthOptions = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
] as const;

const countyOptions = [
  "Alba",
  "Arad",
  "Argeș",
  "Bacău",
  "Bihor",
  "Bistrița-Năsăud",
  "Botoșani",
  "Brașov",
  "Brăila",
  "București",
  "Buzău",
  "Caraș-Severin",
  "Călărași",
  "Cluj",
  "Constanța",
  "Covasna",
  "Dâmbovița",
  "Dolj",
  "Galați",
  "Giurgiu",
  "Gorj",
  "Harghita",
  "Hunedoara",
  "Ialomița",
  "Iași",
  "Ilfov",
  "Maramureș",
  "Mehedinți",
  "Mureș",
  "Neamț",
  "Olt",
  "Prahova",
  "Sălaj",
  "Satu Mare",
  "Sibiu",
  "Suceava",
  "Teleorman",
  "Timiș",
  "Tulcea",
  "Vaslui",
  "Vâlcea",
  "Vrancea",
  "Altul / în afara țării",
] as const;

const inputClassName = cn(
  styles.formControl,
  "min-h-11 w-full rounded-2xl border border-smart-abyss/13 bg-white/88 px-4 text-[0.9rem] text-smart-ink outline-none transition placeholder:text-smart-ink/32 focus:border-smart-teal focus:bg-white focus:ring-4 focus:ring-smart-aqua/15 lg:min-h-12",
);

function splitFullName(value: string) {
  const names = value.trim().split(/\s+/u).filter(Boolean);
  return {
    firstName: names.shift() ?? "",
    lastName: names.join(" "),
  };
}

function splitLocalityCounty(value: string) {
  const [city = "", ...countyParts] = value.split(",");
  return {
    city: city.trim(),
    county: countyParts.join(",").trim(),
  };
}

function birthDateFromParts(day: string, month: string, year: string) {
  if (!day || !month || !year) return "";
  const numericDay = Number(day);
  const numericMonth = Number(month);
  const numericYear = Number(year);
  const date = new Date(Date.UTC(numericYear, numericMonth - 1, numericDay));

  if (
    date.getUTCFullYear() !== numericYear ||
    date.getUTCMonth() !== numericMonth - 1 ||
    date.getUTCDate() !== numericDay
  ) {
    return "";
  }

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function daysInMonth(month: string, year: string) {
  if (!month) return 31;
  const numericYear = Number(year) || 2000;
  return new Date(Date.UTC(numericYear, Number(month), 0)).getUTCDate();
}

function gradeFromContext(grade: RegistrationContext["grade"]): CurrentGrade | "" {
  if (grade === "10") return "grade_10";
  if (grade === "11") return "grade_11";
  if (grade === "12") return "grade_12";
  return "";
}

function deriveExamYear(
  grade: CurrentGrade | "",
  referenceDate: string,
): string {
  const currentYear = Number(referenceDate.slice(0, 4));

  if (grade === "grade_10") return String(currentYear + 3);
  if (grade === "grade_11") return String(currentYear + 2);
  if (grade === "grade_12") return String(currentYear + 1);
  return String(currentYear + 1);
}

function isMinorOnDate(birthDate: string, referenceDate: string) {
  const birth = birthDate.split("-").map(Number);
  const reference = referenceDate.split("-").map(Number);

  if (birth.length !== 3 || reference.length !== 3 || birth.some(Number.isNaN)) {
    return false;
  }

  const [birthYear, birthMonth, birthDay] = birth;
  const [referenceYear, referenceMonth, referenceDay] = reference;
  let age = referenceYear - birthYear;

  if (
    referenceMonth < birthMonth ||
    (referenceMonth === birthMonth && referenceDay < birthDay)
  ) {
    age -= 1;
  }

  return age < 18;
}

function hasBiology(subjects: CenterEnrollmentSubject[]) {
  return subjects.includes("biology_corint") || subjects.includes("biology_barrons");
}

function toggleArrayValue<T extends string>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

function firstError(errors: FieldErrors, field: string) {
  return errors[field]?.[0];
}

function ErrorSlot({ error, id }: { error?: string; id?: string }) {
  return (
    <span
      aria-hidden={!error}
      aria-live="polite"
      className={cn(
        styles.errorSlot,
        "block min-h-4 text-[0.68rem] font-semibold leading-4",
        error ? "text-red-700" : "text-transparent",
      )}
      id={id}
    >
      {error ?? "\u00A0"}
    </span>
  );
}

function Field({
  children,
  error,
  htmlFor,
  label,
  optional,
}: {
  children: ReactNode;
  error?: string;
  htmlFor: string;
  label: string;
  optional?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-smart-ink" htmlFor={htmlFor}>
      <span className={styles.fieldLabel}>
        {label}
        {optional ? (
          <span className="ml-2 text-xs font-medium text-smart-ink/42">opțional</span>
        ) : null}
      </span>
      {children}
      <ErrorSlot error={error} id={`${htmlFor}-error`} />
    </label>
  );
}

function ChoiceButton({
  active,
  brandIcon = false,
  compact = false,
  description,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  brandIcon?: boolean;
  compact?: boolean;
  description?: string;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        styles.choiceButton,
        "group relative flex items-center gap-3 rounded-2xl border px-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-smart-teal",
        compact ? "min-h-[54px] py-1.5" : "min-h-[68px] py-2.5",
        active
          ? "border-smart-teal bg-smart-aqua/12 shadow-[0_12px_28px_rgba(31,111,120,0.1)] ring-1 ring-inset ring-smart-teal/30"
          : "border-smart-abyss/10 bg-white/66 hover:-translate-y-0.5 hover:border-smart-teal/35 hover:bg-white",
      )}
      onClick={onClick}
      type="button"
    >
      {icon ? (
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl transition",
            brandIcon
              ? "bg-[#25D366]/12"
              : active
                ? "bg-smart-teal text-white"
                : "bg-smart-gold/13 text-smart-gold",
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="block text-sm font-extrabold text-smart-ink">{label}</span>
        {description && !compact ? (
          <span className={cn(styles.choiceDescription, "mt-1 block text-xs leading-5 text-smart-ink/52")}>
            {description}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "ml-auto flex size-6 shrink-0 items-center justify-center rounded-full border transition",
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

export function CenterEnrollmentFlow({
  context,
  dedicated = false,
  headline,
  initialAccountRequested = false,
  prefill,
  referenceDate,
  selectedPlan,
}: CenterEnrollmentFlowProps) {
  const contextualGrade = gradeFromContext(context.grade);
  const plansHref = context.grade
    ? "/inscriere/clasa-a-" +
      context.grade +
      "-a" +
      (context.source ? "?source=" + encodeURIComponent(context.source) : "") +
      "#abonamente"
    : "/inscriere";
  const initialGrade = prefill.currentGrade ?? contextualGrade;
  const initialName = splitFullName(prefill.fullName);
  const initialLocation = splitLocalityCounty(prefill.localityCounty);
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<null | {
    emailMessage: string;
    emailState: string;
    expiresAt: string;
    followUpToken: string;
  }>(null);
  const [accountRequested, setAccountRequested] = useState(
    initialAccountRequested && !prefill.authenticated,
  );
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [conversionComplete, setConversionComplete] = useState(false);
  const [conversionNextPath, setConversionNextPath] = useState("/cont");
  const idempotencyKeyRef = useRef("");
  const [form, setForm] = useState<FormState>(() => ({
    biologyLevel: "",
    birthDay: "",
    birthMonth: "",
    birthYear: "",
    chemistryLevel: "",
    city: initialLocation.city,
    county: initialLocation.county,
    currentGrade: initialGrade,
    deliveryMode: prefill.deliveryMode ?? "",
    email: prefill.email,
    examYear:
      prefill.examYear || deriveExamYear(initialGrade, referenceDate),
    firstName: initialName.firstName,
    guardianEmail: "",
    guardianName: "",
    guardianPhone: "",
    highSchool: prefill.highSchool,
    lastName: initialName.lastName,
    phone: prefill.phone,
    preparationTypes: prefill.preparationTypes ?? [],
    previousTutoring: null,
    privacyAccepted: false,
    studyProfile: "",
    subjects: prefill.subjects ?? [],
    targetUniversity: prefill.targetUniversity ?? "",
    targetUniversityOther: "",
    whatsappOptIn: null,
    website: "",
  }));
  const birthDate = birthDateFromParts(
    form.birthDay,
    form.birthMonth,
    form.birthYear,
  );
  const isMinor = isMinorOnDate(birthDate, referenceDate);
  const biologySelected = hasBiology(form.subjects);
  const chemistrySelected = form.subjects.includes("organic_chemistry");
  const currentYear = Number(referenceDate.slice(0, 4));
  const examYears = useMemo(
    () => Array.from({ length: 9 }, (_, index) => String(currentYear + index)),
    [currentYear],
  );
  const birthYears = useMemo(
    () => Array.from({ length: currentYear - 1899 }, (_, index) => String(currentYear - index)),
    [currentYear],
  );
  const birthDays = useMemo(
    () =>
      Array.from(
        { length: daysInMonth(form.birthMonth, form.birthYear) },
        (_, index) => String(index + 1),
      ),
    [form.birthMonth, form.birthYear],
  );
  const progress = `${step * 25}%`;

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setMessage("");
  };

  const updateBirthPart = (
    key: "birthDay" | "birthMonth" | "birthYear",
    value: string,
  ) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      const maxDay = daysInMonth(next.birthMonth, next.birthYear);
      if (Number(next.birthDay) > maxDay) next.birthDay = String(maxDay);
      return next;
    });
    setFieldErrors((current) => {
      if (!current.birthDate) return current;
      const next = { ...current };
      delete next.birthDate;
      return next;
    });
    setMessage("");
  };

  const validateStep = (targetStep: number) => {
    const errors: FieldErrors = {};
    const required = (key: keyof FormState, value: string, error: string) => {
      if (!value.trim()) errors[key] = [error];
    };

    if (targetStep === 1) {
      required("firstName", form.firstName, "Scrie prenumele.");
      required("lastName", form.lastName, "Scrie numele de familie.");
      required("email", form.email, "Introdu adresa de email.");
      if (form.email && !/^\S+@\S+\.\S+$/u.test(form.email)) {
        errors.email = ["Introdu o adresă de email validă."];
      }
      required("phone", form.phone, "Introdu numărul de telefon.");
      if (!birthDate) errors.birthDate = ["Selectează data completă."];
      required("city", form.city, "Scrie localitatea.");
      required("county", form.county, "Alege județul.");

      if (isMinor) {
        required("guardianName", form.guardianName, "Scrie numele tutorelui.");
        required(
          "guardianPhone",
          form.guardianPhone,
          "Introdu telefonul tutorelui.",
        );
        required(
          "guardianEmail",
          form.guardianEmail,
          "Introdu emailul tutorelui.",
        );
        if (form.guardianEmail && !/^\S+@\S+\.\S+$/u.test(form.guardianEmail)) {
          errors.guardianEmail = ["Introdu o adresă de email validă."];
        }
      }
    }

    if (targetStep === 2) {
      required("currentGrade", form.currentGrade, "Alege clasa în care ești.");
      required("examYear", form.examYear, "Alege anul admiterii.");
      required("highSchool", form.highSchool, "Scrie liceul.");
      required("studyProfile", form.studyProfile, "Scrie profilul liceului.");
      required(
        "targetUniversity",
        form.targetUniversity,
        "Alege facultatea vizată.",
      );
      if (form.targetUniversity === "other") {
        required(
          "targetUniversityOther",
          form.targetUniversityOther,
          "Scrie facultatea pe care o ai în minte.",
        );
      }
    }

    if (targetStep === 3) {
      if (!form.subjects.length) {
        errors.subjects = ["Alege cel puțin o materie."];
      }
      if (!form.deliveryMode) {
        errors.deliveryMode = ["Alege formatul de pregătire."];
      }
      if (!form.preparationTypes.length) {
        errors.preparationTypes = ["Alege cursuri, module speciale sau ambele."];
      }
      if (biologySelected && !form.biologyLevel) {
        errors.biologyLevel = ["Alege nivelul la biologie."];
      }
      if (chemistrySelected && !form.chemistryLevel) {
        errors.chemistryLevel = ["Alege nivelul la chimie."];
      }
    }

    if (targetStep === 4) {
      if (form.previousTutoring === null) {
        errors.previousTutoring = ["Spune-ne dacă ai mai făcut pregătire."];
      }
      if (form.whatsappOptIn === null) {
        errors.whatsappOptIn = ["Alege dacă vrei să intri în grupul de studiu."];
      }
      if (!form.privacyAccepted) {
        errors.privacyAccepted = ["Acordul este necesar pentru înscriere."];
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setMessage("");
      return false;
    }

    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setMessage("");
    setStep((current) => Math.min(4, current + 1));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (step < 4) {
      goNext();
      return;
    }

    if (!validateStep(4)) return;

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID();
    }

    startTransition(async () => {
      const result = await submitCenterEnrollmentAction({
        biologyLevel: biologySelected ? form.biologyLevel : null,
        birthDate,
        chemistryLevel: chemistrySelected ? form.chemistryLevel : null,
        context: {
          flow: context.flow,
          grade: context.grade,
          subscriptionPlan: {
            label: selectedPlan.label,
            slug: selectedPlan.slug,
          },
          source: context.source,
        },
        currentGrade: form.currentGrade,
        deliveryMode: form.deliveryMode,
        email: form.email,
        examYear: Number(form.examYear),
        fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
        guardianEmail: isMinor ? form.guardianEmail : null,
        guardianName: isMinor ? form.guardianName : null,
        guardianPhone: isMinor ? form.guardianPhone : null,
        highSchool: form.highSchool,
        idempotencyKey: idempotencyKeyRef.current,
        localityCounty: `${form.city.trim()}, ${form.county.trim()}`,
        participantStatus: isMinor ? "minor" : "adult",
        phone: form.phone,
        preparationTypes: form.preparationTypes,
        previousTutoring: form.previousTutoring,
        privacyAccepted: form.privacyAccepted,
        selectedPlanSlug: selectedPlan.slug,
        sourceContext: context.source ?? "direct",
        studyProfile: form.studyProfile,
        subjects: form.subjects,
        targetUniversity: form.targetUniversity,
        targetUniversityOther:
          form.targetUniversity === "other" ? form.targetUniversityOther : null,
        website: form.website,
        whatsappOptIn: form.whatsappOptIn,
      });

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setMessage(result.message);
        return;
      }

      setFieldErrors({});
      setMessage("");
      setReceipt({
        emailMessage: result.data.emailMessage,
        emailState: result.data.emailState,
        expiresAt: result.data.expiresAt,
        followUpToken: result.data.followUpToken,
      });
    });
  };

  const saveNextChoices = () => {
    if (!receipt) return;

    if (newsletterOptIn && !newsletterConsent) {
      setMessage("Bifează acordul pentru newsletter ca să putem salva alegerea.");
      return;
    }

    if (accountRequested && !prefill.authenticated) {
      if (password.length < 8 || !/[A-Za-zĂÂÎȘȚăâîșț]/u.test(password) || !/[0-9]/u.test(password)) {
        setMessage("Parola are nevoie de minimum 8 caractere, o literă și o cifră.");
        return;
      }
      if (password !== confirmPassword) {
        setMessage("Parolele pentru cont nu coincid.");
        return;
      }
    }

    startTransition(async () => {
      const preferenceResult = await saveCenterEnrollmentPreferencesAction({
        accountRequested: accountRequested && !prefill.authenticated,
        followUpToken: receipt.followUpToken,
        newsletterConsent,
        newsletterOptIn,
      });

      if (!preferenceResult.ok) {
        setMessage(preferenceResult.message);
        return;
      }

      if (accountRequested && !prefill.authenticated) {
        const accountResult = await createCenterEnrollmentAccountAction({
          confirmPassword,
          followUpToken: receipt.followUpToken,
          password,
        });

        if (!accountResult.ok) {
          setMessage(accountResult.message);
          return;
        }

        setMessage(accountResult.message);
        setConversionNextPath(accountResult.nextPath ?? "/cont");
      } else {
        setMessage(preferenceResult.message);
        setConversionNextPath(
          dedicated && !prefill.authenticated ? "/" : "/cont",
        );
      }

      setConversionComplete(true);
    });
  };

  if (receipt) {
    return (
      <div className="mx-auto w-full max-w-[1180px] overflow-hidden rounded-[2.25rem] border border-smart-abyss/10 bg-white/72 shadow-[0_30px_90px_rgba(3,17,28,0.12)]">
        <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="relative overflow-hidden bg-smart-dark px-7 py-10 text-smart-white sm:px-10 lg:min-h-[660px] lg:px-12 lg:py-14">
            <div className="absolute -left-32 bottom-0 size-80 rounded-full bg-smart-teal/28 blur-3xl" />
            <div className="grain-overlay" />
            <div className="relative z-10">
              <span className="flex size-16 items-center justify-center rounded-2xl border border-smart-aqua/18 bg-smart-aqua/10 text-smart-aqua">
                <CheckCircle2 aria-hidden="true" className="size-8" />
              </span>
              <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.2em] text-smart-gold-light">
                Înscriere înregistrată
              </p>
              <h2 className="mt-4 font-serif text-5xl font-semibold leading-[0.92] sm:text-6xl">
                Am primit tot. De aici preluăm noi.
              </h2>
              <p className="mt-6 text-sm leading-7 text-smart-white/66">
                Echipa SmartMed va analiza răspunsurile și va reveni cu o recomandare
                potrivită pentru etapa ta.
              </p>
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-start gap-3">
                  <MailCheck aria-hidden="true" className="mt-0.5 size-5 text-smart-aqua" />
                  <p className="text-sm leading-6 text-smart-white/74">
                    {receipt.emailMessage ||
                      (receipt.emailState === "sent"
                        ? "Confirmarea a fost trimisă pe email."
                        : "Confirmarea este pregătită pentru livrare pe email.")}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <section className="px-6 py-9 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            {conversionComplete ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                <span className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 aria-hidden="true" className="size-8" />
                </span>
                <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.18em] text-smart-teal">
                  Totul este pregătit
                </p>
                <h3 className="mt-3 max-w-lg font-serif text-5xl font-semibold leading-none">
                  Ne revedem la următorul pas
                </h3>
                {message ? (
                  <p className="mt-5 max-w-xl text-sm leading-7 text-smart-ink/62">
                    {message}
                  </p>
                ) : null}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-smart-dark px-6 text-sm font-extrabold text-smart-white transition hover:bg-smart-teal"
                    href={conversionNextPath}
                  >
                    {prefill.authenticated || accountRequested
                      ? "Mergi la cont"
                      : "Înapoi la SmartMed"}
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                  {!dedicated ? (
                    <Link
                      className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-smart-abyss/12 bg-white px-6 text-sm font-bold text-smart-ink/68 transition hover:border-smart-teal/35 hover:text-smart-teal"
                      href="#alte-inscrieri"
                    >
                      Vezi și alte înscrieri
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-smart-teal">
                  Încă două alegeri, doar dacă vrei
                </p>
                <h3 className="mt-3 max-w-2xl font-serif text-5xl font-semibold leading-[0.94]">
                  Păstrăm drumul tău într-un singur loc?
                </h3>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-smart-ink/58">
                  Înscrierea este deja salvată. Opțiunile de mai jos sunt separate și
                  complet opționale.
                </p>

                {!prefill.authenticated ? (
                  <div className="mt-8">
                    <ChoiceButton
                      active={accountRequested}
                      description="Preluăm automat numele, emailul, liceul și obiectivul tău. Tu alegi doar parola."
                      icon={<CircleUserRound aria-hidden="true" className="size-5" />}
                      label="Da, creează-mi contul SmartMed"
                      onClick={() => setAccountRequested((current) => !current)}
                    />
                    {accountRequested ? (
                      <div className="mt-4 grid gap-4 rounded-2xl border border-smart-teal/16 bg-smart-aqua/7 p-4 sm:grid-cols-2">
                        <Field htmlFor="enrollment-password" label="Alege parola">
                          <input
                            autoComplete="new-password"
                            className={inputClassName}
                            id="enrollment-password"
                            onChange={(event) => setPassword(event.target.value)}
                            type="password"
                            value={password}
                          />
                        </Field>
                        <Field htmlFor="enrollment-confirm-password" label="Confirmă parola">
                          <input
                            autoComplete="new-password"
                            className={inputClassName}
                            id="enrollment-confirm-password"
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            type="password"
                            value={confirmPassword}
                          />
                        </Field>
                        <p className="text-xs leading-5 text-smart-ink/52 sm:col-span-2">
                          Vei primi un email de confirmare. După activare, profilul de studiu
                          SmartMed se deschide automat și îl finalizezi în câteva alegeri.
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-8 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
                    <CheckCircle2 aria-hidden="true" className="size-5" />
                    Înscrierea a fost asociată contului cu care ești conectat.
                  </div>
                )}

                <label className="mt-4 flex cursor-pointer items-start gap-4 rounded-2xl border border-smart-abyss/10 bg-white/76 p-4 transition hover:border-smart-teal/30">
                  <input
                    checked={newsletterOptIn}
                    className="mt-1 size-5 shrink-0 accent-smart-teal"
                    onChange={(event) => {
                      setNewsletterOptIn(event.target.checked);
                      if (!event.target.checked) setNewsletterConsent(false);
                    }}
                    type="checkbox"
                  />
                  <span>
                    <span className="block text-sm font-extrabold text-smart-ink">
                      Vreau noutăți SmartMed
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-smart-ink/52">
                      Calendar, resurse utile și informații despre pregătire. Fără mesaje
                      inutile; te poți dezabona oricând.
                    </span>
                  </span>
                </label>

                {newsletterOptIn ? (
                  <label className="mt-3 flex items-start gap-3 px-1 text-xs leading-6 text-smart-ink/58">
                    <input
                      checked={newsletterConsent}
                      className="mt-1 size-4 shrink-0 accent-smart-teal"
                      onChange={(event) => setNewsletterConsent(event.target.checked)}
                      type="checkbox"
                    />
                    Sunt de acord să primesc comunicări SmartMed la adresa introdusă și
                    am citit politica de confidențialitate.
                  </label>
                ) : null}

                {message ? (
                  <p
                    aria-live="polite"
                    className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
                    role="status"
                  >
                    {message}
                  </p>
                ) : null}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-smart-dark px-7 text-sm font-extrabold text-smart-white shadow-[0_16px_35px_rgba(3,17,28,0.18)] transition hover:-translate-y-0.5 hover:bg-smart-teal disabled:cursor-wait disabled:opacity-60"
                    disabled={pending}
                    onClick={saveNextChoices}
                    type="button"
                  >
                    {pending ? (
                      <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
                    ) : (
                      <Sparkles aria-hidden="true" className="size-5" />
                    )}
                    {pending ? "Se pregătește…" : "Salvează alegerile"}
                  </button>
                  <Link
                    className="inline-flex min-h-12 items-center justify-center px-5 text-sm font-bold text-smart-ink/48 transition hover:text-smart-teal"
                    href={dedicated ? "/" : "#alte-inscrieri"}
                  >
                    {dedicated ? "Nu acum · încheie" : "Nu acum · vezi alte înscrieri"}
                  </Link>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto w-full max-w-[1220px] overflow-hidden rounded-[2.25rem] border border-smart-abyss/10 bg-white/72 shadow-[0_30px_90px_rgba(31,111,120,0.14)] lg:h-[clamp(520px,calc(100svh-6rem),780px)]"
      id="formular-inscriere-centru"
    >
      <div className="grid lg:h-full lg:grid-cols-[0.7fr_1.3fr]">
        <aside className="relative overflow-hidden bg-[linear-gradient(155deg,#338b95_0%,#287e88_50%,#216f79_100%)] px-6 py-8 text-smart-white sm:px-9 lg:min-h-0 lg:px-8 lg:py-7">
          <div className="absolute -left-28 top-32 size-80 rounded-full border border-white/12" />
          <div className="absolute -bottom-32 -right-28 size-80 rounded-full bg-smart-aqua/24 blur-3xl" />
          <div className="grain-overlay" />
          <div className="relative z-10 flex h-full flex-col">
            <span className="flex size-12 items-center justify-center rounded-2xl border border-white/22 bg-white/12 text-white">
              <HeartHandshake aria-hidden="true" className="size-5" />
            </span>
            <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.2em] text-smart-gold-light">
              {headline.eyebrow}
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold leading-[0.95]">
              {headline.title}
            </h2>
            <p className={cn(styles.asideDescription, "mt-4 text-sm leading-6 text-smart-white/76")}>
              {headline.description}
            </p>

            <div className="mt-4 rounded-2xl border border-white/18 bg-white/10 px-4 py-3">
              <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-smart-gold-light">
                Abonamentul ales
              </p>
              <p className="mt-1 text-sm font-extrabold text-white">
                {selectedPlan.label}
              </p>
              <Link
                className="mt-2 inline-flex min-h-9 items-center text-xs font-bold text-white/70 transition hover:text-white"
                href={plansHref}
              >
                Schimbă abonamentul
              </Link>
            </div>

            <ol className="mt-6 grid gap-2">
              {steps.map((item, index) => {
                const number = index + 1;
                const Icon = item.icon;
                const active = number === step;
                const complete = number < step;

                return (
                  <li
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border px-3.5 transition",
                      active
                        ? "border-smart-aqua/25 bg-white/8 py-2.5"
                        : "border-transparent py-1.5 text-smart-white/62",
                    )}
                    key={item.label}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-xl border",
                        complete
                          ? "border-white/55 bg-white/88 text-smart-teal"
                          : active
                            ? "border-smart-gold-light/28 bg-smart-gold/12 text-smart-gold-light"
                            : "border-white/18 bg-white/8",
                      )}
                    >
                      {complete ? (
                        <Check aria-hidden="true" className="size-4" strokeWidth={3} />
                      ) : (
                        <Icon aria-hidden="true" className="size-4" />
                      )}
                    </span>
                    <span>
                      <span
                        className={cn(
                          "block text-sm font-extrabold",
                          active || complete ? "text-smart-white" : "text-smart-white/68",
                        )}
                      >
                        {item.label}
                      </span>
                      {active ? (
                        <span
                          className={cn(
                            styles.activeStepDescription,
                            "mt-1 text-xs leading-4 text-smart-white/62",
                          )}
                        >
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ol>

          </div>
        </aside>

        <section className="flex min-h-0 flex-col px-5 py-8 sm:px-9 sm:py-10 lg:h-full lg:px-9 lg:py-7 xl:px-10">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-smart-teal">
                Pasul {step} din {steps.length}
              </p>
              <h3 className="mt-2 font-serif text-4xl font-semibold leading-none">
                {steps[step - 1].label}
              </h3>
            </div>
            {prefill.authenticated ? (
              <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 sm:flex">
                <CheckCircle2 aria-hidden="true" className="size-4" />
                Date din cont
              </span>
            ) : null}
          </div>

          <div className="mt-4 h-1.5 shrink-0 overflow-hidden rounded-full bg-smart-abyss/8">
            <span
              aria-hidden="true"
              className="block h-full rounded-full bg-[linear-gradient(90deg,#1f6f78,#9cced0)] transition-[width] duration-500"
              style={{ width: progress }}
            />
          </div>

          <form
            className="mt-6 flex min-h-0 flex-1 flex-col"
            noValidate
            onSubmit={submit}
          >
            <div aria-hidden="true" className="absolute -left-[10000px] top-auto size-px overflow-hidden">
              <label htmlFor="center-enrollment-website">Website</label>
              <input
                autoComplete="off"
                id="center-enrollment-website"
                onChange={(event) => updateForm("website", event.target.value)}
                tabIndex={-1}
                value={form.website}
              />
            </div>

            <div className={cn(styles.formBody, "min-h-0 flex-1 overflow-hidden p-1")}>

            {step === 1 ? (
              <div className="grid gap-x-3 gap-y-2 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <Field
                    error={
                      firstError(fieldErrors, "firstName") ??
                      firstError(fieldErrors, "fullName")
                    }
                    htmlFor="center-first-name"
                    label="Prenume"
                  >
                    <input
                      aria-describedby={fieldErrors.firstName ? "center-first-name-error" : undefined}
                      aria-invalid={Boolean(fieldErrors.firstName)}
                      autoComplete="given-name"
                      className={inputClassName}
                      id="center-first-name"
                      maxLength={60}
                      onChange={(event) => updateForm("firstName", event.target.value)}
                      placeholder="Ex: Ana"
                      value={form.firstName}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-3">
                  <Field
                    error={
                      firstError(fieldErrors, "lastName") ??
                      firstError(fieldErrors, "fullName")
                    }
                    htmlFor="center-last-name"
                    label="Nume"
                  >
                    <input
                      aria-describedby={fieldErrors.lastName ? "center-last-name-error" : undefined}
                      aria-invalid={Boolean(fieldErrors.lastName)}
                      autoComplete="family-name"
                      className={inputClassName}
                      id="center-last-name"
                      maxLength={80}
                      onChange={(event) => updateForm("lastName", event.target.value)}
                      placeholder="Ex: Popescu"
                      value={form.lastName}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-3">
                  <Field
                    error={firstError(fieldErrors, "email")}
                    htmlFor="center-email"
                    label="Email"
                  >
                    <input
                      aria-describedby={fieldErrors.email ? "center-email-error" : undefined}
                      aria-invalid={Boolean(fieldErrors.email)}
                      autoComplete="email"
                      className={inputClassName}
                      id="center-email"
                      maxLength={320}
                      onChange={(event) => updateForm("email", event.target.value)}
                      placeholder="ana@email.ro"
                      type="email"
                      value={form.email}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-3">
                  <Field
                    error={firstError(fieldErrors, "phone")}
                    htmlFor="center-phone"
                    label="Telefon"
                  >
                    <input
                      aria-describedby={fieldErrors.phone ? "center-phone-error" : undefined}
                      aria-invalid={Boolean(fieldErrors.phone)}
                      autoComplete="tel"
                      className={inputClassName}
                      id="center-phone"
                      maxLength={32}
                      onChange={(event) => updateForm("phone", event.target.value)}
                      placeholder="07xx xxx xxx"
                      type="tel"
                      value={form.phone}
                    />
                  </Field>
                </div>

                <fieldset className="grid gap-1 sm:col-span-2">
                  <legend className={cn(styles.fieldLabel, "text-sm font-bold text-smart-ink")}>
                    Data nașterii
                  </legend>
                  <div className="grid min-h-11 grid-cols-[auto_0.7fr_1.2fr_0.9fr] items-center gap-1.5 rounded-2xl border border-smart-abyss/13 bg-white/88 px-2 outline-none transition focus-within:border-smart-teal focus-within:bg-white focus-within:ring-4 focus-within:ring-smart-aqua/15 lg:min-h-12">
                    <CalendarDays aria-hidden="true" className="size-4 text-smart-teal" />
                    <select
                      aria-label="Ziua nașterii"
                      className="min-w-0 bg-transparent text-sm outline-none"
                      onChange={(event) => updateBirthPart("birthDay", event.target.value)}
                      value={form.birthDay}
                    >
                      <option value="">Zi</option>
                      {birthDays.map((day) => <option key={day} value={day}>{day}</option>)}
                    </select>
                    <select
                      aria-label="Luna nașterii"
                      className="min-w-0 bg-transparent text-sm outline-none"
                      onChange={(event) => updateBirthPart("birthMonth", event.target.value)}
                      value={form.birthMonth}
                    >
                      <option value="">Luna</option>
                      {monthOptions.map((month, index) => (
                        <option key={month} value={String(index + 1)}>{month}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Anul nașterii"
                      className="min-w-0 bg-transparent text-sm outline-none"
                      onChange={(event) => updateBirthPart("birthYear", event.target.value)}
                      value={form.birthYear}
                    >
                      <option value="">An</option>
                      {birthYears.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </div>
                  <ErrorSlot error={firstError(fieldErrors, "birthDate")} id="center-birth-date-error" />
                </fieldset>

                <div className="sm:col-span-2">
                  <Field
                    error={
                      firstError(fieldErrors, "city") ??
                      firstError(fieldErrors, "localityCounty")
                    }
                    htmlFor="center-city"
                    label="Localitate"
                  >
                    <input
                      autoComplete="address-level2"
                      className={inputClassName}
                      id="center-city"
                      maxLength={100}
                      onChange={(event) => updateForm("city", event.target.value)}
                      placeholder="Ex: Brașov"
                      value={form.city}
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field
                    error={
                      firstError(fieldErrors, "county") ??
                      firstError(fieldErrors, "localityCounty")
                    }
                    htmlFor="center-county"
                    label="Județ"
                  >
                    <select
                      autoComplete="address-level1"
                      className={inputClassName}
                      id="center-county"
                      onChange={(event) => updateForm("county", event.target.value)}
                      value={form.county}
                    >
                      <option value="">Alege județul</option>
                      {countyOptions.map((county) => (
                        <option key={county} value={county}>{county}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {isMinor ? (
                  <div className="mt-1 rounded-[1.5rem] border border-smart-gold/24 bg-smart-gold/8 p-3 sm:col-span-6">
                    <div className="flex items-start gap-3">
                      <HeartHandshake aria-hidden="true" className="mt-0.5 size-5 text-smart-gold" />
                      <div>
                        <p className="text-sm font-extrabold">Datele părintelui sau tutorelui</p>
                        <p className={cn(styles.guardianDescription, "mt-1 text-xs leading-5 text-smart-ink/52")}>
                          Au apărut automat fiindcă participantul este minor.
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 grid gap-x-3 sm:grid-cols-6">
                      <div className="sm:col-span-2">
                        <Field
                          error={firstError(fieldErrors, "guardianName")}
                          htmlFor="center-guardian-name"
                          label="Nume părinte / tutore"
                        >
                          <input
                            autoComplete="name"
                            className={inputClassName}
                            id="center-guardian-name"
                            maxLength={120}
                            onChange={(event) => updateForm("guardianName", event.target.value)}
                            value={form.guardianName}
                          />
                        </Field>
                      </div>
                      <div className="sm:col-span-2">
                        <Field
                          error={firstError(fieldErrors, "guardianPhone")}
                          htmlFor="center-guardian-phone"
                          label="Telefon tutore"
                        >
                          <input
                            autoComplete="tel"
                            className={inputClassName}
                            id="center-guardian-phone"
                            maxLength={32}
                            onChange={(event) => updateForm("guardianPhone", event.target.value)}
                            type="tel"
                            value={form.guardianPhone}
                          />
                        </Field>
                      </div>
                      <div className="sm:col-span-2">
                        <Field
                          error={firstError(fieldErrors, "guardianEmail")}
                          htmlFor="center-guardian-email"
                          label="Email tutore"
                        >
                          <input
                            autoComplete="email"
                            className={inputClassName}
                            id="center-guardian-email"
                            maxLength={320}
                            onChange={(event) => updateForm("guardianEmail", event.target.value)}
                            type="email"
                            value={form.guardianEmail}
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div className={cn(styles.stepStack, "grid gap-4")}>
                <fieldset>
                  <legend className="text-sm font-extrabold">În ce etapă ești acum?</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {gradeOptions.map((option) => (
                      <ChoiceButton
                        active={form.currentGrade === option.value}
                        key={option.value}
                        label={option.label}
                        onClick={() => {
                          updateForm("currentGrade", option.value);
                          if (!prefill.examYear) {
                            updateForm(
                              "examYear",
                              deriveExamYear(option.value, referenceDate),
                            );
                          }
                        }}
                      />
                    ))}
                  </div>
                  <ErrorSlot error={firstError(fieldErrors, "currentGrade")} />
                </fieldset>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    error={firstError(fieldErrors, "examYear")}
                    htmlFor="center-exam-year"
                    label="Anul admiterii"
                  >
                    <select
                      className={inputClassName}
                      id="center-exam-year"
                      onChange={(event) => updateForm("examYear", event.target.value)}
                      value={form.examYear}
                    >
                      {examYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    error={firstError(fieldErrors, "targetUniversity")}
                    htmlFor="center-university"
                    label="Facultatea vizată"
                  >
                    <select
                      className={inputClassName}
                      id="center-university"
                      onChange={(event) =>
                        updateForm(
                          "targetUniversity",
                          event.target.value as TargetUniversity,
                        )
                      }
                      value={form.targetUniversity}
                    >
                      <option value="">Alege centrul universitar</option>
                      {universityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {form.targetUniversity === "other" ? (
                    <div className="sm:col-span-2">
                      <Field
                        error={firstError(fieldErrors, "targetUniversityOther")}
                        htmlFor="center-university-other"
                        label="Ce facultate ai în minte?"
                      >
                        <input
                          className={inputClassName}
                          id="center-university-other"
                          maxLength={160}
                          onChange={(event) =>
                            updateForm("targetUniversityOther", event.target.value)
                          }
                          placeholder="Scrie universitatea sau orașul"
                          value={form.targetUniversityOther}
                        />
                      </Field>
                    </div>
                  ) : null}
                  <Field
                    error={firstError(fieldErrors, "highSchool")}
                    htmlFor="center-high-school"
                    label="Liceul"
                  >
                    <input
                      className={inputClassName}
                      id="center-high-school"
                      maxLength={180}
                      onChange={(event) => updateForm("highSchool", event.target.value)}
                      placeholder="Ex: Colegiul Național…"
                      value={form.highSchool}
                    />
                  </Field>
                  <Field
                    error={firstError(fieldErrors, "studyProfile")}
                    htmlFor="center-study-profile"
                    label="Profilul liceului"
                  >
                    <input
                      className={inputClassName}
                      id="center-study-profile"
                      maxLength={120}
                      onChange={(event) => updateForm("studyProfile", event.target.value)}
                      placeholder="Ex: Științe ale naturii"
                      value={form.studyProfile}
                    />
                  </Field>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className={cn(styles.stepStack, "grid gap-3")}>
                <fieldset>
                  <legend className="text-sm font-extrabold">
                    La ce materii vrei să te pregătești?
                  </legend>
                  <p className={cn(styles.subjectHelper, "mt-1 text-xs leading-5 text-smart-ink/48")}>
                    Poți alege una sau mai multe.
                  </p>
                  <div className="mt-2 grid gap-3 lg:grid-cols-3">
                    {subjectOptions.map((option) => (
                      <ChoiceButton
                        active={form.subjects.includes(option.value)}
                        description={option.description}
                        key={option.value}
                        label={option.label}
                        onClick={() =>
                          updateForm(
                            "subjects",
                            toggleArrayValue(form.subjects, option.value),
                          )
                        }
                      />
                    ))}
                  </div>
                  <ErrorSlot error={firstError(fieldErrors, "subjects")} />
                </fieldset>

                {(biologySelected || chemistrySelected) ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {biologySelected ? (
                      <Field
                        error={firstError(fieldErrors, "biologyLevel")}
                        htmlFor="center-biology-level"
                        label="Nivel biologie"
                      >
                        <select
                          className={cn(inputClassName, styles.compactSelect)}
                          id="center-biology-level"
                          onChange={(event) =>
                            updateForm("biologyLevel", event.target.value as Level)
                          }
                          value={form.biologyLevel}
                        >
                          <option value="">Alege nivelul</option>
                          {levelOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ) : null}
                    {chemistrySelected ? (
                      <Field
                        error={firstError(fieldErrors, "chemistryLevel")}
                        htmlFor="center-chemistry-level"
                        label="Nivel chimie"
                      >
                        <select
                          className={cn(inputClassName, styles.compactSelect)}
                          id="center-chemistry-level"
                          onChange={(event) =>
                            updateForm("chemistryLevel", event.target.value as Level)
                          }
                          value={form.chemistryLevel}
                        >
                          <option value="">Alege nivelul</option>
                          {levelOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ) : null}
                  </div>
                ) : null}

                <fieldset>
                  <legend className="text-sm font-extrabold">Unde vrei să participi?</legend>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <ChoiceButton
                      active={form.deliveryMode === "in_person"}
                      compact
                      icon={<MapPin aria-hidden="true" className="size-5" />}
                      label="Fizic, la centru"
                      onClick={() => updateForm("deliveryMode", "in_person")}
                    />
                    <ChoiceButton
                      active={form.deliveryMode === "online"}
                      compact
                      icon={<MessageCircleMore aria-hidden="true" className="size-5" />}
                      label="Online"
                      onClick={() => updateForm("deliveryMode", "online")}
                    />
                  </div>
                  <ErrorSlot error={firstError(fieldErrors, "deliveryMode")} />
                </fieldset>

                <fieldset>
                  <legend className="text-sm font-extrabold">Ce vrei să explorezi?</legend>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <ChoiceButton
                      active={form.preparationTypes.includes("courses")}
                      compact
                      label="Cursuri"
                      onClick={() =>
                        updateForm(
                          "preparationTypes",
                          toggleArrayValue(form.preparationTypes, "courses"),
                        )
                      }
                    />
                    <ChoiceButton
                      active={form.preparationTypes.includes("special_modules")}
                      compact
                      label="Module speciale"
                      onClick={() =>
                        updateForm(
                          "preparationTypes",
                          toggleArrayValue(form.preparationTypes, "special_modules"),
                        )
                      }
                    />
                  </div>
                  <ErrorSlot error={firstError(fieldErrors, "preparationTypes")} />
                </fieldset>
              </div>
            ) : null}

            {step === 4 ? (
              <div className={cn(styles.stepStack, "grid gap-4")}>
                <fieldset>
                  <legend className="text-sm font-extrabold">
                    Ai mai făcut pregătire pentru admitere?
                  </legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <ChoiceButton
                      active={form.previousTutoring === true}
                      label="Da, am mai făcut"
                      onClick={() => updateForm("previousTutoring", true)}
                    />
                    <ChoiceButton
                      active={form.previousTutoring === false}
                      label="Nu, este primul pas"
                      onClick={() => updateForm("previousTutoring", false)}
                    />
                  </div>
                  <ErrorSlot error={firstError(fieldErrors, "previousTutoring")} />
                </fieldset>

                <fieldset>
                  <legend className="flex items-center gap-2 text-sm font-extrabold">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-[#25D366]/14 text-[#159447]">
                      <Image
                        alt=""
                        aria-hidden="true"
                        height={16}
                        src="/icons/whatsapp.svg"
                        width={16}
                      />
                    </span>
                    Vrei acces la grupul de studiu pe WhatsApp?
                  </legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <ChoiceButton
                      active={form.whatsappOptIn === true}
                      brandIcon
                      description="Te putem adăuga după confirmarea înscrierii."
                      icon={
                        <Image
                          alt=""
                          aria-hidden="true"
                          height={20}
                          src="/icons/whatsapp.svg"
                          width={20}
                        />
                      }
                      label="Da, vreau în grup"
                      onClick={() => updateForm("whatsappOptIn", true)}
                    />
                    <ChoiceButton
                      active={form.whatsappOptIn === false}
                      description="Nicio problemă — înscrierea rămâne aceeași."
                      label="Nu acum"
                      onClick={() => updateForm("whatsappOptIn", false)}
                    />
                  </div>
                  <ErrorSlot error={firstError(fieldErrors, "whatsappOptIn")} />
                </fieldset>

                <div className="rounded-[1.5rem] border border-smart-teal/16 bg-smart-aqua/8 p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles aria-hidden="true" className="mt-0.5 size-5 text-smart-teal" />
                    <div>
                      <p className="text-sm font-extrabold">Ce se întâmplă după trimitere?</p>
                      <p className={cn(styles.confirmationDescription, "mt-1 text-xs leading-5 text-smart-ink/56")}>
                        Primești confirmarea pe email, iar echipa verifică obiectivul,
                        nivelul și formatul ales. Apoi revenim cu recomandarea potrivită —
                        nu cu un răspuns automat și generic.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="flex items-start gap-3 rounded-2xl border border-smart-abyss/10 bg-white/70 p-3.5 text-xs leading-5 text-smart-ink/62">
                    <input
                      aria-describedby={fieldErrors.privacyAccepted ? "center-privacy-error" : undefined}
                      aria-invalid={Boolean(fieldErrors.privacyAccepted)}
                      checked={form.privacyAccepted}
                      className="mt-0.5 size-4 shrink-0 accent-smart-teal"
                      onChange={(event) =>
                        updateForm("privacyAccepted", event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>
                      Sunt de acord cu prelucrarea datelor pentru gestionarea înscrierii,
                      conform{" "}
                      <Link
                        className="font-bold text-smart-teal underline underline-offset-2"
                        href="/confidentialitate"
                        target="_blank"
                      >
                        politicii de confidențialitate
                      </Link>
                      . Contul și newsletterul vor fi opționale după trimitere.
                    </span>
                  </label>
                  <ErrorSlot
                    error={firstError(fieldErrors, "privacyAccepted")}
                    id="center-privacy-error"
                  />
                </div>
              </div>
            ) : null}

            </div>

            <div className="min-h-7 shrink-0 px-1 pt-1">
              <p
                aria-hidden={!message}
                aria-live="polite"
                className={cn(
                  "line-clamp-2 text-xs font-semibold leading-4",
                  message ? "text-red-700" : "text-transparent",
                )}
                role={message ? "alert" : undefined}
              >
                {message || "\u00A0"}
              </p>
            </div>

            <div className="mt-1 flex shrink-0 flex-col-reverse gap-3 border-t border-smart-abyss/8 bg-white/5 pt-3 sm:flex-row sm:items-center sm:justify-between lg:pr-28 2xl:pr-0">
              <button
                className={cn(
                  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition",
                  step === 1
                    ? "pointer-events-none opacity-0"
                    : "border border-smart-abyss/10 bg-white text-smart-ink/64 hover:border-smart-teal/30 hover:text-smart-teal",
                )}
                disabled={step === 1 || pending}
                onClick={() => {
                  setFieldErrors({});
                  setMessage("");
                  setStep((current) => Math.max(1, current - 1));
                }}
                type="button"
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                Înapoi
              </button>
              <button
                className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-smart-dark px-7 text-sm font-extrabold text-smart-white shadow-[0_16px_35px_rgba(3,17,28,0.18)] transition hover:-translate-y-0.5 hover:bg-smart-teal disabled:cursor-wait disabled:opacity-60"
                disabled={pending}
                type="submit"
              >
                {pending ? (
                  <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
                ) : step === 4 ? (
                  <GraduationCap aria-hidden="true" className="size-5" />
                ) : null}
                {pending
                  ? "Se trimite…"
                  : step === 4
                    ? "Trimite înscrierea"
                    : "Continuă"}
                {!pending && step < 4 ? (
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition group-hover:translate-x-1"
                  />
                ) : null}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
