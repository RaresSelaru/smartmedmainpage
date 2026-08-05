"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { AdminActionResult } from "@/lib/admin/action-result";
import {
  authorizeAdminCapability,
  type AdminAuthorizationFailureCode,
} from "@/lib/admin/auth";
import { createServerSupabaseClient } from "@/lib/auth/supabase";
import { dispatchEvaluationNotification } from "@/lib/evaluations/notifications";
import {
  evaluationMutationSchema,
  evaluationNotificationRetrySchema,
  evaluationSlotCapacityUpdateSchema,
  evaluationSlotCreateSchema,
  evaluationSlotDeleteSchema,
} from "@/lib/evaluations/admin-schema";

type EvaluationMutationData = {
  notificationState?: "already_sent" | "failed" | "not_configured" | "queued" | "sent";
  publicId: string;
};

type EvaluationSlotMutationData = {
  slotId: number;
};

type EvaluationSlotBulkDeletionData = {
  deletedCount: number;
  protectedCount: number;
};

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
    return {
      code,
      message: "Administrarea evaluărilor nu este disponibilă momentan.",
      ok: false,
    };
  }

  return {
    code: "forbidden",
    message: "Nu ai permisiunea necesară pentru această operațiune.",
    ok: false,
  };
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
    message: "Verifică informațiile introduse și încearcă din nou.",
    ok: false,
  };
}

function databaseFailure(error: {
  code?: string;
  message: string;
}): AdminActionResult<never> {
  if (error.message.includes("EVALUATION_NOT_FOUND")) {
    return {
      code: "not-found",
      message: "Programarea nu mai există.",
      ok: false,
    };
  }

  if (error.message.includes("SLOT_NOT_FOUND")) {
    return {
      code: "not-found",
      message: "Sesiunea selectată nu mai este disponibilă.",
      ok: false,
    };
  }

  if (error.message.includes("CAPACITY_BELOW_BOOKED_COUNT")) {
    return {
      code: "conflict",
      message:
        "Capacitatea nu poate fi mai mică decât numărul persoanelor deja înscrise.",
      ok: false,
    };
  }

  if (error.message.includes("SLOT_HAS_ACTIVE_BOOKINGS")) {
    return {
      code: "conflict",
      message:
        "Sesiunea are deja persoane înscrise. Poți ajusta numărul de locuri, dar nu o poți șterge.",
      ok: false,
    };
  }

  if (error.message.includes("SLOT_REQUIRED_FOR_REACTIVATION")) {
    return {
      code: "conflict",
      message:
        "Alege o sesiune viitoare cu locuri disponibile pentru a reactiva programarea.",
      ok: false,
    };
  }

  if (error.message.includes("INVALID_APPOINTMENT_STATUS_COMBINATION")) {
    return {
      code: "invalid-input",
      message:
        "O sesiune nouă poate fi aleasă doar pentru o programare activă.",
      ok: false,
    };
  }

  if (
    error.message.includes("SLOT_TAKEN") ||
    error.code === "23505" ||
    error.code === "23P01"
  ) {
    return {
      code: "conflict",
      message: "Intervalul a fost ocupat între timp. Alege o altă sesiune.",
      ok: false,
    };
  }

  if (
    error.message.includes("INVALID_APPOINTMENT_STATUS") ||
    error.message.includes("REASON_TOO_LONG") ||
    error.code === "22023" ||
    error.code === "23514"
  ) {
    return {
      code: "invalid-input",
      message: "Datele programării nu sunt valide.",
      ok: false,
    };
  }

  if (error.code === "42501" || error.message.includes("ADMIN_REQUIRED")) {
    return {
      code: "forbidden",
      message: "Baza de date a refuzat această operațiune.",
      ok: false,
    };
  }

  console.error("SmartMed evaluation admin mutation failed", {
    code: error.code ?? "unknown",
  });

  return {
    code: "unavailable",
    message: "Modificarea nu a putut fi salvată. Încearcă din nou.",
    ok: false,
  };
}

function revalidateEvaluationPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/evaluari");
  revalidatePath("/evaluare");
}

export async function updateSmartMedEvaluationAction(
  rawInput: unknown,
): Promise<AdminActionResult<EvaluationMutationData>> {
  const parsed = evaluationMutationSchema.safeParse(rawInput);

  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const authorization = await authorizeAdminCapability("evaluations.update");

  if (!authorization.ok) {
    return authorizationFailure(authorization.code);
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      code: "configuration",
      message: "Serviciul de programări nu este configurat.",
      ok: false,
    };
  }

  const { data, error } = await supabase.rpc("admin_update_smartmed_evaluation", {
    p_public_id: parsed.data.publicId,
    p_status: parsed.data.status,
    ...(parsed.data.reason ? { p_reason: parsed.data.reason } : {}),
    ...(parsed.data.slotId ? { p_slot_id: parsed.data.slotId } : {}),
  });

  if (error) {
    return databaseFailure(error);
  }

  const mutation = z
    .object({
      notificationQueued: z.boolean(),
      publicId: z.uuid(),
    })
    .passthrough()
    .safeParse(data);
  const notification =
    mutation.success && mutation.data.notificationQueued
      ? await dispatchEvaluationNotification(parsed.data.publicId)
      : null;

  revalidateEvaluationPaths();

  return {
    data: {
      ...(notification ? { notificationState: notification.state } : {}),
      publicId: parsed.data.publicId,
    },
    ok: true,
  };
}

export async function retrySmartMedEvaluationNotificationAction(
  rawInput: unknown,
): Promise<AdminActionResult<EvaluationMutationData>> {
  const parsed = evaluationNotificationRetrySchema.safeParse(rawInput);

  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const authorization = await authorizeAdminCapability(
    "evaluations.notifications.retry",
  );

  if (!authorization.ok) {
    return authorizationFailure(authorization.code);
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      code: "configuration",
      message: "Serviciul de notificări nu este configurat.",
      ok: false,
    };
  }

  const { data, error } = await supabase.rpc(
    "retry_smartmed_evaluation_notification",
    { p_public_id: parsed.data.publicId },
  );

  if (error) {
    return databaseFailure(error);
  }

  if (!data) {
    return {
      code: "conflict",
      message: "Nu există o notificare care poate fi retrimisă.",
      ok: false,
    };
  }

  const notification = await dispatchEvaluationNotification(
    parsed.data.publicId,
  );

  revalidatePath("/admin/evaluari");

  return {
    data: {
      notificationState: notification.state,
      publicId: parsed.data.publicId,
    },
    ok: true,
  };
}

export async function createSmartMedEvaluationSlotAction(
  rawInput: unknown,
): Promise<AdminActionResult<EvaluationSlotMutationData>> {
  const parsed = evaluationSlotCreateSchema.safeParse(rawInput);

  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const authorization = await authorizeAdminCapability(
    "evaluations.slots.manage",
  );

  if (!authorization.ok) {
    return authorizationFailure(authorization.code);
  }

  const startsAt = new Date(parsed.data.startsAt);
  const earliest = Date.now() + 5 * 60 * 1000;
  const latest = Date.now() + 90 * 24 * 60 * 60 * 1000;

  if (startsAt.getTime() < earliest || startsAt.getTime() > latest) {
    return {
      code: "invalid-input",
      fieldErrors: {
        startsAt: ["Alege o dată între 5 minute și 90 de zile de acum."],
      },
      message: "Data sesiunii nu este în intervalul permis.",
      ok: false,
    };
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      code: "configuration",
      message: "Serviciul de disponibilitate nu este configurat.",
      ok: false,
    };
  }

  const { data, error } = await supabase.rpc(
    "admin_create_smartmed_evaluation_slot",
    {
      p_capacity: parsed.data.capacity,
      p_location_id: parsed.data.locationId,
      p_public_label: parsed.data.publicLabel || undefined,
      p_staff_member_id: parsed.data.staffMemberId,
      p_starts_at: startsAt.toISOString(),
    },
  );

  if (error) return databaseFailure(error);

  const result = z
    .object({ slotId: z.number().int().positive() })
    .passthrough()
    .safeParse(data);

  if (!result.success) {
    return {
      code: "unavailable",
      message:
        "Sesiunea a fost procesată, dar răspunsul nu a putut fi verificat.",
      ok: false,
    };
  }

  revalidateEvaluationPaths();

  return { data: { slotId: result.data.slotId }, ok: true };
}

