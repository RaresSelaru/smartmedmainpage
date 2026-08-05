import { timingSafeEqual } from "node:crypto";

import { z } from "zod";

const centerRetryTargetSchema = z
  .object({
    kind: z.literal("center"),
    publicId: z.uuid(),
  })
  .strict();

const eventRetryTargetSchema = z
  .object({
    email: z.email().max(320),
    eventId: z.number().int().positive(),
    kind: z.literal("event"),
  })
  .strict();

const retryTargetsResponseSchema = z
  .object({
    targets: z
      .array(z.discriminatedUnion("kind", [
        centerRetryTargetSchema,
        eventRetryTargetSchema,
      ]))
      .max(50),
  })
  .strict();

export type RegistrationNotificationRetryTarget = z.infer<
  typeof retryTargetsResponseSchema
>["targets"][number];

type DispatchState = "failed" | "not_configured" | "queued" | "sent";

type RegistrationNotificationDispatchers = {
  dispatchCenter: (input: {
    publicId: string;
  }) => Promise<{ state: DispatchState }>;
  dispatchEvent: (input: {
    email: string;
    eventId: number;
  }) => Promise<{ state: DispatchState }>;
};

export type RegistrationNotificationWorkerResult = {
  centerTargets: number;
  dispatchErrors: number;
  eventTargets: number;
  failed: number;
  notConfigured: number;
  processed: number;
  queued: number;
  selected: number;
  sent: number;
};

export function isAuthorizedCronRequest(
  authorizationHeader: string | null,
  configuredSecret: string | undefined,
) {
  if (!configuredSecret || configuredSecret.length < 16 || !authorizationHeader) {
    return false;
  }

  const actual = Buffer.from(authorizationHeader, "utf8");
  const expected = Buffer.from(`Bearer ${configuredSecret}`, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function parseRegistrationNotificationRetryTargets(input: unknown) {
  return retryTargetsResponseSchema.parse(input).targets;
}

export async function runRegistrationNotificationWorkerBatch(input: {
  concurrency?: number;
  dispatchers: RegistrationNotificationDispatchers;
  targets: RegistrationNotificationRetryTarget[];
}): Promise<RegistrationNotificationWorkerResult> {
  const result: RegistrationNotificationWorkerResult = {
    centerTargets: input.targets.filter((target) => target.kind === "center")
      .length,
    dispatchErrors: 0,
    eventTargets: input.targets.filter((target) => target.kind === "event")
      .length,
    failed: 0,
    notConfigured: 0,
    processed: 0,
    queued: 0,
    selected: input.targets.length,
    sent: 0,
  };

  if (input.targets.length === 0) return result;

  const requestedConcurrency = Math.trunc(input.concurrency ?? 3);
  const concurrency = Math.min(
    input.targets.length,
    Math.max(1, Number.isFinite(requestedConcurrency) ? requestedConcurrency : 1),
  );
  let nextTargetIndex = 0;

  async function consumeTargets() {
    while (nextTargetIndex < input.targets.length) {
      const target = input.targets[nextTargetIndex];
      nextTargetIndex += 1;
      if (!target) continue;

      try {
        const delivery =
          target.kind === "center"
            ? await input.dispatchers.dispatchCenter({
                publicId: target.publicId,
              })
            : await input.dispatchers.dispatchEvent({
                email: target.email,
                eventId: target.eventId,
              });

        result.processed += 1;
        if (delivery.state === "not_configured") {
          result.notConfigured += 1;
        } else {
          result[delivery.state] += 1;
        }
      } catch {
        result.dispatchErrors += 1;
      }
    }
  }

  await Promise.all(
    Array.from({ length: concurrency }, async () => consumeTargets()),
  );
  return result;
}
