import { z } from "zod";

const resendEndpoint = "https://api.resend.com/emails";
const defaultSiteUrl = "https://smartmed.ro";
const defaultTimeoutMs = 8_000;

export const evaluationNotificationTypes = [
  "evaluation_confirmed",
  "evaluation_rescheduled",
  "evaluation_cancelled",
] as const;

export type EvaluationNotificationType =
  (typeof evaluationNotificationTypes)[number];

type EvaluationEmailEnvironment = {
  NEXT_PUBLIC_SITE_URL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  RESEND_REPLY_TO_EMAIL?: string;
};

type EvaluationNotificationFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type EvaluationNotificationPayload = {
  customerNotes: string | null;
  deliveryMode: "in_person" | "online";
  endsAt: string;
  fullName: string;
  locationAddress: string | null;
  locationCity: string | null;
  locationName: string | null;
  metadata: Record<string, unknown>;
  publicId: string;
  staffName: string | null;
  staffTitle: string | null;
  startsAt: string;
  status: string;
  timezone: string;
};

export type EvaluationNotificationInput = {
  idempotencyKey: string;
  notificationType: EvaluationNotificationType;
  payload: EvaluationNotificationPayload;
  recipientEmail: string;
};

export type EvaluationNotificationResult =
  | {
      ok: true;
      providerMessageId: string;
      status: "sent";
    }
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

type EvaluationNotificationSenderOptions = {
  environment: EvaluationEmailEnvironment;
  fetchImpl: EvaluationNotificationFetch;
  timeoutMs?: number;
};

const nullableText = (maximum: number) =>
  z.preprocess(
    (value) => (value == null ? null : value),
    z.string().trim().max(maximum).nullable(),
  );

const notificationPayloadSchema = z.object({
  customerNotes: nullableText(2_000),
  deliveryMode: z.enum(["online", "in_person"]),
  endsAt: z.string().datetime({ offset: true }),
  fullName: z.string().trim().min(2).max(100),
  locationAddress: nullableText(500),
  locationCity: nullableText(120),
  locationName: nullableText(160),
  metadata: z.record(z.string(), z.unknown()).default({}),
  publicId: z.string().uuid(),
  staffName: nullableText(160),
  staffTitle: nullableText(160),
  startsAt: z.string().datetime({ offset: true }),
  status: z.string().trim().min(1).max(40),
  timezone: z.string().trim().min(1).max(100),
});

const notificationInputSchema = z.object({
  idempotencyKey: z.string().trim().min(1).max(256),
  notificationType: z.enum(evaluationNotificationTypes),
  payload: notificationPayloadSchema,
  recipientEmail: z.string().trim().toLowerCase().email().max(320),
});

type ParsedNotificationInput = z.infer<typeof notificationInputSchema>;

type RenderedEvaluationEmail = {
  html: string;
  subject: string;
  text: string;
};

function normalizedEnvironmentValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function extractEmailAddress(value: string) {
  const bracketMatch = value.match(/<([^<>]+)>\s*$/u);
  return (bracketMatch?.[1] ?? value).trim();
}

function isPlausibleEmail(value: string) {
  return (
    !/[\r\n]/u.test(value) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(extractEmailAddress(value))
  );
}

function resolveConfiguration(environment: EvaluationEmailEnvironment) {
  const apiKey = normalizedEnvironmentValue(environment.RESEND_API_KEY);
  const from = normalizedEnvironmentValue(environment.RESEND_FROM_EMAIL);
  const replyTo = normalizedEnvironmentValue(
    environment.RESEND_REPLY_TO_EMAIL,
  );

  if (
    !apiKey ||
    !from ||
    !isPlausibleEmail(from) ||
    (replyTo !== null && !isPlausibleEmail(replyTo))
  ) {
    return null;
  }

  return {
    apiKey,
    from,
    replyTo,
    siteUrl: resolveSiteUrl(environment.NEXT_PUBLIC_SITE_URL),
  };
}

