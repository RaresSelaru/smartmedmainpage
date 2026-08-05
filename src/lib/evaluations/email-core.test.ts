import assert from "node:assert/strict";
import test from "node:test";

import {
  createEvaluationNotificationSender,
  type EvaluationNotificationInput,
} from "@/lib/evaluations/email-core";

const configuredEnvironment = {
  NEXT_PUBLIC_SITE_URL: "https://smartmed.ro",
  RESEND_API_KEY: "re_test_smartmed",
  RESEND_FROM_EMAIL: "SmartMed Academy <programari@smartmed.ro>",
  RESEND_REPLY_TO_EMAIL: "echipa@smartmed.ro",
};

function notificationInput(
  overrides: Partial<EvaluationNotificationInput> = {},
): EvaluationNotificationInput {
  return {
    idempotencyKey:
      "evaluation_confirmed/10000000-0000-4000-8000-000000000001/v1",
    notificationType: "evaluation_confirmed",
    payload: {
      customerNotes: "Informație privată care nu trebuie repetată în email.",
      deliveryMode: "in_person",
      endsAt: "2026-09-15T12:45:00.000Z",
      fullName: "Ana Popescu",
      locationAddress: "Strada Academiei 10",
      locationCity: "București",
      locationName: "Centrul SmartMed București",
      metadata: {
        evaluationGoal: "Un plan clar pentru admitere",
      },
      publicId: "10000000-0000-4000-8000-000000000001",
      staffName: "Dr. Andrei Ionescu",
      staffTitle: "Medic coordonator",
      startsAt: "2026-09-15T12:00:00.000Z",
      status: "confirmed",
      timezone: "Europe/Bucharest",
    },
    recipientEmail: "ana@example.com",
    ...overrides,
  };
}

test("reports missing email configuration without attempting delivery", async () => {
  let fetchCalled = false;
  const send = createEvaluationNotificationSender({
    environment: {
      NEXT_PUBLIC_SITE_URL: "https://smartmed.ro",
      RESEND_API_KEY: "",
      RESEND_FROM_EMAIL: "",
    },
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response();
    },
  });

  const result = await send(notificationInput());

  assert.deepEqual(result, {
    errorCode: "email_not_configured",
    ok: false,
    retryable: true,
    status: "not_configured",
  });
  assert.equal(fetchCalled, false);
});

test("rejects unsafe sender configuration without contacting Resend", async () => {
  let fetchCalled = false;
  const send = createEvaluationNotificationSender({
    environment: {
      ...configuredEnvironment,
      RESEND_FROM_EMAIL:
        "SmartMed Academy\r\nBcc: attacker@example.com <programari@smartmed.ro>",
    },
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response();
    },
  });

  const result = await send(notificationInput());

  assert.equal(result.status, "not_configured");
  assert.equal(fetchCalled, false);
});

test("sends a branded confirmation through the Resend REST API", async () => {
  const calls: Array<{ init?: RequestInit; input: string | URL | Request }> = [];
  const send = createEvaluationNotificationSender({
    environment: configuredEnvironment,
    fetchImpl: async (input, init) => {
      calls.push({ init, input });
      return Response.json({ id: "email-confirmed-1" }, { status: 200 });
    },
  });

  const result = await send(notificationInput());

  assert.deepEqual(result, {
    ok: true,
    providerMessageId: "email-confirmed-1",
    status: "sent",
  });
  assert.equal(calls.length, 1);
  assert.equal(String(calls[0]?.input), "https://api.resend.com/emails");
  assert.equal(calls[0]?.init?.method, "POST");

  const headers = new Headers(calls[0]?.init?.headers);
  assert.equal(headers.get("Authorization"), "Bearer re_test_smartmed");
  assert.equal(
    headers.get("Idempotency-Key"),
    notificationInput().idempotencyKey,
  );

  const body = JSON.parse(String(calls[0]?.init?.body)) as Record<
    string,
    unknown
  >;
  assert.equal(
    body.from,
    "SmartMed Academy <programari@smartmed.ro>",
  );
  assert.deepEqual(body.to, ["ana@example.com"]);
  assert.equal(body.reply_to, "echipa@smartmed.ro");
  assert.match(String(body.subject), /este confirmată/u);
  assert.match(String(body.html), /Marți, 15 septembrie 2026/u);
  assert.match(String(body.html), /15:00–15:45/u);
  assert.match(String(body.html), /Centrul SmartMed București/u);
  assert.match(String(body.text), /Vezi programarea: https:\/\/smartmed\.ro\/evaluare\?programare=/u);
  assert.doesNotMatch(String(body.html), /Informație privată/u);
  assert.doesNotMatch(String(body.text), /Informație privată/u);
});

