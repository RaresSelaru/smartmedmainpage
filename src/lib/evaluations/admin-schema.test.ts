import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluationMutationSchema,
  evaluationNotificationRetrySchema,
  evaluationSlotCapacityUpdateSchema,
  evaluationSlotCreateSchema,
} from "./admin-schema.ts";

const publicId = "f64ad949-bdb7-4f45-8383-e26d4bd3da9e";

test("evaluation mutation trims the reason and accepts a replacement slot", () => {
  const result = evaluationMutationSchema.parse({
    publicId,
    reason: "  Cerere telefonică  ",
    slotId: 17,
    status: "confirmed",
  });

  assert.equal(result.reason, "Cerere telefonică");
  assert.equal(result.slotId, 17);
});

test("evaluation mutation rejects unknown statuses and long reasons", () => {
  assert.equal(
    evaluationMutationSchema.safeParse({
      publicId,
      reason: "x".repeat(501),
      slotId: null,
      status: "deleted",
    }).success,
    false,
  );
});

test("slot input requires an offset-aware ISO instant and positive ids", () => {
  assert.equal(
    evaluationSlotCreateSchema.safeParse({
      capacity: 8,
      locationId: 2,
      publicLabel: "Online",
      staffMemberId: 3,
      startsAt: "2026-09-10T15:00:00.000Z",
    }).success,
    true,
  );
  assert.equal(
    evaluationSlotCreateSchema.safeParse({
      capacity: 8,
      locationId: 0,
      publicLabel: null,
      staffMemberId: 3,
      startsAt: "2026-09-10T15:00",
    }).success,
    false,
  );
});

test("slot capacity accepts 1 to 250 whole places", () => {
  for (const capacity of [1, 8, 250]) {
    assert.equal(
      evaluationSlotCapacityUpdateSchema.safeParse({ capacity, slotId: 17 })
        .success,
      true,
    );
  }

  for (const capacity of [0, 2.5, 251]) {
    assert.equal(
      evaluationSlotCapacityUpdateSchema.safeParse({ capacity, slotId: 17 })
        .success,
      false,
    );
  }
});

test("slot creation requires a valid capacity", () => {
  const baseInput = {
    locationId: 2,
    publicLabel: "Evaluare în grup",
    staffMemberId: 3,
    startsAt: "2026-09-10T15:00:00.000Z",
  };

  assert.equal(
    evaluationSlotCreateSchema.safeParse({ ...baseInput, capacity: 8 }).success,
    true,
  );
  assert.equal(
    evaluationSlotCreateSchema.safeParse({ ...baseInput, capacity: 0 }).success,
    false,
  );
  assert.equal(
    evaluationSlotCreateSchema.safeParse({ ...baseInput, capacity: 251 })
      .success,
    false,
  );
});

test("notification retry accepts only a UUID appointment identifier", () => {
  assert.equal(
    evaluationNotificationRetrySchema.safeParse({ publicId }).success,
    true,
  );
  assert.equal(
    evaluationNotificationRetrySchema.safeParse({ publicId: "42" }).success,
    false,
  );
});
