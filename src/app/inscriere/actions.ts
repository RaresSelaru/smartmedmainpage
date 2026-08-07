"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { smartMedSignupProfileMetadataSchema } from "@/lib/auth/signup-profile";
import { createServerSupabaseClient } from "@/lib/auth/supabase";
import { rememberPendingCenterEnrollmentLink } from "@/lib/center-enrollments/account-link";
import { dispatchCenterEnrollmentNotifications } from "@/lib/center-enrollments/notifications";
import {
  centerEnrollmentAccountSchema,
  centerEnrollmentAccountSeedSchema,
  centerEnrollmentInputSchema,
  centerEnrollmentPreferencesReceiptSchema,
  centerEnrollmentPreferencesSchema,
  centerEnrollmentReceiptSchema,
} from "@/lib/center-enrollments/schema";
import {
  publicEventRegistrationSchema,
  registrationRpcResultSchema,
} from "@/lib/events/schema";
import { dispatchEventRegistrationNotifications } from "@/lib/events/notifications";
import { siteConfig } from "@/lib/site-config";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type PublicRegistrationActionResult =
  | {
      data: z.infer<typeof registrationRpcResultSchema>;
      ok: true;
    }
  | {
      fieldErrors?: Record<string, string[]>;
      message: string;
      ok: false;
    };

export type CenterEnrollmentActionResult =
  | {
      data: {
        emailMessage: string;
        emailState: "failed" | "not_configured" | "queued" | "sent";
        expiresAt: string;
        followUpToken: string;
        outcome: "received";
      };
      ok: true;
    }
  | {
      fieldErrors?: Record<string, string[]>;
      message: string;
      ok: false;
    };

export type CenterEnrollmentFollowUpActionResult =
  | { message: string; nextPath?: string; ok: true }
  | {
      fieldErrors?: Record<string, string[]>;
      message: string;
      ok: false;
    };

type RateLimitBucket = {
  attempts: number;
  resetsAt: number;
};

const registrationRateLimits = new Map<string, RateLimitBucket>();
const registrationRateLimitWindowMs = 10 * 60 * 1000;

function rateLimitKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function consumeRateLimit(key: string, maximumAttempts: number, now: number) {
  const current = registrationRateLimits.get(key);

  if (!current || current.resetsAt <= now) {
    registrationRateLimits.set(key, {
      attempts: 1,
      resetsAt: now + registrationRateLimitWindowMs,
    });
    return true;
  }

  if (current.attempts >= maximumAttempts) {
    return false;
  }

  current.attempts += 1;
  return true;
}

async function isRegistrationRateLimited(eventId: number, email: string) {
  // Local QA frequently repeats the same submission. Keep that workflow
  // frictionless while applying the guard on deployed instances.
  if (process.env.NODE_ENV !== "production") return false;

  const requestHeaders = await headers();
  const requestHost = (
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    ""
  )
    .split(":")[0]
    .toLowerCase();

  if (requestHost === "localhost" || requestHost === "127.0.0.1") {
    return false;
  }

  const now = Date.now();

  if (registrationRateLimits.size > 2_000) {
    for (const [key, bucket] of registrationRateLimits) {
      if (bucket.resetsAt <= now) registrationRateLimits.delete(key);
    }
  }

  const forwardedAddress = requestHeaders
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const clientAddress =
    requestHeaders.get("cf-connecting-ip")?.trim() ||
    requestHeaders.get("x-real-ip")?.trim() ||
    forwardedAddress;
  const emailAllowed = consumeRateLimit(
    `email:${eventId}:${rateLimitKey(email)}`,
    6,
    now,
  );
  const addressAllowed = clientAddress
    ? consumeRateLimit(
        `address:${eventId}:${rateLimitKey(clientAddress)}`,
        40,
        now,
      )
    : true;

  return !emailAllowed || !addressAllowed;
}

