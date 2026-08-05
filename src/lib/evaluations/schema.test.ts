import assert from "node:assert/strict";
import test from "node:test";

import {
  bookEvaluationSchema,
  evaluationAppointmentReceiptSchema,
  rescheduleEvaluationSchema,
} from "@/lib/evaluations/schema";

test("book evaluation accepts the intentionally small public payload", () => {
  const result = bookEvaluationSchema.safeParse({
    bookingRequestId: "5fd112ba-b172-4755-9ddf-849bed2ef57a",
    customerNotes: "Aș vrea să înțeleg de unde încep.",
    goal: "build_plan",
    phone: "+40 721 000 000",
    privacyAccepted: true,
    slotId: 12,
    source: "home-hero",
  });

  assert.equal(result.success, true);
});

test("book evaluation rejects identity fields and missing privacy consent", () => {
  const result = bookEvaluationSchema.safeParse({
    bookingRequestId: "5fd112ba-b172-4755-9ddf-849bed2ef57a",
    email: "forged@example.com",
    goal: "build_plan",
    privacyAccepted: false,
    slotId: 12,
  });

  assert.equal(result.success, false);
});

test("reschedule payload only needs the owned public id and a slot", () => {
  assert.equal(
    rescheduleEvaluationSchema.safeParse({
      publicId: "3cf38920-a141-4037-b5cc-d37da68b81be",
      slotId: 8,
    }).success,
    true,
  );
});

test("appointment receipt validates server RPC output", () => {
  assert.equal(
    evaluationAppointmentReceiptSchema.safeParse({
      bookingVersion: 2,
      endsAt: "2026-08-04T15:30:00+00:00",
      publicId: "3cf38920-a141-4037-b5cc-d37da68b81be",
      locationName: "Online · SmartMed",
      startsAt: "2026-08-04T15:00:00+00:00",
      status: "confirmed",
    }).success,
    true,
  );
});
