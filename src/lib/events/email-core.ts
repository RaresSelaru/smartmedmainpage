import { z } from "zod";

const endpoint = "https://api.resend.com/emails";

export const eventRegistrationNotificationTypes = [
  "event_registration_confirmation",
  "event_registration_staff_alert",
] as const;

export type EventRegistrationNotificationPayload = {
  contactEmail: string | null;
  deliveryMode: string;
  endsAt: string;
  eventId: number;
  eventSlug: string;
  eventTitle: string;
  fullName: string;
  locationAddress: string | null;
  locationName: string | null;
  outcome: "confirmed" | "waitlist";
  participantEmail: string;
  phone: string | null;
  priceLabel: string | null;
  registeredAt: string;
  registrationId: string;
  startsAt: string;
};

export type EventRegistrationNotificationInput = {
  idempotencyKey: string;
  notificationType: (typeof eventRegistrationNotificationTypes)[number];
  payload: EventRegistrationNotificationPayload;
  recipientEmail: string | null;
  recipientKind: "participant" | "staff";
};

export type EventRegistrationNotificationResult =
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

const nullableText = (maximum: number) =>
  z.preprocess(
    (value) => (value == null ? null : value),
    z.string().trim().max(maximum).nullable(),
  );

const payloadSchema = z
  .object({
    contactEmail: z.preprocess(
      (value) => (value == null ? null : value),
      z.email().max(320).nullable(),
    ),
    deliveryMode: z.enum(["online", "in_person", "hybrid"]),
    endsAt: z.iso.datetime({ offset: true }),
    eventId: z.number().int().positive(),
    eventSlug: z.string().min(1).max(160),
    eventTitle: z.string().min(4).max(160),
    fullName: z.string().min(2).max(120),
    locationAddress: nullableText(500),
    locationName: nullableText(160),
    outcome: z.enum(["confirmed", "waitlist"]),
    participantEmail: z.email().max(320),
    phone: nullableText(32),
    priceLabel: nullableText(80),
    registeredAt: z.iso.datetime({ offset: true }),
    registrationId: z.uuid(),
    startsAt: z.iso.datetime({ offset: true }),
  })
  .strict();

const inputSchema = z
  .object({
    idempotencyKey: z.string().min(1).max(256),
    notificationType: z.enum(eventRegistrationNotificationTypes),
    payload: payloadSchema,
    recipientEmail: z.preprocess(
      (value) => (value == null ? null : value),
      z.email().max(320).nullable(),
    ),
    recipientKind: z.enum(["participant", "staff"]),
  })
  .strict();

function clean(value: string | undefined) {
  return value?.trim() || null;
}

function address(value: string) {
  const match = value.match(/<([^<>]+)>\s*$/u);
  return (match?.[1] ?? value).trim();
}

function plausibleEmail(value: string) {
  return !/[\r\n]/u.test(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(address(value));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function schedule(payload: EventRegistrationNotificationPayload) {
  const startsAt = new Date(payload.startsAt);
  const endsAt = new Date(payload.endsAt);
  const date = new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Bucharest",
    weekday: "long",
    year: "numeric",
  }).format(startsAt);
  const time = new Intl.DateTimeFormat("ro-RO", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: "Europe/Bucharest",
  });
  return `${date}, ${time.format(startsAt)}–${time.format(endsAt)}`;
}

function participantEmail(payload: EventRegistrationNotificationPayload) {
  const waitlist = payload.outcome === "waitlist";
  const subject = waitlist
    ? `Ești pe lista de așteptare — ${payload.eventTitle}`
    : `Înscriere confirmată — ${payload.eventTitle}`;
  const statusText = waitlist
    ? "Te-am adăugat pe lista de așteptare. Dacă se eliberează un loc, echipa SmartMed te va contacta."
    : "Locul tău este confirmat. Păstrează acest email pentru detaliile evenimentului.";
  const location =
    payload.deliveryMode === "online"
      ? "Online — detaliile de acces vor veni înainte de eveniment"
      : [payload.locationName, payload.locationAddress].filter(Boolean).join(", ");
  const text = `${statusText}\n\n${payload.eventTitle}\n${schedule(payload)}\n${location}`;
  const html = `<!doctype html><html lang="ro"><body style="margin:0;background:#f3ecdf;font-family:Arial,sans-serif;color:#071923"><div style="max-width:680px;margin:0 auto;padding:32px 18px"><div style="border-radius:28px;background:#061923;padding:32px;color:white"><div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#89d1d4">SmartMed Academy</div><h1 style="font-family:Georgia,serif;font-size:36px;line-height:1.08;margin:18px 0">${waitlist ? "Ești pe lista de așteptare." : "Locul tău este confirmat."}</h1><p style="font-size:16px;line-height:1.7;color:#dce5e6">${escapeHtml(statusText)}</p></div><div style="border-radius:0 0 28px 28px;background:#fff;padding:28px"><h2 style="font-family:Georgia,serif;font-size:28px;margin:0 0 18px">${escapeHtml(payload.eventTitle)}</h2><p style="font-size:15px;line-height:1.7"><strong>Când:</strong> ${escapeHtml(schedule(payload))}<br><strong>Unde:</strong> ${escapeHtml(location || "Detaliile vor fi comunicate de echipă")}${payload.priceLabel ? `<br><strong>Cost:</strong> ${escapeHtml(payload.priceLabel)}` : ""}</p><p style="margin-top:24px;color:#647078;font-size:14px">Pentru întrebări, răspunde direct la acest email.</p></div></div></body></html>`;
  return { html, subject, text };
}