async function isCenterEnrollmentRateLimited(email: string) {
  if (process.env.NODE_ENV !== "production") return false;

  const requestHeaders = await headers();
  const requestHost = (
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || ""
  )
    .split(":")[0]
    .toLowerCase();
  if (requestHost === "localhost" || requestHost === "127.0.0.1") return false;

  const now = Date.now();
  const forwardedAddress = requestHeaders
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const clientAddress =
    requestHeaders.get("cf-connecting-ip")?.trim() ||
    requestHeaders.get("x-real-ip")?.trim() ||
    forwardedAddress;
  const emailAllowed = consumeRateLimit(
    `center-email:${rateLimitKey(email)}`,
    4,
    now,
  );
  const addressAllowed = clientAddress
    ? consumeRateLimit(
        `center-address:${rateLimitKey(clientAddress)}`,
        24,
        now,
      )
    : true;

  return !emailAllowed || !addressAllowed;
}

function fieldErrors(error: z.ZodError) {
  const flattened = z.flattenError(error);
  return Object.fromEntries(
    Object.entries(flattened.fieldErrors).filter(
      (entry): entry is [string, string[]] =>
        Array.isArray(entry[1]) && entry[1].length > 0,
    ),
  );
}

function centerEnrollmentError(message: string) {
  const knownMessages: Record<string, string> = {
    BIOLOGY_LEVEL_REQUIRED: "Alege nivelul actual la biologie.",
    CHEMISTRY_LEVEL_REQUIRED: "Alege nivelul actual la chimie.",
    FOLLOW_UP_EXPIRED:
      "Această etapă a expirat. Înscrierea este salvată; contactează-ne dacă vrei să adăugăm opțiunea.",
    GUARDIAN_REQUIRED: "Completează datele părintelui sau tutorelui.",
    INVALID_EMAIL: "Adresa de email nu este validă.",
    INVALID_CENTER_ENROLLMENT_PLAN:
      "Abonamentul ales nu mai este disponibil. Alege din nou un abonament.",
    IDEMPOTENCY_PLAN_CONFLICT:
      "Această înscriere a fost deja trimisă pentru alt abonament. Reîncepe selecția abonamentului.",
    INVALID_PHONE: "Numărul de telefon nu este valid.",
    NEWSLETTER_CONSENT_REQUIRED: "Confirmă acordul pentru newsletter.",
    PARTICIPANT_STATUS_MISMATCH: "Verifică data nașterii.",
    PRIVACY_REQUIRED: "Este necesar acordul pentru prelucrarea datelor.",
    RATE_LIMITED:
      "Am primit deja mai multe înscrieri pentru această adresă. Echipa SmartMed le va verifica.",
  };

  return (
    Object.entries(knownMessages).find(([code]) => message.includes(code))?.[1] ??
    "Înscrierea nu a putut fi procesată. Încearcă din nou."
  );
}

function revalidateCenterEnrollmentPages() {
  revalidatePath("/inscriere");
  revalidatePath("/inscriere/centru");
  revalidatePath("/admin");
  revalidatePath("/admin/inscrieri");
}

async function currentUserIdForSubmittedEmail(email: string) {
  const sessionClient = await createServerSupabaseClient();
  if (!sessionClient) return null;

  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser();

  if (error || !user?.email) return null;
  return user.email.trim().toLowerCase() === email.trim().toLowerCase()
    ? user.id
    : null;
}

function mapStudyStage(grade: string) {
  if (grade === "grade_10") return "high_school_9_10" as const;
  if (grade === "grade_11") return "high_school_11" as const;
  if (grade === "grade_12") return "high_school_12" as const;
  return "graduate" as const;
}

function mapMedicalCenter(university: string) {
  const mapped = university.replace(/^umf_/u, "");
  if (
    mapped === "bucharest" ||
    mapped === "cluj" ||
    mapped === "iasi" ||
    mapped === "timisoara" ||
    mapped === "targu_mures" ||
    mapped === "craiova"
  ) {
    return mapped;
  }
  return "other" as const;
}

async function requestOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (process.env.NODE_ENV === "development" && origin) {
    try {
      const parsed = new URL(origin);
      if (
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "[::1]"
      ) {
        return parsed.origin;
      }
    } catch {
      // Use the canonical public origin below.
    }
  }
  return siteConfig.url;
}

