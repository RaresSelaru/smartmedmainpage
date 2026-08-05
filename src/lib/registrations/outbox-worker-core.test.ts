import assert from "node:assert/strict";
import test from "node:test";

import {
  isAuthorizedCronRequest,
  parseRegistrationNotificationRetryTargets,
  runRegistrationNotificationWorkerBatch,
} from "./outbox-worker-core.ts";

test("cron authorization fails closed and accepts only the exact bearer secret", () => {
  const secret = "registration-worker-secret";
  assert.equal(isAuthorizedCronRequest(null, undefined), false);
  assert.equal(isAuthorizedCronRequest("Bearer secret", undefined), false);
  assert.equal(isAuthorizedCronRequest(null, "secret"), false);
  assert.equal(isAuthorizedCronRequest("Bearer secret", "secret"), false);
  assert.equal(isAuthorizedCronRequest("Bearer wrong", secret), false);
  assert.equal(isAuthorizedCronRequest(`bearer ${secret}`, secret), false);
  assert.equal(isAuthorizedCronRequest(`Bearer ${secret}`, secret), true);
});

test("retry target parser rejects malformed or unexpectedly broad payloads", () => {
  assert.throws(() =>
    parseRegistrationNotificationRetryTargets({
      targets: [
        {
          email: "student@example.com",
          eventId: 1,
          kind: "event",
          unexpectedPii: "must not pass",
        },
      ],
    }),
  );
});

test("worker dispatches centre and event targets with bounded concurrency", async () => {
  let active = 0;
  let maximumActive = 0;

  async function delivery<T>(state: T) {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise<void>((resolve) => setImmediate(resolve));
    active -= 1;
    return { state };
  }

  const result = await runRegistrationNotificationWorkerBatch({
    concurrency: 2,
    dispatchers: {
      dispatchCenter: async () => delivery("sent" as const),
      dispatchEvent: async ({ eventId }) =>
        eventId === 2
          ? delivery("not_configured" as const)
          : delivery("queued" as const),
    },
    targets: parseRegistrationNotificationRetryTargets({
      targets: [
        {
          kind: "center",
          publicId: "41000000-0000-4000-8000-000000000001",
        },
        { email: "one@example.com", eventId: 1, kind: "event" },
        { email: "two@example.com", eventId: 2, kind: "event" },
      ],
    }),
  });

  assert.equal(maximumActive, 2);
  assert.deepEqual(result, {
    centerTargets: 1,
    dispatchErrors: 0,
    eventTargets: 2,
    failed: 0,
    notConfigured: 1,
    processed: 3,
    queued: 1,
    selected: 3,
    sent: 1,
  });
});

test("one delivery exception does not stop the remaining retry batch", async () => {
  const result = await runRegistrationNotificationWorkerBatch({
    concurrency: 1,
    dispatchers: {
      dispatchCenter: async () => {
        throw new Error("provider unavailable");
      },
      dispatchEvent: async () => ({ state: "sent" }),
    },
    targets: [
      {
        kind: "center",
        publicId: "41000000-0000-4000-8000-000000000001",
      },
      { email: "student@example.com", eventId: 1, kind: "event" },
    ],
  });

  assert.equal(result.dispatchErrors, 1);
  assert.equal(result.processed, 1);
  assert.equal(result.sent, 1);
});
