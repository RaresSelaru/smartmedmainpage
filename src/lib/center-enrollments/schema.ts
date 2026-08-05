import { z } from "zod";

import { passwordSchema } from "@/lib/auth/validation";
import { CENTER_ENROLLMENT_PLAN_SLUGS } from "@/lib/center-enrollments/plans";

export const centerEnrollmentParticipantStatuses = ["adult", "minor"] as const;
export const centerEnrollmentGrades = [
  "grade_10",
  "grade_11",
  "grade_12",
  "graduate",
] as const;
export const centerEnrollmentUniversities = [
  "umf_bucharest",
  "umf_brasov",
  "umf_sibiu",
  "umf_cluj",
  "umf_targu_mures",
  "umf_iasi",
  "umf_craiova",
  "umf_constanta",
  "umf_timisoara",
  "other",
] as const;
export const centerEnrollmentSubjects = [
  "biology_corint",
  "biology_barrons",
  "organic_chemistry",
] as const;
export const centerEnrollmentDeliveryModes = ["in_person", "online"] as const;
export const centerEnrollmentLevels = [
  "beginner",
  "intermediate",
  "advanced",
  "mastery",
] as const;
export const centerEnrollmentPreparationTypes = [
  "courses",
  "special_modules",
] as const;
export const centerEnrollmentStatuses = [
  "new",
  "contacted",
  "qualified",
  "enrolled",
  "not_interested",
  "duplicate",
  "archived",
] as const;

const nullableTrimmedText = (minimum: number, maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() !== ""
        ? value.trim()
        : null,
    z.string().min(minimum).max(maximum).nullable(),
  );

const nullableEmail = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() !== ""
      ? value.trim().toLowerCase()
      : null,
  z.string().email().max(254).nullable(),
);

function calendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { day, month, year };
}

function bucharestToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Bucharest",
    year: "numeric",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value ?? 0);

  return {
    day: part("day"),
    month: part("month"),
    year: part("year"),
  };
}

function compareCalendarDates(
  left: ReturnType<typeof calendarDate>,
  right: ReturnType<typeof calendarDate>,
) {
  return (
    left.year - right.year ||
    left.month - right.month ||
    left.day - right.day
  );
}

function isMinorBirthDate(value: string) {
  const birthDate = calendarDate(value);
  const today = bucharestToday();
  const eighteenthBirthday = { ...birthDate, year: birthDate.year + 18 };
  return compareCalendarDates(eighteenthBirthday, today) > 0;
}