export async function submitCenterEnrollmentAction(
  rawInput: unknown,
): Promise<CenterEnrollmentActionResult> {
  const parsed = centerEnrollmentInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      fieldErrors: fieldErrors(parsed.error),
      message: "Verifică informațiile din formular.",
      ok: false,
    };
  }

  if (parsed.data.website) {
    return {
      data: {
        emailMessage: "Am primit înscrierea.",
        emailState: "queued",
        expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        followUpToken: crypto.randomUUID(),
        outcome: "received",
      },
      ok: true,
    };
  }

  if (await isCenterEnrollmentRateLimited(parsed.data.email)) {
    return {
      message:
        "Ai trimis mai multe solicitări într-un timp scurt. Încearcă din nou peste câteva minute.",
      ok: false,
    };
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return {
      message: "Serviciul de înscrieri nu este configurat momentan.",
      ok: false,
    };
  }

  const authenticatedUserId = await currentUserIdForSubmittedEmail(
    parsed.data.email,
  );
  const submitted = await service.rpc("submit_center_enrollment_server", {
    p_authenticated_user_id: authenticatedUserId,
    p_biology_level: parsed.data.biologyLevel ?? "",
    p_birth_date: parsed.data.birthDate,
    p_chemistry_level: parsed.data.chemistryLevel ?? "",
    p_context: parsed.data.context as Json,
    p_current_grade: parsed.data.currentGrade,
    p_delivery_mode: parsed.data.deliveryMode,
    p_email: parsed.data.email,
    p_exam_year: parsed.data.examYear,
    p_full_name: parsed.data.fullName,
    p_guardian_email: parsed.data.guardianEmail ?? "",
    p_guardian_name: parsed.data.guardianName ?? "",
    p_guardian_phone: parsed.data.guardianPhone ?? "",
    p_high_school: parsed.data.highSchool,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_locality_county: parsed.data.localityCounty,
    p_participant_status: parsed.data.participantStatus,
    p_phone: parsed.data.phone,
    p_preparation_types: parsed.data.preparationTypes,
    p_previous_tutoring: parsed.data.previousTutoring,
    p_privacy_accepted: parsed.data.privacyAccepted,
    p_selected_plan_slug: parsed.data.selectedPlanSlug,
    p_source_context: parsed.data.sourceContext,
    p_study_profile: parsed.data.studyProfile,
    p_subjects: parsed.data.subjects,
    p_target_university: parsed.data.targetUniversity,
    p_target_university_other: parsed.data.targetUniversityOther ?? "",
    p_whatsapp_opt_in: parsed.data.whatsappOptIn,
  });

  if (submitted.error) {
    return { message: centerEnrollmentError(submitted.error.message), ok: false };
  }

  const receipt = centerEnrollmentReceiptSchema.safeParse(submitted.data);
  if (!receipt.success) {
    console.error("SmartMed center enrollment returned an invalid receipt");
    return {
      message:
        "Înscrierea a fost procesată, dar confirmarea nu a putut fi verificată. Contactează echipa SmartMed.",
      ok: false,
    };
  }

  const email = await dispatchCenterEnrollmentNotifications({
    followUpToken: receipt.data.followUpToken,
    publicId: receipt.data.publicId,
  });
  revalidateCenterEnrollmentPages();

  return {
    data: {
      emailMessage: email.message,
      emailState: email.state,
      expiresAt: receipt.data.expiresAt,
      followUpToken: receipt.data.followUpToken,
      outcome: receipt.data.outcome,
    },
    ok: true,
  };
}