function resolveSiteUrl(value: string | undefined) {
  try {
    const parsed = new URL(value?.trim() || defaultSiteUrl);
    const isLocalHttp =
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "[::1]");

    if (parsed.protocol !== "https:" && !isLocalHttp) {
      return new URL(defaultSiteUrl);
    }

    parsed.pathname = "/";
    parsed.search = "";
    parsed.hash = "";
    parsed.username = "";
    parsed.password = "";
    return parsed;
  } catch {
    return new URL(defaultSiteUrl);
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function capitalize(value: string) {
  return value.length === 0
    ? value
    : `${value.charAt(0).toLocaleUpperCase("ro-RO")}${value.slice(1)}`;
}

function ensureValidSchedule(payload: EvaluationNotificationPayload) {
  const startsAt = new Date(payload.startsAt);
  const endsAt = new Date(payload.endsAt);

  if (
    Number.isNaN(startsAt.valueOf()) ||
    Number.isNaN(endsAt.valueOf()) ||
    endsAt <= startsAt
  ) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("ro-RO", {
      timeZone: payload.timezone,
    }).format(startsAt);
    return true;
  } catch {
    return false;
  }
}

function formatSchedule(startsAt: string, endsAt: string, timezone: string) {
  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);
  const date = capitalize(
    new Intl.DateTimeFormat("ro-RO", {
      day: "numeric",
      month: "long",
      timeZone: timezone,
      weekday: "long",
      year: "numeric",
    }).format(startDate),
  );
  const timeFormatter = new Intl.DateTimeFormat("ro-RO", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: timezone,
  });

  return {
    date,
    time: `${timeFormatter.format(startDate)}–${timeFormatter.format(endDate)}`,
  };
}

function formatPreviousSchedule(
  payload: EvaluationNotificationPayload,
): string | null {
  const value = payload.metadata.previousStartsAt;

  if (typeof value !== "string") return null;

  const previousDate = new Date(value);
  if (Number.isNaN(previousDate.valueOf())) return null;

  try {
    const date = capitalize(
      new Intl.DateTimeFormat("ro-RO", {
        day: "numeric",
        month: "long",
        timeZone: payload.timezone,
        weekday: "long",
        year: "numeric",
      }).format(previousDate),
    );
    const time = new Intl.DateTimeFormat("ro-RO", {
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      timeZone: payload.timezone,
    }).format(previousDate);

    return `${date}, ${time}`;
  } catch {
    return null;
  }
}

function buildLocation(payload: EvaluationNotificationPayload) {
  if (payload.deliveryMode === "online") {
    return payload.locationName || "Online, în spațiul SmartMed";
  }

  return [payload.locationName, payload.locationAddress, payload.locationCity]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(" · ") || "Centrul SmartMed";
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/u)[0] || "student SmartMed";
}

function notificationCopy(type: EvaluationNotificationType) {
  if (type === "evaluation_rescheduled") {
    return {
      eyebrow: "PROGRAMARE ACTUALIZATĂ",
      heading: "Evaluarea ta a fost reprogramată",
      intro:
        "Am actualizat programarea și am păstrat toate detaliile importante într-un singur loc.",
      subjectLead: "Evaluarea ta SmartMed a fost reprogramată",
    };
  }

  if (type === "evaluation_cancelled") {
    return {
      eyebrow: "PROGRAMARE ANULATĂ",
      heading: "Evaluarea ta a fost anulată",
      intro:
        "Programarea nu mai ocupă intervalul de mai jos. Poți reveni oricând pentru a alege o dată nouă.",
      subjectLead: "Evaluarea ta SmartMed a fost anulată",
    };
  }

  return {
    eyebrow: "PROGRAMARE CONFIRMATĂ",
    heading: "Primul pas este stabilit",
    intro:
      "Evaluarea ta inițială SmartMed este confirmată. Vom clarifica nivelul actual, obiectivul și următorii pași potriviți pentru tine.",
    subjectLead: "Evaluarea ta SmartMed este confirmată",
  };
}

