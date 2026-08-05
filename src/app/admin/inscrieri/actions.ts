"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { AdminActionResult } from "@/lib/admin/action-result";
import {
  authorizeAdminCapability,
  type AdminAuthorizationFailureCode,
} from "@/lib/admin/auth";
import { createServerSupabaseClient } from "@/lib/auth/supabase";
import {
  centerEnrollmentAdminUpdateSchema,
  centerEnrollmentNotificationRetrySchema,
} from "@/lib/center-enrollments/admin";
import { dispatchCenterEnrollmentNotifications } from "@/lib/center-enrollments/notifications";

function failure(message: string): AdminActionResult<never> {
  return { code: "unavailable", message, ok: false };
}

function validationFailure(error: z.ZodError): AdminActionResult<never> {
  const flattened = z.flattenError(error);
  return {
    code: "invalid-input",
    fieldErrors: Object.fromEntries(
      Object.entries(flattened.fieldErrors).filter(
        (entry): entry is [string, string[]] =>
          Array.isArray(entry[1]) && entry[1].length > 0,
      ),
    ),
    message: "Verifică informațiile introduse.",
    ok: false,
  };
}

function authorizationFailure(
  code: AdminAuthorizationFailureCode,
): AdminActionResult<never> {
  if (code === "unauthenticated") {
    return {
      code,
      message: "Sesiunea a expirat. Conectează-te din nou.",
      ok: false,
    };
  }
  if (code === "configuration" || code === "unavailable") {
    return failure("Administrarea înscrierilor nu este disponibilă momentan.");
  }
  return {
    code: "forbidden",
    message: "Nu ai permisiunea necesară pentru această operațiune.",
    ok: false,
  };
}

function revalidateEnrollmentAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/inscrieri");
}

export async function updateCenterEnrollmentAction(
  rawInput: unknown,
): Promise<AdminActionResult<{ id: number }>> {
  const parsed = centerEnrollmentAdminUpdateSchema.safeParse(rawInput);
  if (!parsed.success) return validationFailure(parsed.error);

  const authorization = await authorizeAdminCapability("enrollments.update");
  if (!authorization.ok) {
    return authorizationFailure(authorization.code);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return failure("Serviciul de înscrieri nu este configurat.");

  const updated = await supabase
    .from("center_enrollments")
    .update({
      admin_notes: parsed.data.adminNotes,
      next_follow_up_at: parsed.data.nextFollowUpAt,
      status: parsed.data.status,
    })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  if (updated.error || !updated.data) {
    console.error("SmartMed center enrollment update failed", {
      code: updated.error?.code ?? "not_found",
    });
    return failure("Modificarea nu a putut fi salvată.");
  }

  revalidateEnrollmentAdmin();
  return { data: { id: updated.data.id }, ok: true };
}

export async function retryCenterEnrollmentNotificationsAction(
  rawInput: unknown,
): Promise<AdminActionResult<{ id: number; notificationState: string }>> {
  const parsed = centerEnrollmentNotificationRetrySchema.safeParse(rawInput);
  if (!parsed.success) return validationFailure(parsed.error);

  const authorization = await authorizeAdminCapability(
    "enrollments.notifications.retry",
  );
  if (!authorization.ok) {
    return authorizationFailure(authorization.code);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return failure("Serviciul de notificări nu este configurat.");

  const retried = await supabase.rpc(
    "admin_retry_center_enrollment_notifications",
    { p_enrollment_id: parsed.data.id },
  );
  if (retried.error || !retried.data) {
    return failure("Nu există un email care poate fi retrimis.");
  }

  const notification = await dispatchCenterEnrollmentNotifications({
    publicId: parsed.data.publicId,
  });
  revalidateEnrollmentAdmin();
  return {
    data: { id: parsed.data.id, notificationState: notification.state },
    ok: true,
  };
}