export async function saveCenterEnrollmentPreferencesAction(
  rawInput: unknown,
): Promise<CenterEnrollmentFollowUpActionResult> {
  const parsed = centerEnrollmentPreferencesSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      fieldErrors: fieldErrors(parsed.error),
      message: "Verifică opțiunile alese.",
      ok: false,
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { message: "Opțiunile nu pot fi salvate momentan.", ok: false };
  }

  const saved = await supabase.rpc(
    "set_center_enrollment_post_submit_preferences",
    {
      p_account_requested: parsed.data.accountRequested,
      p_follow_up_token: parsed.data.followUpToken,
      p_newsletter_consent: parsed.data.newsletterConsent,
      p_newsletter_opt_in: parsed.data.newsletterOptIn,
    },
  );

  if (saved.error) {
    return { message: centerEnrollmentError(saved.error.message), ok: false };
  }
  if (!centerEnrollmentPreferencesReceiptSchema.safeParse(saved.data).success) {
    return { message: "Opțiunile nu au putut fi verificate.", ok: false };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const linked = await supabase.rpc(
      "link_center_enrollment_to_current_account",
      { p_follow_up_token: parsed.data.followUpToken },
    );
    if (linked.error) {
      console.error("SmartMed enrollment profile prefill failed", {
        code: linked.error.code,
        userId: user.id,
      });
    }
  }

  revalidateCenterEnrollmentPages();
  return {
    message: parsed.data.newsletterOptIn
      ? "Perfect. Te-am abonat și la noutățile SmartMed."
      : "Perfect. Înscrierea ta rămâne salvată.",
    ok: true,
  };
}

export async function createCenterEnrollmentAccountAction(
  rawInput: unknown,
): Promise<CenterEnrollmentFollowUpActionResult> {
  const parsed = centerEnrollmentAccountSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      fieldErrors: fieldErrors(parsed.error),
      message: "Verifică parola aleasă.",
      ok: false,
    };
  }

  const supabase = await createServerSupabaseClient({
    requireCookieWrites: true,
  });
  if (!supabase) {
    return { message: "Contul nu poate fi creat momentan.", ok: false };
  }

  const prepared = await supabase.rpc("prepare_center_enrollment_account", {
    p_follow_up_token: parsed.data.followUpToken,
  });
  if (prepared.error) {
    return { message: centerEnrollmentError(prepared.error.message), ok: false };
  }

  const seed = centerEnrollmentAccountSeedSchema.safeParse(prepared.data);
  if (!seed.success) {
    return { message: "Datele contului nu au putut fi pregătite.", ok: false };
  }
  if (seed.data.alreadyAuthenticated) {
    const linked = await supabase.rpc(
      "link_center_enrollment_to_current_account",
      { p_follow_up_token: parsed.data.followUpToken },
    );
    if (linked.error) {
      console.error("SmartMed authenticated enrollment link failed", {
        code: linked.error.code,
      });
    }
    return { message: "Înscrierea a fost asociată contului tău.", ok: true };
  }

  const focusSubjects = [
    ...(seed.data.subjects.some((subject) => subject.startsWith("biology_"))
      ? (["biology"] as const)
      : []),
    ...(seed.data.subjects.includes("organic_chemistry")
      ? (["chemistry"] as const)
      : []),
  ];
  const canonicalMetadata = smartMedSignupProfileMetadataSchema.safeParse({
    ...(seed.data.city.length <= 80 ? { city: seed.data.city } : {}),
    focus_subjects: focusSubjects,
    full_name: seed.data.fullName,
    phone: seed.data.phone,
    school: seed.data.school,
    signup_source: "center_enrollment",
    study_stage: mapStudyStage(seed.data.currentGrade),
    target_exam_plan: "scheduled",
    target_exam_year: seed.data.examYear,
    target_medical_center: mapMedicalCenter(seed.data.targetUniversity),
  });
  if (!canonicalMetadata.success) {
    return { message: "Datele contului nu au putut fi validate.", ok: false };
  }

  const callbackUrl = new URL("/auth/callback", await requestOrigin());
  callbackUrl.searchParams.set("next", "/cont");
  const signUp = await supabase.auth.signUp({
    email: seed.data.email,
    options: {
      data: {
        ...canonicalMetadata.data,
        center_enrollment_link_key: seed.data.accountLinkKey,
      },
      emailRedirectTo: callbackUrl.toString(),
    },
    password: parsed.data.password,
  });

  const accountAlreadyExists =
    signUp.error?.code === "user_already_exists" ||
    signUp.error?.code === "email_exists" ||
    signUp.error?.message.toLowerCase().includes("already") ||
    (signUp.data.user !== null && signUp.data.user.identities?.length === 0);
  if (accountAlreadyExists) {
    await rememberPendingCenterEnrollmentLink(parsed.data.followUpToken);
    return {
      message:
        "Ai deja un cont SmartMed. Conectează-te, iar noi asociem automat înscrierea și completăm profilul cu ce ne-ai spus deja.",
      nextPath: "/cont?mode=conectare&status=enrollment-link-pending",
      ok: true,
    };
  }
  if (signUp.error) {
    console.error("SmartMed enrollment account sign-up failed", {
      code: signUp.error.code,
    });
    return { message: "Contul nu a putut fi creat. Încearcă din nou.", ok: false };
  }

  revalidatePath("/cont");
  return {
    message: signUp.data.session
      ? "Contul tău SmartMed este gata."
      : "Contul a fost creat. Verifică emailul pentru confirmare.",
    ok: true,
  };
}

