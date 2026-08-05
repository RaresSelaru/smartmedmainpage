import "server-only";

import { z } from "zod";

import { sendCenterEnrollmentNotification } from "@/lib/center-enrollments/email";
import { centerEnrollmentNotificationTypes } from "@/lib/center-enrollments/email-core";
import { CENTER_ENROLLMENT_PLAN_SLUGS } from "@/lib/center-enrollments/plans";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const payloadSchema = z
  .object({
    biologyLevel: z.string().nullable(),
    birthDate: z.string(),
    chemistryLevel: z.string().nullable(),
    createdAt: z.string(),
    currentGrade: z.string(),
    deliveryMode: z.string(),
    email: z.string(),
    examYear: z.number(),
    fullName: z.string(),
    guardianEmail: z.string().nullable(),
    guardianName: z.string().nullable(),
    guardianPhone: z.string().nullable(),
    highSchool: z.string(),
    localityCounty: z.string(),
    participantStatus: z.enum(["adult", "minor"]),
    phone: z.string(),
    preparationTypes: z.array(z.string()),
    previousTutoring: z.boolean(),
    publicId: z.string(),
    selectedPlanName: z.string().min(1).max(120).nullable().optional(),
    selectedPlanSlug: z
      .enum(CENTER_ENROLLMENT_PLAN_SLUGS)
      .nullable()
      .optional(),
    sourceContext: z.string(),
    studyProfile: z.string(),
    subjects: z.array(z.string()),
    targetUniversity: z.string(),
    targetUniversityOther: z.string().nullable(),
    whatsappOptIn: z.boolean(),
  })
  .strict();

const claimSchema = z
  .object({
    claimToken: z.uuid(),
    idempotencyKey: z.string().min(1).max(256),
    notificationId: z.uuid(),
    notificationType: z.enum(centerEnrollmentNotificationTypes),
    payload: payloadSchema,
    recipientEmail: z.string().email().max(320).nullable(),
    recipientKind: z.enum(["applicant", "staff"]),
  })
  .strict();

const claimResultSchema = z
  .object({ claimed: z.array(claimSchema).max(2) })
  .strict();

export type CenterEnrollmentEmailStatus =
  | "failed"
  | "not_configured"
  | "queued"
  | "sent";

export type CenterEnrollmentDispatchResult = {
  message: string;
  state: CenterEnrollmentEmailStatus;
};

const queuedResult: CenterEnrollmentDispatchResult = {
  message:
    "Înscrierea este salvată. Confirmarea pe email este deja trimisă sau se află în curs de livrare.",
  state: "queued",
};

async function resolvePublicId(
  followUpToken: string | undefined,
  suppliedPublicId: string | undefined,
) {
  if (suppliedPublicId) return suppliedPublicId;
  if (!followUpToken) return null;

  const service = createSupabaseServiceClient();
  if (!service) return null;

  const lookup = await service
    .from("center_enrollments")
    .select("public_id")
    .eq("follow_up_token", followUpToken)
    .maybeSingle();

  if (lookup.error) {
    console.error("SmartMed center enrollment notification target failed", {
      code: lookup.error.code,
    });
  }

  return lookup.data?.public_id ?? null;
}

export async function dispatchCenterEnrollmentNotifications(input: {
  followUpToken?: string;
  publicId?: string;
}): Promise<CenterEnrollmentDispatchResult> {
  const service = createSupabaseServiceClient();
  if (!service) {
    return {
      message:
        "Înscrierea este salvată. Emailul va fi livrat după configurarea serviciului de mesaje.",
      state: "not_configured",
    };
  }

  const publicId = await resolvePublicId(input.followUpToken, input.publicId);
  if (!publicId) return queuedResult;

  const claimed = await service.rpc("claim_center_enrollment_notifications", {
    p_public_id: publicId,
  });
  if (claimed.error) {
    console.error("SmartMed center enrollment email claim failed", {
      code: claimed.error.code,
      publicId,
    });
    return queuedResult;
  }

  const parsed = claimResultSchema.safeParse(claimed.data);
  if (!parsed.success) {
    console.error("SmartMed center enrollment email claim was invalid", {
      publicId,
    });
    return queuedResult;
  }

  if (parsed.data.claimed.length === 0) return queuedResult;

  const deliveries = await Promise.all(
    parsed.data.claimed.map(async (claim) => {
      const delivery = await sendCenterEnrollmentNotification({
        idempotencyKey: claim.idempotencyKey,
        notificationType: claim.notificationType,
        payload: claim.payload,
        recipientEmail: claim.recipientEmail,
        recipientKind: claim.recipientKind,
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
      const completed = await service.rpc(
        "complete_center_enrollment_notification",
        completion,
      );

      if (completed.error || completed.data !== true) {
        console.error("SmartMed center enrollment email completion failed", {
          code: completed.error?.code ?? "not_completed",
          notificationId: claim.notificationId,
        });
      }

      return { claim, delivery };
    }),
  );

  const applicant = deliveries.find(
    ({ claim }) => claim.recipientKind === "applicant",
  )?.delivery;

  if (!applicant) return queuedResult;
  if (applicant.ok) {
    return {
      message: "Ți-am trimis confirmarea înscrierii pe email.",
      state: "sent",
    };
  }
  if (applicant.status === "not_configured") {
    return {
      message:
        "Înscrierea este salvată. Emailul va fi livrat după activarea serviciului de mesaje.",
      state: "not_configured",
    };
  }
  return {
    message:
      "Înscrierea este salvată. Emailul nu a putut fi livrat momentan și poate fi retrimis de echipă.",
    state: "failed",
  };
}
