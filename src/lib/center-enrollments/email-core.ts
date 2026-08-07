import { z } from "zod";

import {
  CENTER_ENROLLMENT_PLAN_SLUGS,
  type CenterEnrollmentPlanSlug,
} from "@/lib/center-enrollments/plans";

const resendEndpoint = "https://api.resend.com/emails";
const defaultTimeoutMs = 8_000;

export const centerEnrollmentNotificationTypes = [
  "center_enrollment_confirmation",
  "center_enrollment_staff_alert",
] as const;

export type CenterEnrollmentNotificationType =
  (typeof centerEnrollmentNotificationTypes)[number];

export type CenterEnrollmentNotificationPayload = {
  biologyLevel: string | null;
  birthDate: string;
  chemistryLevel: string | null;
  createdAt: string;
  currentGrade: string;
  deliveryMode: string;
  email: string;
  examYear: number;
  fullName: string;
  guardianEmail: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  highSchool: string;
  localityCounty: string;
  participantStatus: "adult" | "minor";
  phone: string;
  preparationTypes: string[];
  previousTutoring: boolean;
  publicId: string;
  selectedPlanName?: string | null;
  selectedPlanSlug?: CenterEnrollmentPlanSlug | null;
  sourceContext: string;
  studyProfile: string;
  subjects: string[];
  targetUniversity: string;
  targetUniversityOther: string | null;
  whatsappOptIn: boolean;
};

export type CenterEnrollmentNotificationInput = {
  idempotencyKey: string;
  notificationType: CenterEnrollmentNotificationType;
  payload: CenterEnrollmentNotificationPayload;
  recipientEmail: string | null;
  recipientKind: "applicant" | "staff";
};

export type CenterEnrollmentNotificationResult =
  | { ok: true; providerMessageId: string; status: "sent" }
  | {
      errorCode: "email_not_configured";
      ok: false;
      retryable: true;
      status: "not_configured";
    }
  | {
      errorCode: string;
      httpStatus?: number;
      ok: false;
      retryable: boolean;
      status: "failed";
    };

type EmailEnvironment = {
  CENTER_ENROLLMENT_STAFF_EMAIL?: string;
  REGISTRATIONS_STAFF_EMAIL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  RESEND_REPLY_TO_EMAIL?: string;
};

type EmailFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

const nullableText = (maximum: number) =>
  z.preprocess(
    (value) => (value == null ? null : value),
    z.string().trim().max(maximum).nullable(),
  );

const payloadSchema = z
  .object({
    biologyLevel: nullableText(30),
    birthDate: z.iso.date(),
    chemistryLevel: nullableText(30),
    createdAt: z.iso.datetime({ offset: true }),
    currentGrade: z.string().min(1).max(30),
    deliveryMode: z.string().min(1).max(30),
    email: z.email().max(320),
    examYear: z.number().int().min(2026).max(2045),
    fullName: z.string().trim().min(2).max(100),
    guardianEmail: z.preprocess(
      (value) => (value == null ? null : value),
      z.email().max(320).nullable(),
    ),
    guardianName: nullableText(100),
    guardianPhone: nullableText(32),
    highSchool: z.string().trim().min(2).max(160),
    localityCounty: z.string().trim().min(2).max(160),
    participantStatus: z.enum(["adult", "minor"]),
    phone: z.string().trim().min(7).max(32),
    preparationTypes: z.array(z.string().min(1).max(40)).min(1).max(2),
    previousTutoring: z.boolean(),
    publicId: z.uuid(),
    selectedPlanName: nullableText(120).optional(),
    selectedPlanSlug: z.enum(CENTER_ENROLLMENT_PLAN_SLUGS).nullable().optional(),
    sourceContext: z.string().min(1).max(120),
    studyProfile: z.string().trim().min(2).max(120),
    subjects: z.array(z.string().min(1).max(40)).min(1).max(3),
    targetUniversity: z.string().min(1).max(40),
    targetUniversityOther: nullableText(160),
    whatsappOptIn: z.boolean(),
  })
  .strict();

const inputSchema = z
  .object({
    idempotencyKey: z.string().trim().min(1).max(256),
    notificationType: z.enum(centerEnrollmentNotificationTypes),
    payload: payloadSchema,
    recipientEmail: z.preprocess(
      (value) => (value == null ? null : value),
      z.email().max(320).nullable(),
    ),
    recipientKind: z.enum(["applicant", "staff"]),
  })
  .strict()
  .superRefine((value, context) => {
    const expectedType =
      value.recipientKind === "applicant"
        ? "center_enrollment_confirmation"
        : "center_enrollment_staff_alert";
    if (value.notificationType !== expectedType) {
      context.addIssue({
        code: "custom",
        message: "Tipul notificării nu corespunde destinatarului.",
        path: ["notificationType"],
      });
    }
    if (value.recipientKind === "applicant" && !value.recipientEmail) {
      context.addIssue({
        code: "custom",
        message: "Destinatarul confirmării lipsește.",
        path: ["recipientEmail"],
      });
    }
  });

