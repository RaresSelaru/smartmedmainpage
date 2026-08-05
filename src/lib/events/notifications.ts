import "server-only";

import { z } from "zod";

import { sendEventRegistrationNotification } from "@/lib/events/email";
import { eventRegistrationNotificationTypes } from "@/lib/events/email-core";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const payloadSchema = z.object({
  contactEmail: z.string().nullable(),
  deliveryMode: z.string(),
  endsAt: z.string(),
  eventId: z.number(),
  eventSlug: z.string(),
  eventTitle: z.string(),
  fullName: z.string(),
  locationAddress: z.string().nullable(),
  locationName: z.string().nullable(),
  outcome: z.enum(["confirmed", "waitlist"]),
  participantEmail: z.string(),
  phone: z.string().nullable(),
  priceLabel: z.string().nullable(),
  registeredAt: z.string(),
  registrationId: z.string(),
  startsAt: z.string(),
}).strict();

const claimResultSchema = z.object({
  claimed: z.array(z.object({
    claimToken: z.uuid(),
    idempotencyKey: z.string(),
    notificationId: z.uuid(),
    notificationType: z.enum(eventRegistrationNotificationTypes),
    payload: payloadSchema,
    recipientEmail: z.string().nullable(),
    recipientKind: z.enum(["participant", "staff"]),
  }).strict()).max(2),
}).strict();

export async function dispatchEventRegistrationNotifications(input: {
  email: string;
  eventId: number;
}) {
  const service = createSupabaseServiceClient();
  if (!service) return { state: "not_configured" as const };

  const target = await service
    .from("event_registrations")
    .select("id")
    .eq("event_id", input.eventId)
    .eq("normalized_email", input.email.trim().toLowerCase())
    .maybeSingle();
  if (target.error || !target.data) {
    console.error("SmartMed event registration email target failed", {
      code: target.error?.code ?? "not_found",
    });
    return { state: "queued" as const };
  }

  const claimed = await service.rpc("claim_event_registration_notifications", {
    p_registration_id: target.data.id,
  });
  if (claimed.error) {
    console.error("SmartMed event registration email claim failed", { code: claimed.error.code });
    return { state: "queued" as const };
  }
  const parsed = claimResultSchema.safeParse(claimed.data);
  if (!parsed.success || parsed.data.claimed.length === 0) {
    return { state: "queued" as const };
  }

  const results = await Promise.all(parsed.data.claimed.map(async (claim) => {
    const delivery = await sendEventRegistrationNotification({
      idempotencyKey: claim.idempotencyKey,
      notificationType: claim.notificationType,
      payload: claim.payload,
      recipientEmail: claim.recipientEmail,
      recipientKind: claim.recipientKind,
    });
    const completed = await service.rpc("complete_event_registration_notification", delivery.ok
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
          p_outcome: delivery.status === "not_configured" ? "pending_configuration" : "failed",
        });
    if (completed.error || completed.data !== true) {
      console.error("SmartMed event registration email completion failed", {
        code: completed.error?.code ?? "not_completed",
      });
    }
    return delivery;
  }));

  if (results.some((result) => result.status === "failed")) return { state: "failed" as const };
  if (results.some((result) => result.status === "not_configured")) return { state: "not_configured" as const };
  return { state: "sent" as const };
}