function renderEvaluationEmail(
  input: ParsedNotificationInput,
  siteUrl: URL,
): RenderedEvaluationEmail {
  const { notificationType, payload } = input;
  const copy = notificationCopy(notificationType);
  const schedule = formatSchedule(
    payload.startsAt,
    payload.endsAt,
    payload.timezone,
  );
  const previousSchedule = formatPreviousSchedule(payload);
  const location = buildLocation(payload);
  const facilitator = [payload.staffName, payload.staffTitle]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" · ");
  const format = payload.deliveryMode === "online" ? "Online" : "La centru";
  const manageUrl = new URL("/evaluare", siteUrl);
  const isCancelled = notificationType === "evaluation_cancelled";

  if (!isCancelled) {
    manageUrl.searchParams.set("programare", payload.publicId);
  }

  const actionLabel = isCancelled
    ? "Alege o dată nouă"
    : "Vezi programarea";
  const previousHtml =
    notificationType === "evaluation_rescheduled" && previousSchedule
      ? `<tr><td style="padding:0 0 14px;color:#6b7778;font-size:13px">Data anterioară</td><td style="padding:0 0 14px;text-align:right;color:#223638;font-size:14px;text-decoration:line-through">${escapeHtml(previousSchedule)}</td></tr>`
      : "";
  const facilitatorHtml = facilitator
    ? `<tr><td style="padding:0;color:#6b7778;font-size:13px">Ghid SmartMed</td><td style="padding:0;text-align:right;color:#102f34;font-size:14px;font-weight:700">${escapeHtml(facilitator)}</td></tr>`
    : "";

  const subject = `${copy.subjectLead} — ${schedule.date}`;
  const html = `<!doctype html>
<html lang="ro">
  <body style="margin:0;background:#e9dfcd;color:#102f34;font-family:Arial,Helvetica,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(copy.intro)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e9dfcd;padding:32px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;border-radius:28px;overflow:hidden;background:#f8f3e9;box-shadow:0 18px 48px rgba(4,27,36,.16)">
            <tr>
              <td style="padding:34px 38px;background:#041b24;color:#f8f3e9">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:23px;letter-spacing:.16em">SMARTMED</div>
                <div style="margin-top:8px;color:#d5ae68;font-size:11px;font-weight:700;letter-spacing:.22em">ACADEMY</div>
              </td>
            </tr>
            <tr>
              <td style="padding:42px 38px 18px">
                <div style="color:#137b80;font-size:11px;font-weight:800;letter-spacing:.2em">${copy.eyebrow}</div>
                <h1 style="margin:14px 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:38px;line-height:1.08;font-weight:500;color:#071d27">${escapeHtml(copy.heading)}</h1>
                <p style="margin:0;color:#526365;font-size:16px;line-height:1.75">Bună, ${escapeHtml(firstName(payload.fullName))}. ${escapeHtml(copy.intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 38px">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #d8cdbb;border-radius:20px;background:#fffdf8;padding:24px">
                  ${previousHtml}
                  <tr><td style="padding:0 0 14px;color:#6b7778;font-size:13px">Data</td><td style="padding:0 0 14px;text-align:right;color:#102f34;font-size:14px;font-weight:700">${escapeHtml(schedule.date)}</td></tr>
                  <tr><td style="padding:0 0 14px;color:#6b7778;font-size:13px">Ora României</td><td style="padding:0 0 14px;text-align:right;color:#102f34;font-size:14px;font-weight:700">${escapeHtml(schedule.time)}</td></tr>
                  <tr><td style="padding:0 0 14px;color:#6b7778;font-size:13px">Format</td><td style="padding:0 0 14px;text-align:right;color:#102f34;font-size:14px;font-weight:700">${format}</td></tr>
                  <tr><td style="padding:0 0 14px;color:#6b7778;font-size:13px">Loc</td><td style="padding:0 0 14px;text-align:right;color:#102f34;font-size:14px;font-weight:700">${escapeHtml(location)}</td></tr>
                  ${facilitatorHtml}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 38px 42px">
                <a href="${escapeHtml(manageUrl.toString())}" style="display:inline-block;border-radius:999px;background:#137b80;color:#fffdf8;padding:15px 24px;text-decoration:none;font-size:14px;font-weight:800">${actionLabel}</a>
                <p style="margin:26px 0 0;color:#667577;font-size:13px;line-height:1.65">Ai nevoie de ajutor? Răspunde direct la acest email și echipa SmartMed îți va răspunde.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 38px;border-top:1px solid #ded3c1;color:#7b8686;font-size:11px;line-height:1.6">Acesta este un mesaj tranzacțional despre programarea ta SmartMed, nu o comunicare de marketing.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textLines = [
    copy.eyebrow,
    "",
    `Bună, ${firstName(payload.fullName)}.`,
    copy.intro,
    "",
    ...(notificationType === "evaluation_rescheduled" && previousSchedule
      ? [`Data anterioară: ${previousSchedule}`]
      : []),
    `Data: ${schedule.date}`,
    `Ora României: ${schedule.time}`,
    `Format: ${format}`,
    `Loc: ${location}`,
    ...(facilitator ? [`Ghid SmartMed: ${facilitator}`] : []),
    "",
    `${actionLabel}: ${manageUrl.toString()}`,
    "",
    "Ai nevoie de ajutor? Răspunde direct la acest email.",
    "",
    "Acesta este un mesaj tranzacțional despre programarea ta SmartMed.",
  ];

  return { html, subject, text: textLines.join("\n") };
}

function providerErrorCode(value: unknown, httpStatus: number) {
  const candidate =
    typeof value === "object" && value !== null
      ? "name" in value && typeof value.name === "string"
        ? value.name
        : "error" in value &&
            typeof value.error === "object" &&
            value.error !== null &&
            "name" in value.error &&
            typeof value.error.name === "string"
          ? value.error.name
          : null
      : null;
  const normalized = candidate
    ?.toLowerCase()
    .replace(/[^a-z0-9_]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, 90);

  return normalized
    ? `resend_${normalized}`
    : `resend_http_${httpStatus}`;
}

function isRetryableProviderFailure(
  httpStatus: number,
  errorCode: string,
) {
  return (
    httpStatus === 408 ||
    httpStatus === 425 ||
    httpStatus === 429 ||
    httpStatus >= 500 ||
    errorCode === "resend_concurrent_idempotent_requests"
  );
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function createEvaluationNotificationSender({
  environment,
  fetchImpl,
  timeoutMs = defaultTimeoutMs,
}: EvaluationNotificationSenderOptions) {
  return async function sendEvaluationNotification(
    input: EvaluationNotificationInput,
  ): Promise<EvaluationNotificationResult> {
    const parsed = notificationInputSchema.safeParse(input);

    if (!parsed.success || !ensureValidSchedule(parsed.data.payload)) {
      return {
        errorCode: "invalid_notification_payload",
        ok: false,
        retryable: false,
        status: "failed",
      };
    }

    const configuration = resolveConfiguration(environment);

    if (!configuration) {
      return {
        errorCode: "email_not_configured",
        ok: false,
        retryable: true,
        status: "not_configured",
      };
    }

    const rendered = renderEvaluationEmail(parsed.data, configuration.siteUrl);
    const requestBody: Record<string, unknown> = {
      from: configuration.from,
      html: rendered.html,
      subject: rendered.subject,
      text: rendered.text,
      to: [parsed.data.recipientEmail],
    };

    if (configuration.replyTo) {
      requestBody.reply_to = configuration.replyTo;
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      const response = await fetchImpl(resendEndpoint, {
        body: JSON.stringify(requestBody),
        headers: {
          Authorization: `Bearer ${configuration.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": parsed.data.idempotencyKey,
        },
        method: "POST",
        signal: abortController.signal,
      });
      const responseBody = await safeJson(response);

      if (!response.ok) {
        const errorCode = providerErrorCode(responseBody, response.status);
        return {
          errorCode,
          httpStatus: response.status,
          ok: false,
          retryable: isRetryableProviderFailure(response.status, errorCode),
          status: "failed",
        };
      }

      const providerMessageId =
        typeof responseBody === "object" &&
        responseBody !== null &&
        "id" in responseBody &&
        typeof responseBody.id === "string"
          ? responseBody.id.trim()
          : "";

      if (!providerMessageId) {
        return {
          errorCode: "invalid_provider_response",
          httpStatus: response.status,
          ok: false,
          retryable: true,
          status: "failed",
        };
      }

      return {
        ok: true,
        providerMessageId: providerMessageId.slice(0, 200),
        status: "sent",
      };
    } catch (error) {
      return {
        errorCode:
          error instanceof Error && error.name === "AbortError"
            ? "provider_timeout"
            : "provider_unavailable",
        ok: false,
        retryable: true,
        status: "failed",
      };
    } finally {
      clearTimeout(timeout);
    }
  };
}
