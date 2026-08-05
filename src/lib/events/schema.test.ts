import assert from "node:assert/strict";
import test from "node:test";

import {
  eventEditorInputSchema,
  publicEventRegistrationSchema,
  registrationRpcResultSchema,
  slugifyEventTitle,
} from "@/lib/events/schema";

const validEvent = {
  allowWaitlist: true,
  capacity: 120,
  contactEmail: "echipa@smartmed.ro",
  coverMediaId: 10,
  deliveryMode: "in_person" as const,
  description:
    "O simulare completă, construită după ritmul și structura admiterii.",
  endsAt: "2026-09-20T12:00:00.000Z",
  eventType: "simulation" as const,
  featured: true,
  locationAddress: "Strada Academiei 10, București",
  locationName: "Centrul SmartMed București",
  priceLabel: "Gratuit",
  registrationClosesAt: "2026-09-18T20:59:00.000Z",
  registrationOpensAt: "2026-08-01T06:00:00.000Z",
  slug: "simulare-nationala-smartmed",
  startsAt: "2026-09-20T08:00:00.000Z",
  status: "published" as const,
  summary:
    "Testează-ți nivelul într-o experiență apropiată de examenul real.",
  title: "Simulare Națională SmartMed",
};

test("event editor accepts a coherent published event", () => {
  assert.equal(eventEditorInputSchema.safeParse(validEvent).success, true);
});

test("event editor rejects waitlists for unlimited events", () => {
  const result = eventEditorInputSchema.safeParse({
    ...validEvent,
    allowWaitlist: true,
    capacity: null,
  });

  assert.equal(result.success, false);
});

test("event editor requires a physical location", () => {
  const result = eventEditorInputSchema.safeParse({
    ...validEvent,
    locationName: null,
  });

  assert.equal(result.success, false);
});

test("event editor requires a cover before publication", () => {
  const result = eventEditorInputSchema.safeParse({
    ...validEvent,
    coverMediaId: null,
  });

  assert.equal(result.success, false);
});

test("public registration keeps the form intentionally small", () => {
  const result = publicEventRegistrationSchema.safeParse({
    email: "student@example.com",
    eventId: 12,
    fullName: "Ana Popescu",
    marketingOptIn: false,
    phone: "0712345678",
    privacyAccepted: true,
    website: "",
  });

  assert.equal(result.success, true);
});

test("public registration requires privacy consent", () => {
  const result = publicEventRegistrationSchema.safeParse({
    email: "student@example.com",
    eventId: 12,
    fullName: "Ana Popescu",
    marketingOptIn: false,
    phone: "",
    privacyAccepted: false,
    website: "",
  });

  assert.equal(result.success, false);
});

test("the honeypot reaches the server-side abuse check", () => {
  const result = publicEventRegistrationSchema.safeParse({
    email: "student@example.com",
    eventId: 12,
    fullName: "Ana Popescu",
    marketingOptIn: false,
    phone: "",
    privacyAccepted: true,
    website: "spam.example",
  });

  assert.equal(result.success, true);
  assert.equal(result.data?.website, "spam.example");
});

test("public registration responses reject participant identifiers and statuses", () => {
  const result = registrationRpcResultSchema.safeParse({
    accepted: true,
    outcome: "received",
    registrationId: "10000000-0000-4000-8000-000000000001",
    status: "confirmed",
  });

  assert.equal(result.success, false);
});

test("event slugs remove Romanian diacritics", () => {
  assert.equal(
    slugifyEventTitle("Înscriere: Simularea Națională 2026"),
    "inscriere-simularea-nationala-2026",
  );
});
