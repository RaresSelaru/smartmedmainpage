import assert from "node:assert/strict";
import test from "node:test";

import {
  createCenterEnrollmentNotificationSender,
  type CenterEnrollmentNotificationInput,
} from "./email-core.ts";

const payload: CenterEnrollmentNotificationInput["payload"] = {
  biologyLevel: "intermediate",
  birthDate: "2000-05-12",
  chemistryLevel: null,
  createdAt: "2026-08-02T10:00:00+03:00",
  currentGrade: "grade_11",
  deliveryMode: "in_person",
  email: "student@example.com",
  examYear: 2028,
  fullName: "Student SmartMed",
  guardianEmail: null,
  guardianName: null,
  guardianPhone: null,
  highSchool: "Colegiul Național",
  localityCounty: "București",
  participantStatus: "adult",
  phone: "0712345678",
  preparationTypes: ["courses"],
  previousTutoring: true,
  publicId: "41000000-0000-4000-8000-000000000001",
  selectedPlanName: "Centru Plus",
  selectedPlanSlug: "centru-plus",
  sourceContext: "homepage-hero",
  studyProfile: "Științe ale naturii",
  subjects: ["biology_corint"],
  targetUniversity: "umf_bucharest",
  targetUniversityOther: null,
  whatsappOptIn: true,
};

test("center email sender keeps a missing configuration retryable", async () => {
  const sender = createCenterEnrollmentNotificationSender({
    environment: {},
    fetchImpl: async () => {
      throw new Error("must not send");
    },
  });
  const result = await sender({
    idempotencyKey: "center:confirmation",
    notificationType: "center_enrollment_confirmation",
    payload,
    recipientEmail: payload.email,
    recipientKind: "applicant",
  });
  assert.deepEqual(result, {
    errorCode: "email_not_configured",
    ok: false,
    retryable: true,
    status: "not_configured",
  });
});

test("staff alerts use the dedicated staff inbox and Resend idempotency", async () => {
  let request: RequestInit | undefined;
  const sender = createCenterEnrollmentNotificationSender({
    environment: {
      REGISTRATIONS_STAFF_EMAIL: "echipa@smartmed.ro",
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: "SmartMed <mail@smartmed.ro>",
      RESEND_REPLY_TO_EMAIL: "contact@smartmed.ro",
    },
    fetchImpl: async (_input, init) => {
      request = init;
      return new Response(JSON.stringify({ id: "msg_123" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    },
  });
  const result = await sender({
    idempotencyKey: "center:staff",
    notificationType: "center_enrollment_staff_alert",
    payload,
    recipientEmail: null,
    recipientKind: "staff",
  });
  assert.equal(result.ok, true);
  assert.equal(new Headers(request?.headers).get("Idempotency-Key"), "center:staff");
  const body = JSON.parse(String(request?.body)) as {
    html: string;
    text: string;
    to: string[];
  };
  assert.deepEqual(body.to, ["echipa@smartmed.ro"]);
  assert.match(body.html, /Centru Plus/u);
  assert.match(body.text, /Abonament ales: Centru Plus/u);
});

test("applicant confirmation names the selected plan", async () => {
  let request: RequestInit | undefined;
  const sender = createCenterEnrollmentNotificationSender({
    environment: {
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: "SmartMed <mail@smartmed.ro>",
    },
    fetchImpl: async (_input, init) => {
      request = init;
      return new Response(JSON.stringify({ id: "msg_applicant" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    },
  });

  const result = await sender({
    idempotencyKey: "center:confirmation:plan",
    notificationType: "center_enrollment_confirmation",
    payload,
    recipientEmail: payload.email,
    recipientKind: "applicant",
  });
  const body = JSON.parse(String(request?.body)) as {
    html: string;
    text: string;
  };

  assert.equal(result.ok, true);
  assert.match(body.html, /Abonamentul ales/u);
  assert.match(body.html, /Centru Plus/u);
  assert.match(body.text, /Ai ales abonamentul Centru Plus/u);
});
