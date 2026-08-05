import assert from "node:assert/strict";
import test from "node:test";

import {
  createEventRegistrationNotificationSender,
  type EventRegistrationNotificationInput,
} from "./email-core.ts";

const payload: EventRegistrationNotificationInput["payload"] = {
  contactEmail: "contact@smartmed.ro",
  deliveryMode: "in_person",
  endsAt: "2026-08-30T14:00:00+03:00",
  eventId: 4,
  eventSlug: "simulare-nationala",
  eventTitle: "Simulare Națională SmartMed",
  fullName: "Student SmartMed",
  locationAddress: "București",
  locationName: "Centrul SmartMed",
  outcome: "confirmed",
  participantEmail: "student@example.com",
  phone: "0712345678",
  priceLabel: "150 lei",
  registeredAt: "2026-08-02T10:00:00+03:00",
  registrationId: "41000000-0000-4000-8000-000000000002",
  startsAt: "2026-08-30T10:00:00+03:00",
};

test("event confirmation is addressed to the participant", async () => {
  const bodies: Array<{ subject: string; to: string[] }> = [];
  const sender = createEventRegistrationNotificationSender({
    environment: {
      REGISTRATIONS_STAFF_EMAIL: "echipa@smartmed.ro",
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: "SmartMed <mail@smartmed.ro>",
    },
    fetchImpl: async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ id: "msg_event" }), { status: 200 });
    },
  });
  const result = await sender({
    idempotencyKey: "event:confirmation",
    notificationType: "event_registration_confirmation",
    payload,
    recipientEmail: payload.participantEmail,
    recipientKind: "participant",
  });
  assert.equal(result.ok, true);
  const body = bodies[0];
  assert.ok(body);
  assert.deepEqual(body.to, ["student@example.com"]);
  assert.match(body.subject, /Înscriere confirmată/u);
});

test("event sender rejects a mismatched notification kind", async () => {
  const sender = createEventRegistrationNotificationSender({
    environment: {
      REGISTRATIONS_STAFF_EMAIL: "echipa@smartmed.ro",
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: "mail@smartmed.ro",
    },
    fetchImpl: async () => new Response(JSON.stringify({ id: "never" })),
  });
  const result = await sender({
    idempotencyKey: "event:wrong",
    notificationType: "event_registration_staff_alert",
    payload,
    recipientEmail: payload.participantEmail,
    recipientKind: "participant",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.errorCode, "invalid_notification_type");
});