function value(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function emailAddress(valueToCheck: string) {
  const bracketMatch = valueToCheck.match(/<([^<>]+)>\s*$/u);
  return (bracketMatch?.[1] ?? valueToCheck).trim();
}

function plausibleEmail(valueToCheck: string) {
  return (
    !/[\r\n]/u.test(valueToCheck) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(emailAddress(valueToCheck))
  );
}

function escapeHtml(valueToEscape: string) {
  return valueToEscape
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const labels: Record<string, string> = {
  advanced: "Avansat",
  beginner: "Începător",
  biology_barrons: "Biologie — Barron’s",
  biology_corint: "Biologie — Corint",
  courses: "Cursuri complete",
  grade_10: "Clasa a X-a",
  grade_11: "Clasa a XI-a",
  grade_12: "Clasa a XII-a",
  graduate: "Absolvent(ă)",
  in_person: "La centrul SmartMed",
  intermediate: "Intermediar",
  mastery: "Stăpânire foarte bună",
  online: "Online",
  "online-esential": "Online Esențial",
  organic_chemistry: "Chimie organică",
  "centru-plus": "Centru Plus",
  "module-signature": "Module Signature",
  "esential-1-materie": "Esențial · 1 materie",
  "esential-2-materii": "Esențial · 2 materii",
  "avansat-1-materie": "Avansat · 1 materie",
  "avansat-2-materii": "Avansat · 2 materii",
  "performanta-1-materie": "Performanță · 1 materie",
  "performanta-2-materii": "Performanță · 2 materii",
  special_modules: "Module speciale",
  umf_brasov: "UMF Brașov",
  umf_bucharest: "UMF București",
  umf_cluj: "UMF Cluj",
  umf_constanta: "UMF Constanța",
  umf_craiova: "UMF Craiova",
  umf_iasi: "UMF Iași",
  umf_sibiu: "UMF Sibiu",
  umf_targu_mures: "UMF Târgu Mureș",
  umf_timisoara: "UMF Timișoara",
};

function label(key: string | null) {
  if (!key) return "—";
  return labels[key] ?? key;
}

function row(name: string, rawValue: string) {
  return `<tr><td style="padding:8px 12px;color:#607079;border-bottom:1px solid #e7e0d4">${escapeHtml(name)}</td><td style="padding:8px 12px;color:#071923;border-bottom:1px solid #e7e0d4;font-weight:600">${escapeHtml(rawValue)}</td></tr>`;
}

function applicantEmail(payload: CenterEnrollmentNotificationPayload) {
  const firstName = payload.fullName.trim().split(/\s+/u)[0] || "Bună";
  const selectedPlan = payload.selectedPlanName || label(payload.selectedPlanSlug ?? null);
  const planSentence = payload.selectedPlanSlug
    ? ` Ai ales abonamentul ${selectedPlan}.`
    : "";
  const subject = "Am primit înscrierea ta la Centrul SmartMed";
  const text = `${firstName}, înscrierea ta a ajuns la echipa SmartMed.${planSentence} O vom analiza și te vom contacta pentru a stabili cea mai potrivită variantă de pregătire. Nu trebuie să mai completezi nimic acum.`;
  const planHtml = payload.selectedPlanSlug
    ? `<p style="margin:18px 0 0;border:1px solid rgba(137,209,212,.28);border-radius:14px;padding:12px 14px;color:#fff"><span style="display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#89d1d4">Abonamentul ales</span><strong style="display:block;margin-top:4px">${escapeHtml(selectedPlan)}</strong></p>`
    : "";
  const html = `<!doctype html><html lang="ro"><body style="margin:0;background:#f3ecdf;font-family:Arial,sans-serif;color:#071923"><div style="max-width:640px;margin:0 auto;padding:32px 18px"><div style="border-radius:28px;background:#061923;padding:32px;color:#fff"><div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#89d1d4">SmartMed Academy</div><h1 style="font-family:Georgia,serif;font-size:36px;line-height:1.05;margin:18px 0">Înscrierea ta este în siguranță la noi.</h1><p style="font-size:17px;line-height:1.7;color:#dce5e6">Bună, ${escapeHtml(firstName)}. Am primit răspunsurile tale și le vom folosi ca să îți recomandăm o variantă potrivită pentru drumul spre Medicină.</p>${planHtml}</div><div style="padding:28px 10px"><h2 style="font-family:Georgia,serif;font-size:26px;margin:0 0 12px">Ce urmează?</h2><p style="font-size:16px;line-height:1.7;color:#526168">Echipa SmartMed analizează înscrierea și te contactează la datele oferite. Nu trebuie să mai completezi nimic acum.</p><p style="font-size:14px;line-height:1.6;color:#738087;margin-top:24px">Dacă vrei să adaugi ceva, răspunde direct la acest email.</p></div></div></body></html>`;
  return { html, subject, text };
}

function staffEmail(payload: CenterEnrollmentNotificationPayload) {
  const university =
    payload.targetUniversity === "other"
      ? payload.targetUniversityOther || "Alt centru"
      : label(payload.targetUniversity);
  const entries = [
    [
      "Abonament ales",
      payload.selectedPlanName || label(payload.selectedPlanSlug ?? null),
    ],
    ["Nume", payload.fullName],
    ["Email", payload.email],
    ["Telefon", payload.phone],
    ["Data nașterii", payload.birthDate],
    ["Localitate / județ", payload.localityCounty],
    ["Liceu", payload.highSchool],
    ["Profil", payload.studyProfile],
    ["Clasă", label(payload.currentGrade)],
    ["An admitere", String(payload.examYear)],
    ["Centru universitar", university],
    ["Materii", payload.subjects.map(label).join(", ")],
    ["Nivel biologie", label(payload.biologyLevel)],
    ["Nivel chimie", label(payload.chemistryLevel)],
    ["Format", label(payload.deliveryMode)],
    ["Pregătire", payload.preparationTypes.map(label).join(", ")],
    ["Pregătire anterioară", payload.previousTutoring ? "Da" : "Nu"],
    ["Grup WhatsApp", payload.whatsappOptIn ? "Da" : "Nu"],
  ];
  if (payload.participantStatus === "minor") {
    entries.push(
      ["Părinte / tutore", payload.guardianName || "—"],
      ["Telefon părinte", payload.guardianPhone || "—"],
      ["Email părinte", payload.guardianEmail || "—"],
    );
  }
  const subject = `Înscriere nouă la centru — ${payload.fullName}`;
  const text = entries.map(([name, entry]) => `${name}: ${entry}`).join("\n");
  const html = `<!doctype html><html lang="ro"><body style="margin:0;background:#f3ecdf;font-family:Arial,sans-serif;color:#071923"><div style="max-width:760px;margin:0 auto;padding:30px 18px"><div style="border-radius:24px 24px 0 0;background:#061923;padding:28px;color:#fff"><div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#89d1d4">Înscriere nouă · Centrul SmartMed</div><h1 style="font-family:Georgia,serif;font-size:32px;margin:14px 0 6px">${escapeHtml(payload.fullName)}</h1><div style="color:#d8e1e2">Sursa: ${escapeHtml(payload.sourceContext)}</div></div><table role="presentation" style="width:100%;border-collapse:collapse;background:#fff;border-radius:0 0 24px 24px;overflow:hidden">${entries.map(([name, entry]) => row(name, entry)).join("")}</table></div></body></html>`;
  return { html, subject, text };
}

export function createCenterEnrollmentNotificationSender(options: {
  environment: EmailEnvironment;
  fetchImpl: EmailFetch;
  timeoutMs?: number;
}) {
  return async function send(
    rawInput: CenterEnrollmentNotificationInput,
  ): Promise<CenterEnrollmentNotificationResult> {
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        errorCode: "invalid_notification_payload",
        ok: false,
        retryable: false,
        status: "failed",
      };
    }

    const apiKey = value(options.environment.RESEND_API_KEY);
    const from = value(options.environment.RESEND_FROM_EMAIL);
    const replyTo = value(options.environment.RESEND_REPLY_TO_EMAIL);
    const staffEmailAddress = value(
      options.environment.REGISTRATIONS_STAFF_EMAIL ||
        options.environment.CENTER_ENROLLMENT_STAFF_EMAIL,
    );
    const recipient =
      parsed.data.recipientKind === "staff"
        ? staffEmailAddress
        : parsed.data.recipientEmail;

    if (
      !apiKey ||
      !from ||
      !plausibleEmail(from) ||
      !recipient ||
      !plausibleEmail(recipient) ||
      (replyTo !== null && !plausibleEmail(replyTo))
    ) {
      return {
        errorCode: "email_not_configured",
        ok: false,
        retryable: true,
        status: "not_configured",
      };
    }

    const rendered =
      parsed.data.recipientKind === "staff"
        ? staffEmail(parsed.data.payload)
        : applicantEmail(parsed.data.payload);
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? defaultTimeoutMs,
    );

    try {
      const response = await options.fetchImpl(resendEndpoint, {
        body: JSON.stringify({
          from,
          html: rendered.html,
          ...(replyTo ? { reply_to: replyTo } : {}),
          subject: rendered.subject,
          text: rendered.text,
          to: [recipient],
        }),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": parsed.data.idempotencyKey,
        },
        method: "POST",
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          errorCode: `resend_http_${response.status}`,
          httpStatus: response.status,
          ok: false,
          retryable: response.status === 429 || response.status >= 500,
          status: "failed",
        };
      }

      const result = z.object({ id: z.string().min(1).max(200) }).safeParse(
        await response.json(),
      );
      if (!result.success) {
        return {
          errorCode: "resend_invalid_response",
          ok: false,
          retryable: true,
          status: "failed",
        };
      }

      return {
        ok: true,
        providerMessageId: result.data.id,
        status: "sent",
      };
    } catch (error) {
      return {
        errorCode:
          error instanceof DOMException && error.name === "AbortError"
            ? "resend_timeout"
            : "resend_network_error",
        ok: false,
        retryable: true,
        status: "failed",
      };
    } finally {
      clearTimeout(timeout);
    }
  };
}
