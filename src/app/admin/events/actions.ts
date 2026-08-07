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
  eventEditorInputSchema,
  eventRegistrationStatusSchema,
  type EventEditorInput,
  type EventStatus,
} from "@/lib/events/schema";

type EventMutationData = {
  eventId: number;
};

type RegistrationMutationData = {
  eventId: number;
  registrationId: string;
  status: string;
};

const eventIdSchema = z.number().int().positive();
const registrationMutationSchema = z.object({
  eventId: eventIdSchema,
  registrationId: z.string().uuid(),
  status: eventRegistrationStatusSchema,
});

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
      message: "Administrarea evenimentelor nu este disponibilă momentan.",
      ok: false,
    };
  }

  return {
    code: "forbidden",
    message: "Nu ai permisiunea necesară pentru această operațiune.",
    ok: false,
  };
}

function validationFailure(
  error: z.ZodError,
): AdminActionResult<never> {
  const flattened = z.flattenError(error);

  return {
    code: "invalid-input",
    fieldErrors: Object.fromEntries(
      Object.entries(flattened.fieldErrors).filter(
        (entry): entry is [string, string[]] =>
          Array.isArray(entry[1]) && entry[1].length > 0,
      ),
    ),
    message: "Verifică informațiile evidențiate și încearcă din nou.",
    ok: false,
  };
}

function databaseFailure(error: {
  code?: string;
  message: string;
}): AdminActionResult<never> {
  if (error.code === "23505") {
    return {
      code: "slug-conflict",
      fieldErrors: {
        slug: ["Această adresă este folosită de alt eveniment."],
      },
      message: "Există deja un eveniment cu această adresă.",
      ok: false,
    };
  }

  if (error.message.includes("EVENT_FULL")) {
    return {
      code: "conflict",
      message: "Nu mai există un loc liber pentru această confirmare.",
      ok: false,
    };
  }

  if (error.code === "23514" || error.code === "22023") {
    return {
      code: "invalid-input",
      message:
        "Datele, locurile sau coperta nu formează încă un eveniment valid.",
      ok: false,
    };
  }

  if (error.code === "42501") {
    return {
      code: "forbidden",
      message: "Baza de date a refuzat această operațiune.",
      ok: false,
    };
  }

  console.error("SmartMed event mutation failed", {
    code: error.code ?? "unknown",
  });

  return {
    code: "unavailable",
    message: "Modificarea nu a putut fi salvată. Încearcă din nou.",
    ok: false,
  };
}

function publicationTimestamp(status: EventStatus, current: string | null) {
  if (status === "draft") {
    return null;
  }

  if (["published", "cancelled", "completed"].includes(status)) {
    return current ?? new Date().toISOString();
  }

  return current;
}

function toDatabaseEvent(
  input: EventEditorInput,
  actorId: string,
  currentPublishedAt: string | null,
) {
  return {
    allow_waitlist: input.allowWaitlist,
    capacity: input.capacity,
    contact_email: input.contactEmail,
    cover_media_id: input.coverMediaId,
    delivery_mode: input.deliveryMode,
    description: input.description,
    ends_at: input.endsAt,
    event_type: input.eventType,
    featured: input.featured,
    location_address: input.locationAddress,
    location_name: input.locationName,
    price_label: input.priceLabel,
    published_at: publicationTimestamp(input.status, currentPublishedAt),
    registration_closes_at: input.registrationClosesAt,
    registration_opens_at: input.registrationOpensAt,
    slug: input.slug,
    starts_at: input.startsAt,
    status: input.status,
    summary: input.summary,
    title: input.title,
    updated_by: actorId,
  };
}

function capabilityForStatus(status: EventStatus) {
  if (status === "published") return "events.publish" as const;
  if (status === "cancelled") return "events.cancel" as const;
  return "events.update" as const;
}

export async function createRegistrationEventAction(
  rawInput: unknown,
): Promise<AdminActionResult<EventMutationData>> {
  const parsed = eventEditorInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const authorization = await authorizeAdminCapability(
    parsed.data.status === "draft"
      ? "events.create"
      : capabilityForStatus(parsed.data.status),
  );

  if (!authorization.ok) {
    return authorizationFailure(authorization.code);
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      code: "configuration",
      message: "Serviciul de evenimente nu este configurat.",
      ok: false,
    };
  }

  const { data, error } = await supabase
    .from("registration_events")
    .insert({
      ...toDatabaseEvent(parsed.data, authorization.context.id, null),
      created_by: authorization.context.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return databaseFailure(
      error ?? { code: "P0002", message: "Event insert returned no row" },
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/evenimente");

  return { data: { eventId: data.id }, ok: true };
}

export async function updateRegistrationEventAction(
  rawEventId: unknown,
  rawInput: unknown,
): Promise<AdminActionResult<EventMutationData>> {
  const parsedId = eventIdSchema.safeParse(rawEventId);
  const parsedInput = eventEditorInputSchema.safeParse(rawInput);

  if (!parsedId.success || !parsedInput.success) {
    return parsedInput.success
      ? {
          code: "invalid-input",
          message: "Evenimentul selectat nu este valid.",
          ok: false,
        }
      : validationFailure(parsedInput.error);
  }

  const authorization = await authorizeAdminCapability(
    capabilityForStatus(parsedInput.data.status),
  );

  if (!authorization.ok) {
    return authorizationFailure(authorization.code);
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      code: "configuration",
      message: "Serviciul de evenimente nu este configurat.",
      ok: false,
    };
  }

  const current = await supabase
    .from("registration_events")
    .select("published_at")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (current.error) {
    return databaseFailure(current.error);
  }

  if (!current.data) {
    return {
      code: "not-found",
      message: "Evenimentul nu mai există.",
      ok: false,
    };
  }

  const { data, error } = await supabase
    .from("registration_events")
    .update(
      toDatabaseEvent(
        parsedInput.data,
        authorization.context.id,
        current.data.published_at,
      ),
    )
    .eq("id", parsedId.data)
    .select("id")
    .maybeSingle();

  if (error) {
    return databaseFailure(error);
  }

  if (!data) {
    return {
      code: "not-found",
      message: "Evenimentul nu a putut fi găsit.",
      ok: false,
    };
  }

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${parsedId.data}`);
  revalidatePath("/evenimente");

  return { data: { eventId: parsedId.data }, ok: true };
}

export async function updateEventRegistrationStatusAction(
  rawInput: unknown,
): Promise<AdminActionResult<RegistrationMutationData>> {
  const parsed = registrationMutationSchema.safeParse(rawInput);

  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const authorization = await authorizeAdminCapability(
    "events.registrations.update",
  );

  if (!authorization.ok) {
    return authorizationFailure(authorization.code);
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      code: "configuration",
      message: "Serviciul de înscrieri nu este configurat.",
      ok: false,
    };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("event_registrations")
    .update({
      attended_at: parsed.data.status === "attended" ? now : null,
      cancelled_at: parsed.data.status === "cancelled" ? now : null,
      status: parsed.data.status,
    })
    .eq("id", parsed.data.registrationId)
    .eq("event_id", parsed.data.eventId)
    .select("id")
    .maybeSingle();

  if (error) {
    return databaseFailure(error);
  }

  if (!data) {
    return {
      code: "not-found",
      message: "Înscrierea nu mai există.",
      ok: false,
    };
  }

  revalidatePath(`/admin/events/${parsed.data.eventId}`);
  revalidatePath(`/admin/events/${parsed.data.eventId}/registrations`);
  revalidatePath("/admin/events");
  revalidatePath("/evenimente");

  return { data: parsed.data, ok: true };
}