export const centerEnrollmentInputSchema = z
  .object({
    biologyLevel: z.enum(centerEnrollmentLevels).nullable(),
    birthDate: z.iso.date({ error: "Alege data nașterii." }),
    chemistryLevel: z.enum(centerEnrollmentLevels).nullable(),
    context: z.record(z.string(), z.unknown()).default({}),
    currentGrade: z.enum(centerEnrollmentGrades, {
      error: "Alege clasa în care ești acum.",
    }),
    deliveryMode: z.enum(centerEnrollmentDeliveryModes, {
      error: "Alege formatul de pregătire.",
    }),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Introdu o adresă de email validă.")
      .max(254),
    examYear: z.number().int().min(2026).max(2045),
    fullName: z
      .string()
      .trim()
      .min(2, "Scrie numele complet.")
      .max(100, "Numele este prea lung."),
    guardianEmail: nullableEmail,
    guardianName: nullableTrimmedText(2, 100),
    guardianPhone: nullableTrimmedText(7, 32),
    highSchool: z.string().trim().min(2).max(160),
    idempotencyKey: z.uuid(),
    localityCounty: z.string().trim().min(2).max(160),
    participantStatus: z.enum(centerEnrollmentParticipantStatuses),
    phone: z.string().trim().min(7).max(32),
    preparationTypes: z
      .array(z.enum(centerEnrollmentPreparationTypes))
      .min(1, "Alege cel puțin o formă de pregătire.")
      .max(2),
    previousTutoring: z.boolean({
      error: "Spune-ne dacă ai mai făcut pregătire.",
    }),
    privacyAccepted: z.literal(true, {
      error: "Este necesar acordul pentru prelucrarea datelor.",
    }),
    sourceContext: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9_.:/?=&+-]+$/i, "Sursa înscrierii nu este validă."),
    selectedPlanSlug: z.enum(CENTER_ENROLLMENT_PLAN_SLUGS, {
      error: "Alege abonamentul înainte de înscriere.",
    }),
    studyProfile: z.string().trim().min(2).max(120),
    subjects: z
      .array(z.enum(centerEnrollmentSubjects))
      .min(1, "Alege cel puțin o materie.")
      .max(3),
    targetUniversity: z.enum(centerEnrollmentUniversities),
    targetUniversityOther: nullableTrimmedText(2, 160),
    website: z.string().trim().max(200).optional().default(""),
    whatsappOptIn: z.boolean({
      error: "Alege dacă vrei să intri în grupul WhatsApp.",
    }),
  })
  .strict()
  .superRefine((value, context) => {
    const uniqueSubjects = new Set(value.subjects);
    const uniquePreparationTypes = new Set(value.preparationTypes);
    const today = bucharestToday();
    const birthDate = calendarDate(value.birthDate);

    if (uniqueSubjects.size !== value.subjects.length) {
      context.addIssue({
        code: "custom",
        message: "Materiile alese trebuie să fie unice.",
        path: ["subjects"],
      });
    }

    if (uniquePreparationTypes.size !== value.preparationTypes.length) {
      context.addIssue({
        code: "custom",
        message: "Opțiunile alese trebuie să fie unice.",
        path: ["preparationTypes"],
      });
    }

    if (
      birthDate.year < 1900 ||
      compareCalendarDates(birthDate, today) > 0
    ) {
      context.addIssue({
        code: "custom",
        message: "Data nașterii nu este validă.",
        path: ["birthDate"],
      });
    }

    const participantIsMinor = value.participantStatus === "minor";
    if (participantIsMinor !== isMinorBirthDate(value.birthDate)) {
      context.addIssue({
        code: "custom",
        message: "Verifică data nașterii.",
        path: ["birthDate"],
      });
    }

    if (
      participantIsMinor &&
      (!value.guardianName || !value.guardianPhone || !value.guardianEmail)
    ) {
      for (const path of ["guardianName", "guardianPhone", "guardianEmail"] as const) {
        if (!value[path]) {
          context.addIssue({
            code: "custom",
            message: "Datele părintelui sau tutorelui sunt necesare.",
            path: [path],
          });
        }
      }
    }

    if (value.targetUniversity === "other" && !value.targetUniversityOther) {
      context.addIssue({
        code: "custom",
        message: "Scrie centrul universitar pe care îl ai în vedere.",
        path: ["targetUniversityOther"],
      });
    }

    if (value.targetUniversity !== "other" && value.targetUniversityOther) {
      context.addIssue({
        code: "custom",
        message: "Câmpul se completează doar pentru alt centru.",
        path: ["targetUniversityOther"],
      });
    }

    const biologySelected =
      uniqueSubjects.has("biology_corint") ||
      uniqueSubjects.has("biology_barrons");
    const chemistrySelected = uniqueSubjects.has("organic_chemistry");

    if (biologySelected !== (value.biologyLevel !== null)) {
      context.addIssue({
        code: "custom",
        message: biologySelected
          ? "Alege nivelul actual la biologie."
          : "Nivelul la biologie se completează doar când alegi biologia.",
        path: ["biologyLevel"],
      });
    }

    if (chemistrySelected !== (value.chemistryLevel !== null)) {
      context.addIssue({
        code: "custom",
        message: chemistrySelected
          ? "Alege nivelul actual la chimie."
          : "Nivelul la chimie se completează doar când alegi chimia.",
        path: ["chemistryLevel"],
      });
    }

    if (new TextEncoder().encode(JSON.stringify(value.context)).byteLength > 3_500) {
      context.addIssue({
        code: "custom",
        message: "Contextul înscrierii este prea mare.",
        path: ["context"],
      });
    }
  });

export const centerEnrollmentReceiptSchema = z
  .object({
    accepted: z.literal(true),
    expiresAt: z.iso.datetime({ offset: true }),
    followUpToken: z.uuid(),
    outcome: z.literal("received"),
    publicId: z.uuid().optional(),
  })
  .strict();

export const centerEnrollmentPreferencesSchema = z
  .object({
    accountRequested: z.boolean(),
    followUpToken: z.uuid(),
    newsletterConsent: z.boolean(),
    newsletterOptIn: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.newsletterOptIn && !value.newsletterConsent) {
      context.addIssue({
        code: "custom",
        message: "Confirmă acordul pentru newsletter.",
        path: ["newsletterConsent"],
      });
    }
  });

export const centerEnrollmentPreferencesReceiptSchema = z
  .object({
    accepted: z.literal(true),
    accountRequested: z.boolean(),
    newsletterOptIn: z.boolean(),
  })
  .strict();

export const centerEnrollmentAccountSchema = z
  .object({
    confirmPassword: z.string().min(1, "Confirmă parola."),
    followUpToken: z.uuid(),
    password: passwordSchema,
  })
  .strict()
  .refine((value) => value.password === value.confirmPassword, {
    message: "Parolele nu coincid.",
    path: ["confirmPassword"],
  });

export const centerEnrollmentAccountSeedSchema = z.discriminatedUnion(
  "alreadyAuthenticated",
  [
    z.object({
      accepted: z.literal(true),
      alreadyAuthenticated: z.literal(true),
    }),
    z.object({
      accepted: z.literal(true),
      accountLinkKey: z.uuid(),
      alreadyAuthenticated: z.literal(false),
      city: z.string().min(2).max(160),
      currentGrade: z.enum(centerEnrollmentGrades),
      email: z.string().email().max(320),
      examYear: z.number().int().min(2026).max(2045),
      fullName: z.string().min(2).max(100),
      phone: z.string().min(7).max(32),
      school: z.string().min(2).max(160),
      subjects: z.array(z.enum(centerEnrollmentSubjects)).min(1).max(3),
      targetUniversity: z.enum(centerEnrollmentUniversities),
    }),
  ],
);

export type CenterEnrollmentInput = z.infer<typeof centerEnrollmentInputSchema>;
export type CenterEnrollmentStatus =
  (typeof centerEnrollmentStatuses)[number];