test("renders the previous schedule in a rescheduling notice", async () => {
  let requestBody: Record<string, unknown> = {};
  const send = createEvaluationNotificationSender({
    environment: configuredEnvironment,
    fetchImpl: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({ id: "email-rescheduled-1" }, { status: 200 });
    },
  });
  const input = notificationInput({
    idempotencyKey:
      "evaluation_rescheduled/10000000-0000-4000-8000-000000000001/v2",
    notificationType: "evaluation_rescheduled",
    payload: {
      ...notificationInput().payload,
      metadata: {
        previousStartsAt: "2026-09-14T12:00:00.000Z",
      },
    },
  });

  const result = await send(input);

  assert.equal(result.status, "sent");
  assert.match(String(requestBody?.subject), /a fost reprogramată/u);
  assert.match(String(requestBody?.html), /Data anterioară/u);
  assert.match(String(requestBody?.text), /Luni, 14 septembrie 2026, 15:00/u);
});

test("renders an honest cancellation and a fresh booking link", async () => {
  let requestBody: Record<string, unknown> = {};
  const send = createEvaluationNotificationSender({
    environment: configuredEnvironment,
    fetchImpl: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({ id: "email-cancelled-1" }, { status: 200 });
    },
  });

  const result = await send(
    notificationInput({
      idempotencyKey:
        "evaluation_cancelled/10000000-0000-4000-8000-000000000001/v2",
      notificationType: "evaluation_cancelled",
      payload: {
        ...notificationInput().payload,
        status: "cancelled",
      },
    }),
  );

  assert.equal(result.status, "sent");
  assert.match(String(requestBody?.subject), /a fost anulată/u);
  assert.match(String(requestBody?.text), /Alege o dată nouă: https:\/\/smartmed\.ro\/evaluare/u);
  assert.doesNotMatch(String(requestBody?.text), /\?programare=/u);
});

test("marks Resend rate limits as retryable without exposing provider messages", async () => {
  const send = createEvaluationNotificationSender({
    environment: configuredEnvironment,
    fetchImpl: async () =>
      Response.json(
        {
          message: "Sensitive provider detail",
          name: "rate_limit_exceeded",
        },
        { status: 429 },
      ),
  });

  const result = await send(notificationInput());

  assert.deepEqual(result, {
    errorCode: "resend_rate_limit_exceeded",
    httpStatus: 429,
    ok: false,
    retryable: true,
    status: "failed",
  });
  assert.doesNotMatch(JSON.stringify(result), /Sensitive provider detail/u);
});

test("marks permanent provider validation failures as non-retryable", async () => {
  const send = createEvaluationNotificationSender({
    environment: configuredEnvironment,
    fetchImpl: async () =>
      Response.json({ name: "validation_error" }, { status: 422 }),
  });

  const result = await send(notificationInput());

  assert.deepEqual(result, {
    errorCode: "resend_validation_error",
    httpStatus: 422,
    ok: false,
    retryable: false,
    status: "failed",
  });
});

test("rejects malformed schedules before any provider call", async () => {
  let fetchCalled = false;
  const send = createEvaluationNotificationSender({
    environment: configuredEnvironment,
    fetchImpl: async () => {
      fetchCalled = true;
      return Response.json({ id: "must-not-send" });
    },
  });
  const result = await send(
    notificationInput({
      payload: {
        ...notificationInput().payload,
        timezone: "Not/A_Timezone",
      },
    }),
  );

  assert.deepEqual(result, {
    errorCode: "invalid_notification_payload",
    ok: false,
    retryable: false,
    status: "failed",
  });
  assert.equal(fetchCalled, false);
});

test("turns transport errors into retryable failures", async () => {
  const send = createEvaluationNotificationSender({
    environment: configuredEnvironment,
    fetchImpl: async () => {
      throw new TypeError("network unavailable");
    },
  });

  const result = await send(notificationInput());

  assert.deepEqual(result, {
    errorCode: "provider_unavailable",
    ok: false,
    retryable: true,
    status: "failed",
  });
});
