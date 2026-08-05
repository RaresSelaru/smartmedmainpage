import "server-only";

import { createServerSupabaseClient } from "@/lib/auth/supabase";
import { collectAllSupabasePages } from "@/lib/supabase/pagination";
import type {
  EventRegistrationRow,
  RegistrationEventRow,
} from "@/lib/events/types";
import { getPublicServerSupabaseClient } from "@/lib/supabase/public-server";

const publicEventColumns = [
  "id",
  "slug",
  "title",
  "summary",
  "description",
  "event_type",
  "delivery_mode",
  "status",
  "cover_media_id",
  "starts_at",
  "ends_at",
  "registration_opens_at",
  "registration_closes_at",
  "capacity",
  "allow_waitlist",
  "confirmed_count",
  "waitlist_count",
  "location_name",
  "location_address",
  "price_label",
  "contact_email",
  "featured",
  "published_at",
  "created_at",
  "updated_at",
].join(", ");

export type EventRepositoryResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export async function getPublicRegistrationEvents(): Promise<
  EventRepositoryResult<RegistrationEventRow[]>
> {
  const publicSupabase = getPublicServerSupabaseClient();

  if (!publicSupabase) {
    return {
      data: null,
      error: "Calendarul de evenimente nu este configurat încă.",
    };
  }

  const { data, error } = await publicSupabase.client
    .from("registration_events")
    .select(publicEventColumns)
    .gte("ends_at", new Date().toISOString())
    .order("featured", { ascending: false })
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("SmartMed public event catalog failed", {
      code: error.code,
    });
    return {
      data: null,
      error: "Evenimentele nu au putut fi încărcate momentan.",
    };
  }

  return {
    data: (data ?? []) as unknown as RegistrationEventRow[],
    error: null,
  };
}

export async function getAdminRegistrationEvents(): Promise<
  EventRepositoryResult<RegistrationEventRow[]>
> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { data: null, error: "Serviciul de evenimente nu este configurat." };
  }

  const { data, error } = await supabase
    .from("registration_events")
    .select(publicEventColumns)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("SmartMed admin event list failed", { code: error.code });
    return { data: null, error: "Evenimentele nu au putut fi încărcate." };
  }

  return {
    data: (data ?? []) as unknown as RegistrationEventRow[],
    error: null,
  };
}

export async function getAdminRegistrationEvent(
  eventId: number,
): Promise<EventRepositoryResult<RegistrationEventRow>> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { data: null, error: "Serviciul de evenimente nu este configurat." };
  }

  const { data, error } = await supabase
    .from("registration_events")
    .select(publicEventColumns)
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    console.error("SmartMed admin event detail failed", {
      code: error.code,
      eventId,
    });
    return { data: null, error: "Evenimentul nu a putut fi încărcat." };
  }

  if (!data) {
    return { data: null, error: "Evenimentul nu există." };
  }

  return { data: data as unknown as RegistrationEventRow, error: null };
}

export async function getAdminEventRegistrations(
  eventId: number,
): Promise<EventRepositoryResult<EventRegistrationRow[]>> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { data: null, error: "Serviciul de înscrieri nu este configurat." };
  }

  const { data, error } = await collectAllSupabasePages((from, to) =>
    supabase
      .from("event_registrations")
      .select("*")
      .eq("event_id", eventId)
      .order("registered_at", { ascending: false })
      .range(from, to),
  );

  if (error) {
    console.error("SmartMed admin registration list failed", {
      code: error.code,
      eventId,
    });
    return { data: null, error: "Participanții nu au putut fi încărcați." };
  }

  return { data: data ?? [], error: null };
}
