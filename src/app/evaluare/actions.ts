"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentSmartMedSession } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/auth/supabase";
import { dispatchEvaluationNotification } from "@/lib/evaluations/notifications";
import { getOwnEvaluationByPublicId } from "@/lib/evaluations/repository";
import {
  bookEvaluationSchema,
  evaluationAppointmentReceiptSchema,
  evaluationPublicIdSchema,
  rescheduleEvaluationSchema,
} from "@/lib/evaluations/schema";
import type {
  EvaluationActionResult,
  EvaluationAppointment,
  EvaluationAppointmentReceipt,
} from "@/lib/evaluations/types";

function evaluationError(message: string) {
  const messages: Record<string, string> = {
    ACTIVE_EVALUATION_EXISTS:
      "Ai deja o evaluare viitoare. O poți reprograma din cardul programării tale.",
    AUTH_REQUIRED: "Conectează-te pentru a programa evaluarea.",
    CONFIRMED_ACCOUNT_REQUIRED:
      "Confirmă adresa de email a contului înainte de programare.",
    EVALUATION_CANNOT_BE_CANCELLED:
      "Această programare nu mai poate fi anulată online. Contactează echipa SmartMed.",
    EVALUATION_CANNOT_BE_RESCHEDULED:
      "Această programare nu mai poate fi reprogramată online.",
    EVALUATION_NOT_FOUND: "Programarea nu a fost găsită în contul tău.",
    EVALUATION_SLOT_UNCHANGED:
      "Acesta este deja intervalul programării tale. Alege o altă zi sau oră.",
    INVALID_EVALUATION_GOAL: "Alege ce ai vrea să clarificăm împreună.",
    INVALID_PHONE: "Verifică numărul de telefon.",
    NOTES_TOO_LONG: "Mesajul este prea lung.",
    PRIVACY_REQUIRED:
      "Confirmă că putem folosi datele pentru gestionarea programării.",
    PROFILE_NAME_REQUIRED:
      "Completează numele din cont înainte de a programa evaluarea.",
    SLOT_NOT_AVAILABLE: "Intervalul nu mai este disponibil. Alege altul.",
    SLOT_NOT_FOUND: "Intervalul nu mai este disponibil. Alege altul.",
    SLOT_FULL:
      "Ultimul loc a fost rezervat chiar acum. Alegerile tale au rămas salvate; alege un alt interval.",
    SLOT_TAKEN:
      "Cineva a rezervat acest interval chiar acum. Alegerile tale au rămas salvate; alege o altă oră.",
  };

  return (
    Object.entries(messages).find(([code]) => message.includes(code))?.[1] ??
    "Programarea nu a putut fi actualizată. Încearcă din nou."
  );
}

function validationError(error: z.ZodError): EvaluationActionResult {
  const flattened = z.flattenError(error);

  return {
    fieldErrors: Object.fromEntries(
      Object.entries(flattened.fieldErrors).filter(
        (entry): entry is [string, string[]] =>
          Array.isArray(entry[1]) && entry[1].length > 0,
      ),
    ),
    message: "Verifică informațiile înainte de confirmare.",
    ok: false,
  };
}

async function requireEvaluationAccount(): Promise<
  | { sessionId: string }
  | EvaluationActionResult
> {
  const session = await getCurrentSmartMedSession();

  if (!session) {
    return {
      message: "Conectează-te sau creează un cont pentru a continua.",
      ok: false,
    };
  }

  if (!session.emailConfirmed) {
    return {
      message: "Confirmă adresa de email a contului înainte de programare.",
      ok: false,
    };
  }

  return { sessionId: session.id };
}

function receiptFromAppointment(
  appointment: EvaluationAppointment,
): EvaluationAppointmentReceipt {
  return {
    bookingVersion: appointment.bookingVersion,
    endsAt: appointment.endsAt,
    publicId: appointment.publicId,
    startsAt: appointment.startsAt,
    status: appointment.status,
  };
}

function revalidateEvaluationPages() {
  revalidatePath("/evaluare");
  revalidatePath("/cont");
  revalidatePath("/admin");
  revalidatePath("/admin/evaluari");
}

