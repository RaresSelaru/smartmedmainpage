import "server-only";

import { createServerSupabaseClient } from "@/lib/auth/supabase";
import {
  evaluationGoals,
  type EvaluationAppointment,
  type EvaluationDeliveryMode,
  type EvaluationGoal,
  type EvaluationSlot,
  type EvaluationStatus,
} from "@/lib/evaluations/types";
import type { Json } from "@/lib/supabase/database.types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function deliveryMode(value: unknown): EvaluationDeliveryMode {
  return value === "in_person" ? "in_person" : "online";
}

function evaluationGoal(metadata: Json): EvaluationGoal | null {
  if (!isRecord(metadata)) return null;
  const value = metadata.evaluationGoal;

  return typeof value === "string" && evaluationGoals.includes(value as EvaluationGoal)
    ? (value as EvaluationGoal)
    : null;
}

function appointmentStatus(value: unknown): EvaluationStatus {
  const statuses: EvaluationStatus[] = [
    "requested",
    "pending",
    "confirmed",
    "completed",
    "cancelled",
    "declined",
    "no_show",
  ];

  return typeof value === "string" && statuses.includes(value as EvaluationStatus)
    ? (value as EvaluationStatus)
    : "pending";
}

function firstRelation(value: unknown): UnknownRecord | null {
  if (Array.isArray(value)) return isRecord(value[0]) ? value[0] : null;
  return isRecord(value) ? value : null;
}

function mapAppointment(row: UnknownRecord): EvaluationAppointment | null {
  const publicId = stringOrNull(row.public_id);
  const startsAt = stringOrNull(row.starts_at);
  const endsAt = stringOrNull(row.ends_at);
  const contactName = stringOrNull(row.contact_name);
  const contactEmail = stringOrNull(row.contact_email);

  if (!publicId || !startsAt || !endsAt || !contactName || !contactEmail) {
    return null;
  }

  const location = firstRelation(row.locations);
  const staff = firstRelation(row.staff_members);
  const metadata = (row.metadata ?? {}) as Json;
  const metadataRecord = isRecord(metadata) ? metadata : {};
  const addressParts = [
    stringOrNull(location?.address_line_1),
    stringOrNull(location?.address_line_2),
  ].filter((part): part is string => Boolean(part));

  return {
    bookingVersion: numberOr(row.booking_version, 1),
    contactEmail,
    contactName,
    contactPhone: stringOrNull(row.contact_phone),
    customerNotes: stringOrNull(row.customer_notes),
    deliveryMode: deliveryMode(metadataRecord.deliveryMode),
    endsAt,
    goal: evaluationGoal(metadata),
    lastRescheduledAt: stringOrNull(row.last_rescheduled_at),
    locationAddress: addressParts.length ? addressParts.join(", ") : null,
    locationCity: stringOrNull(location?.city),
    locationName: stringOrNull(location?.name),
    publicId,
    rescheduleCount: numberOr(row.reschedule_count, 0),
    staffName: stringOrNull(staff?.display_name),
    staffTitle: stringOrNull(staff?.title),
    startsAt,
    status: appointmentStatus(row.status),
  };
}

export async function getEvaluationSlots(): Promise<EvaluationSlot[]> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) return [];

  const now = new Date();
  const until = new Date(now);
  until.setUTCDate(until.getUTCDate() + 60);

  const { data, error } = await supabase.rpc("get_smartmed_evaluation_slots", {
    p_from: now.toISOString(),
    p_until: until.toISOString(),
  });

  if (error) {
    if (error.code !== "42501") {
      console.error("SmartMed evaluation slot query failed", {
        code: error.code,
      });
    }
    return [];
  }

  return ((data ?? []) as unknown as UnknownRecord[])
    .map((slot) => {
      const capacity = Math.max(1, numberOr(slot.capacity, 1));
      const bookedCount = Math.max(0, numberOr(slot.booked_count, 0));
      const remainingPlaces = Math.min(
        capacity,
        Math.max(
          0,
          numberOr(slot.remaining_places, capacity - bookedCount),
        ),
      );
      const endsAt = stringOrNull(slot.ends_at);
      const locationName = stringOrNull(slot.location_name);
      const slotId = numberOr(slot.slot_id, 0);
      const staffName = stringOrNull(slot.staff_name);
      const startsAt = stringOrNull(slot.starts_at);

      if (!endsAt || !locationName || !slotId || !staffName || !startsAt) {
        return null;
      }

      return {
        bookedCount,
        capacity,
        deliveryMode: deliveryMode(slot.delivery_mode),
        endsAt,
        locationCity: stringOrNull(slot.location_city),
        locationName,
        publicLabel: stringOrNull(slot.public_label),
        remainingPlaces,
        slotId,
        staffName,
        staffTitle: stringOrNull(slot.staff_title),
        startsAt,
      } satisfies EvaluationSlot;
    })
    .filter(
      (slot): slot is EvaluationSlot =>
        slot !== null && slot.remainingPlaces > 0,
    );
}

export async function getOwnEvaluations(): Promise<EvaluationAppointment[]> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) return [];

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `public_id, starts_at, ends_at, status, contact_name, contact_email, contact_phone, customer_notes, metadata, booking_version, reschedule_count, last_rescheduled_at,
       appointment_types!inner(slug),
       locations(name, city, address_line_1, address_line_2),
       staff_members(display_name, title)`,
    )
    .eq("appointment_types.slug", "evaluare-initiala-smartmed")
    .order("starts_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("SmartMed own evaluation query failed", { code: error.code });
    return [];
  }

  return (data as unknown as UnknownRecord[])
    .map(mapAppointment)
    .filter((appointment): appointment is EvaluationAppointment => Boolean(appointment));
}

export async function getOwnEvaluationByPublicId(publicId: string) {
  const supabase = await createServerSupabaseClient();

  if (!supabase) return null;

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `public_id, starts_at, ends_at, status, contact_name, contact_email, contact_phone, customer_notes, metadata, booking_version, reschedule_count, last_rescheduled_at,
       appointment_types!inner(slug),
       locations(name, city, address_line_1, address_line_2),
       staff_members(display_name, title)`,
    )
    .eq("public_id", publicId)
    .eq("appointment_types.slug", "evaluare-initiala-smartmed")
    .maybeSingle();

  if (error) {
    console.error("SmartMed evaluation detail query failed", { code: error.code });
    return null;
  }

  return data ? mapAppointment(data as unknown as UnknownRecord) : null;
}
