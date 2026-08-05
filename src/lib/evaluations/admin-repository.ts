import "server-only";

import { createServerSupabaseClient } from "@/lib/auth/supabase";
import type {
  AdminEvaluationRow,
  AdminEvaluationSlot,
  EvaluationRepositoryResult,
  EvaluationSlotCatalog,
} from "@/lib/evaluations/admin-types";

export async function getAdminEvaluations(): Promise<
  EvaluationRepositoryResult<AdminEvaluationRow[]>
> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      data: null,
      error: "Serviciul de programări nu este configurat.",
    };
  }

  const { data, error } = await supabase.rpc(
    "get_admin_smartmed_evaluations",
  );

  if (error) {
    console.error("SmartMed admin evaluation list failed", {
      code: error.code,
    });
    return {
      data: null,
      error: "Programările nu au putut fi încărcate momentan.",
    };
  }

  return {
    data: (data ?? []) as unknown as AdminEvaluationRow[],
    error: null,
  };
}

export async function getAdminEvaluationSlots(): Promise<
  EvaluationRepositoryResult<AdminEvaluationSlot[]>
> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      data: null,
      error: "Serviciul de sloturi nu este configurat.",
    };
  }

  const from = new Date();
  const until = new Date(from);
  until.setDate(until.getDate() + 89);

  const { data, error } = await supabase.rpc(
    "get_admin_smartmed_evaluation_slots",
    {
      p_from: from.toISOString(),
      p_until: until.toISOString(),
    },
  );

  if (error) {
    console.error("SmartMed admin evaluation slots failed", {
      code: error.code,
    });
    return {
      data: null,
      error: "Sloturile disponibile nu au putut fi încărcate.",
    };
  }

  return {
    data: (data ?? []) as unknown as AdminEvaluationSlot[],
    error: null,
  };
}

export async function getAdminEvaluationSlotCatalog(): Promise<
  EvaluationRepositoryResult<EvaluationSlotCatalog>
> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      data: null,
      error: "Serviciul de disponibilitate nu este configurat.",
    };
  }

  const [appointmentType, staff, locations] = await Promise.all([
    supabase
      .from("appointment_types")
      .select("id, duration_minutes")
      .eq("slug", "evaluare-initiala-smartmed")
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("staff_members")
      .select("id, display_name, title")
      .eq("is_active", true)
      .eq("is_bookable", true)
      .order("display_name"),
    supabase
      .from("locations")
      .select("id, name, kind, city")
      .eq("is_active", true)
      .in("kind", ["online", "center"])
      .order("name"),
  ]);

  const error = appointmentType.error ?? staff.error ?? locations.error;

  if (error || !appointmentType.data) {
    console.error("SmartMed admin evaluation catalog failed", {
      code: error?.code ?? "appointment-type-missing",
    });
    return {
      data: null,
      error: "Opțiunile pentru sloturi nu au putut fi încărcate.",
    };
  }

  return {
    data: {
      durationMinutes: appointmentType.data.duration_minutes,
      locations: (locations.data ?? []).map((location) => ({
        city: location.city,
        id: location.id,
        kind: location.kind,
        name: location.name,
      })),
      staff: (staff.data ?? []).map((member) => ({
        displayName: member.display_name,
        id: member.id,
        title: member.title,
      })),
    },
    error: null,
  };
}