export async function bookEvaluationAction(
  rawInput: unknown,
): Promise<EvaluationActionResult> {
  const parsed = bookEvaluationSchema.safeParse(rawInput);
  if (!parsed.success) return validationError(parsed.error);

  const account = await requireEvaluationAccount();
  if ("ok" in account) return account;

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      message: "Serviciul de programări nu este configurat momentan.",
      ok: false,
    };
  }

  const { data, error } = await supabase.rpc("book_smartmed_evaluation", {
    p_booking_request_id: parsed.data.bookingRequestId,
    p_customer_notes: parsed.data.customerNotes ?? undefined,
    p_evaluation_goal: parsed.data.goal,
    p_phone: parsed.data.phone ?? undefined,
    p_privacy_accepted: parsed.data.privacyAccepted,
    p_slot_id: parsed.data.slotId,
    p_source: parsed.data.source,
  });

  if (error) return { message: evaluationError(error.message), ok: false };

  const receipt = evaluationAppointmentReceiptSchema.safeParse(data);
  if (!receipt.success) {
    console.error("SmartMed evaluation booking returned an invalid response", {
      sessionId: account.sessionId,
    });
    return {
      message: "Programarea a fost procesată, dar răspunsul nu a putut fi verificat.",
      ok: false,
    };
  }

  const notification = await dispatchEvaluationNotification(
    receipt.data.publicId,
  );
  revalidateEvaluationPages();

  return {
    data: { appointment: receipt.data, notification },
    ok: true,
  };
}

export async function rescheduleEvaluationAction(
  rawInput: unknown,
): Promise<EvaluationActionResult> {
  const parsed = rescheduleEvaluationSchema.safeParse(rawInput);
  if (!parsed.success) return validationError(parsed.error);

  const account = await requireEvaluationAccount();
  if ("ok" in account) return account;

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { message: "Serviciul de programări nu este disponibil.", ok: false };
  }

  const { data, error } = await supabase.rpc(
    "reschedule_own_smartmed_evaluation",
    {
      p_public_id: parsed.data.publicId,
      p_slot_id: parsed.data.slotId,
    },
  );

  if (error) return { message: evaluationError(error.message), ok: false };

  const receipt = evaluationAppointmentReceiptSchema.safeParse(data);
  if (!receipt.success) {
    return {
      message: "Reprogramarea a fost procesată, dar nu a putut fi verificată.",
      ok: false,
    };
  }

  const notification = await dispatchEvaluationNotification(
    receipt.data.publicId,
  );
  revalidateEvaluationPages();

  return {
    data: { appointment: receipt.data, notification },
    ok: true,
  };
}

export async function cancelEvaluationAction(
  rawInput: unknown,
): Promise<EvaluationActionResult> {
  const parsed = evaluationPublicIdSchema.safeParse(rawInput);
  if (!parsed.success) return validationError(parsed.error);

  const account = await requireEvaluationAccount();
  if ("ok" in account) return account;

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { message: "Serviciul de programări nu este disponibil.", ok: false };
  }

  const { data, error } = await supabase.rpc(
    "cancel_own_smartmed_evaluation",
    { p_public_id: parsed.data.publicId },
  );

  if (error) return { message: evaluationError(error.message), ok: false };

  const receipt = evaluationAppointmentReceiptSchema.safeParse(data);
  if (!receipt.success) {
    return {
      message: "Anularea a fost procesată, dar nu a putut fi verificată.",
      ok: false,
    };
  }

  const notification = await dispatchEvaluationNotification(
    receipt.data.publicId,
  );
  revalidateEvaluationPages();

  return {
    data: { appointment: receipt.data, notification },
    ok: true,
  };
}

export async function retryEvaluationEmailAction(
  rawInput: unknown,
): Promise<EvaluationActionResult> {
  const parsed = evaluationPublicIdSchema.safeParse(rawInput);
  if (!parsed.success) return validationError(parsed.error);

  const account = await requireEvaluationAccount();
  if ("ok" in account) return account;

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { message: "Serviciul de email nu este disponibil.", ok: false };
  }

  const retry = await supabase.rpc("retry_smartmed_evaluation_notification", {
    p_public_id: parsed.data.publicId,
  });

  if (retry.error) {
    return { message: evaluationError(retry.error.message), ok: false };
  }

  const appointment = await getOwnEvaluationByPublicId(parsed.data.publicId);
  if (!appointment) {
    return { message: "Programarea nu a fost găsită în contul tău.", ok: false };
  }

  const notification = await dispatchEvaluationNotification(
    appointment.publicId,
  );
  revalidateEvaluationPages();

  return {
    data: {
      appointment: receiptFromAppointment(appointment),
      notification,
    },
    ok: true,
  };
}
