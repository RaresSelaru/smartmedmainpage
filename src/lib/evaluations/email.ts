import "server-only";

import {
  createEvaluationNotificationSender,
  type EvaluationNotificationInput,
  type EvaluationNotificationResult,
} from "@/lib/evaluations/email-core";

export type {
  EvaluationNotificationInput,
  EvaluationNotificationPayload,
  EvaluationNotificationResult,
  EvaluationNotificationType,
} from "@/lib/evaluations/email-core";

/**
 * Sends one already-claimed evaluation notification.
 *
 * Booking state remains authoritative: this function never throws for missing
 * configuration or provider failures. Callers must persist the returned state
 * in the transactional outbox as sent, pending_configuration, or failed.
 */
export async function sendEvaluationNotification(
  input: EvaluationNotificationInput,
): Promise<EvaluationNotificationResult> {
  const sender = createEvaluationNotificationSender({
    environment: {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
      RESEND_REPLY_TO_EMAIL: process.env.RESEND_REPLY_TO_EMAIL,
    },
    fetchImpl: globalThis.fetch,
  });

  return sender(input);
}
