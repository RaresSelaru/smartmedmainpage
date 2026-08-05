import "server-only";

import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/auth/supabase";
import { sendEvaluationNotification } from "@/lib/evaluations/email";
import type { EvaluationNotificationResult } from "@/lib/evaluations/types";

const notificationPayloadSchema = z
  .object({
    customerNotes: z.string().nullable(),
    deliveryMode: z.enum(["online", "in_person"]),
    endsAt: z.iso.datetime({ offset: true }),
    fullName: z.string(),
    locationAddress: z.string().nullable(),
    locationCity: z.string().nullable(),
    locationName: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()).default({}),
    publicId: z.uuid(),
    staffName: z.string().nullable(),
    staffTitle: z.string().nullable(),
    startsAt: z.iso.datetime({ offset: true }),
    status: z.string(),
    timezone: z.string(),
  })
  .strict();

const notificationClaimSchema = z.discriminatedUnion("claimed", [
  z.object({ claimed: z.literal(false) }).strict(),
  z
    .object({
      claimToken: z.uuid(),
      claimed: z.literal(true),
      idempotencyKey: z.string().min(1).max(256),
      notificationId: z.uuid(),
      notificationType: z.enum([
        "evaluation_confirmed",
        "evaluation_rescheduled",
        "evaluation_cancelled",
      ]),
      payload: notificationPayloadSchema,
      recipientEmail: z.email(),
    })
    .strict(),
]);

const queuedResult: EvaluationNotificationResult = {
  message:
    "Programarea este salvată. Confirmarea pe email este deja trimisă sau se află în curs de livrare.",
  state: "queued",
};

export async function dispatchEvaluationNotification(
  publicId: string,
): Promise<EvaluationNotificationResult> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      message:
        "Programarea este salvată. Serviciul de email nu este configurat momentan.",
      state: "not_configured",
    };
  }

  const claimResult = await supabase.rpc(
    "claim_smartmed_evaluation_notification",
    { p_public_id: publicId },
  );

  if (claimResult.error) {
    console.error("SmartMed evaluation email claim failed", {
      code: claimResult.error.code,
      publicId,
    });
    return queuedResult;
  }

  const parsedClaim = notificationClaimSchema.safeParse(claimResult.data);

  if (!parsedClaim.success) {
    console.error("SmartMed evaluation email claim returned an invalid payload", {
      publicId,
    });
    return queuedResult;
  }

  if (!parsedClaim.data.claimed) return queuedResult;

  const claim = parsedClaim.data;
  const delivery = await sendEvaluationNotification({
    idempotencyKey: claim.idempotencyKey,
    notificationType: claim.notificationType,
    payload: claim.payload,
    recipientEmail: claim.recipientEmail,
  });
  const completion = delivery.ok
    ? {
        p_claim_token: claim.claimToken,
        p_notification_id: claim.notificationId,
        p_outcome: "sent",
        p_provider_message_id: delivery.providerMessageId,
      }
    : {
        p_claim_token: claim.claimToken,
        p_error_code: delivery.errorCode,
        p_notification_id: claim.notificationId,
        p_outcome:
          delivery.status === "not_configured"
            ? "pending_configuration"
            : "failed",
      };
  const completionResult = await supabase.rpc(
    "complete_smartmed_evaluation_notification",
    completion,
  );

  if (completionResult.error || completionResult.data !== true) {
    console.error("SmartMed evaluation email completion failed", {
      code: completionResult.error?.code ?? "not_completed",
      notificationId: claim.notificationId,
    });
  }

  if (delivery.ok) {
    return {
      message: "Ți-am trimis confirmarea și toate detaliile pe email.",
      state: "sent",
    };
  }

  if (delivery.status === "not_configured") {
    return {
      message:
        "Programarea este salvată. Emailul va fi livrat după activarea serviciului de mesaje.",
      state: "not_configured",
    };
  }

  return {
    message:
      "Programarea este salvată. Emailul nu a putut fi livrat momentan și poate fi retrimis.",
    state: "failed",
  };
}