export async function updateSmartMedEvaluationSlotCapacityAction(
  rawInput: unknown,
): Promise<AdminActionResult<EvaluationSlotMutationData>> {
  const parsed = evaluationSlotCapacityUpdateSchema.safeParse(rawInput);

  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const authorization = await authorizeAdminCapability(
    "evaluations.slots.manage",
  );

  if (!authorization.ok) {
    return authorizationFailure(authorization.code);
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      code: "configuration",
      message: "Serviciul de disponibilitate nu este configurat.",
      ok: false,
    };
  }

  const { data, error } = await supabase.rpc(
    "admin_update_smartmed_evaluation_slot_capacity",
    {
      p_capacity: parsed.data.capacity,
      p_slot_id: parsed.data.slotId,
    },
  );

  if (error) {
    return databaseFailure(error);
  }

  if (data !== true) {
    return {
      code: "not-found",
      message: "Sesiunea nu mai există sau nu poate fi modificată.",
      ok: false,
    };
  }

  revalidateEvaluationPaths();

  return { data: { slotId: parsed.data.slotId }, ok: true };
}

export async function deleteSmartMedEvaluationSlotAction(
  rawInput: unknown,
): Promise<AdminActionResult<EvaluationSlotMutationData>> {
  const parsed = evaluationSlotDeleteSchema.safeParse(rawInput);

  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const authorization = await authorizeAdminCapability(
    "evaluations.slots.manage",
  );

  if (!authorization.ok) {
    return authorizationFailure(authorization.code);
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      code: "configuration",
      message: "Serviciul de disponibilitate nu este configurat.",
      ok: false,
    };
  }

  const { data, error } = await supabase.rpc(
    "admin_delete_smartmed_evaluation_slot",
    { p_slot_id: parsed.data.slotId },
  );

  if (error) {
    return databaseFailure(error);
  }

  if (data !== true) {
    return {
      code: "not-found",
      message: "Sesiunea nu mai există sau nu mai poate fi ștearsă.",
      ok: false,
    };
  }

  revalidateEvaluationPaths();

  return { data: { slotId: parsed.data.slotId }, ok: true };
}

export async function deleteAllSmartMedEvaluationSlotsAction(): Promise<
  AdminActionResult<EvaluationSlotBulkDeletionData>
> {
  const authorization = await authorizeAdminCapability(
    "evaluations.slots.manage",
  );

  if (!authorization.ok) {
    return authorizationFailure(authorization.code);
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      code: "configuration",
      message: "Serviciul de disponibilitate nu este configurat.",
      ok: false,
    };
  }

  const { data, error } = await supabase.rpc(
    "admin_delete_all_smartmed_evaluation_slots",
  );

  if (error) {
    return databaseFailure(error);
  }

  const result = z
    .object({
      deletedCount: z.number().int().nonnegative(),
      protectedCount: z.number().int().nonnegative(),
    })
    .safeParse(data);

  if (!result.success) {
    return {
      code: "unavailable",
      message:
        "Sesiunile au fost procesate, dar rezultatul nu a putut fi verificat.",
      ok: false,
    };
  }

  revalidateEvaluationPaths();

  return { data: result.data, ok: true };
}