function publicRegistrationError(message: string) {
  const knownMessages: Record<string, string> = {
    EVENT_FULL: "Toate locurile au fost ocupate.",
    EVENT_NOT_FOUND: "Evenimentul nu mai este disponibil.",
    EVENT_NOT_OPEN: "Înscrierile nu sunt deschise pentru acest eveniment.",
    EVENT_STARTED: "Evenimentul a început deja.",
    INVALID_EMAIL: "Adresa de email nu este validă.",
    INVALID_NAME: "Numele introdus nu este valid.",
    INVALID_PHONE: "Numărul de telefon nu este valid.",
    PRIVACY_REQUIRED: "Este necesar acordul pentru prelucrarea datelor.",
    REGISTRATION_CLOSED: "Perioada de înscriere s-a încheiat.",
    REGISTRATION_NOT_STARTED: "Perioada de înscriere nu a început încă.",
  };

  return (
    Object.entries(knownMessages).find(([code]) => message.includes(code))?.[1] ??
    "Înscrierea nu a putut fi trimisă. Încearcă din nou."
  );
}

export async function registerForEventAction(
  rawInput: unknown,
): Promise<PublicRegistrationActionResult> {
  const parsed = publicEventRegistrationSchema.safeParse(rawInput);

  if (!parsed.success) {
    const flattened = z.flattenError(parsed.error);
    return {
      fieldErrors: Object.fromEntries(
        Object.entries(flattened.fieldErrors).filter(
          (entry): entry is [string, string[]] =>
            Array.isArray(entry[1]) && entry[1].length > 0,
        ),
      ),
      message: "Verifică informațiile din formular.",
      ok: false,
    };
  }

  if (parsed.data.website) {
    return {
      data: { accepted: true, outcome: "received" },
      ok: true,
    };
  }

  if (await isRegistrationRateLimited(parsed.data.eventId, parsed.data.email)) {
    return {
      message:
        "Ai trimis mai multe solicitări într-un timp scurt. Încearcă din nou peste câteva minute.",
      ok: false,
    };
  }

  const service = createSupabaseServiceClient();

  if (!service) {
    return {
      message: "Serviciul de înscrieri nu este configurat momentan.",
      ok: false,
    };
  }

  const authenticatedUserId = await currentUserIdForSubmittedEmail(
    parsed.data.email,
  );
  const { data, error } = await service.rpc("register_for_event_server", {
    p_authenticated_user_id: authenticatedUserId,
    p_email: parsed.data.email,
    p_event_id: parsed.data.eventId,
    p_full_name: parsed.data.fullName,
    p_marketing_opt_in: parsed.data.marketingOptIn,
    p_phone: parsed.data.phone ?? undefined,
    p_privacy_accepted: parsed.data.privacyAccepted,
  });

  if (error) {
    return { message: publicRegistrationError(error.message), ok: false };
  }

  const result = registrationRpcResultSchema.safeParse(data);

  if (!result.success) {
    console.error("SmartMed event registration returned an invalid response");
    return {
      message: "Confirmarea nu a putut fi verificată. Contactează echipa.",
      ok: false,
    };
  }

  revalidatePath("/evenimente");
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${parsed.data.eventId}/registrations`);

  await dispatchEventRegistrationNotifications({
    email: parsed.data.email,
    eventId: parsed.data.eventId,
  });

  return { data: result.data, ok: true };
}