function staffEmail(payload: EventRegistrationNotificationPayload) {
  const status = payload.outcome === "waitlist" ? "Listă de așteptare" : "Confirmat";
  const subject = `Înscriere eveniment — ${payload.eventTitle}`;
  const lines = [
    `Participant: ${payload.fullName}`,
    `Email: ${payload.participantEmail}`,
    `Telefon: ${payload.phone ?? "—"}`,
    `Status: ${status}`,
    `Eveniment: ${payload.eventTitle}`,
    `Program: ${schedule(payload)}`,
  ];
  const html = `<!doctype html><html lang="ro"><body style="margin:0;background:#f3ecdf;font-family:Arial,sans-serif;color:#071923"><div style="max-width:680px;margin:0 auto;padding:32px 18px"><div style="border-radius:26px;background:#061923;padding:30px;color:white"><div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#89d1d4">Înscriere nouă la eveniment</div><h1 style="font-family:Georgia,serif;font-size:32px;margin:16px 0 8px">${escapeHtml(payload.fullName)}</h1><p style="color:#dce5e6">${escapeHtml(payload.eventTitle)}</p></div><div style="border-radius:0 0 26px 26px;background:#fff;padding:28px;font-size:15px;line-height:1.8">${lines.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</div></div></body></html>`;
  return { html, subject, text: lines.join("\n") };
}

export function createEventRegistrationNotificationSender(options: {
  environment: {
    REGISTRATIONS_STAFF_EMAIL?: string;
    RESEND_API_KEY?: string;
    RESEND_FROM_EMAIL?: string;
    RESEND_REPLY_TO_EMAIL?: string;
  };
  fetchImpl: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
  timeoutMs?: number;
}) {
  return async (
    rawInput: EventRegistrationNotificationInput,
  ): Promise<EventRegistrationNotificationResult> => {
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { errorCode: "invalid_notification_payload", ok: false, retryable: false, status: "failed" };
    }
    const expectedType = parsed.data.recipientKind === "participant"
      ? "event_registration_confirmation"
      : "event_registration_staff_alert";
    if (parsed.data.notificationType !== expectedType) {
      return { errorCode: "invalid_notification_type", ok: false, retryable: false, status: "failed" };
    }

    const apiKey = clean(options.environment.RESEND_API_KEY);
    const from = clean(options.environment.RESEND_FROM_EMAIL);
    const replyTo = clean(options.environment.RESEND_REPLY_TO_EMAIL);
    const recipient = parsed.data.recipientKind === "staff"
      ? clean(options.environment.REGISTRATIONS_STAFF_EMAIL)
      : parsed.data.recipientEmail;
    if (!apiKey || !from || !recipient || !plausibleEmail(from) || !plausibleEmail(recipient) || (replyTo !== null && !plausibleEmail(replyTo))) {
      return { errorCode: "email_not_configured", ok: false, retryable: true, status: "not_configured" };
    }

    const rendered = parsed.data.recipientKind === "staff"
      ? staffEmail(parsed.data.payload)
      : participantEmail(parsed.data.payload);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000);
    try {
      const response = await options.fetchImpl(endpoint, {
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
      const responseBody = z.object({ id: z.string().min(1).max(200) }).safeParse(await response.json());
      if (!responseBody.success) {
        return { errorCode: "resend_invalid_response", ok: false, retryable: true, status: "failed" };
      }
      return { ok: true, providerMessageId: responseBody.data.id, status: "sent" };
    } catch (error) {
      return {
        errorCode: error instanceof DOMException && error.name === "AbortError" ? "resend_timeout" : "resend_network_error",
        ok: false,
        retryable: true,
        status: "failed",
      };
    } finally {
      clearTimeout(timeout);
    }
  };
}
