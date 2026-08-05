import "server-only";

import { createServerSupabaseClient } from "@/lib/auth/supabase";
import type { AdminCenterEnrollmentRow } from "@/lib/center-enrollments/admin";
import { collectAllSupabasePages } from "@/lib/supabase/pagination";

export async function getAdminCenterEnrollments(): Promise<{
  data: AdminCenterEnrollmentRow[];
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      data: [],
      error: "Serviciul de înscrieri nu este configurat.",
    };
  }

  const result = await collectAllSupabasePages((from, to) =>
    supabase
      .from("center_enrollments")
      .select(
        "id, public_id, user_id, participant_status, full_name, birth_date, locality_county, phone, email, high_school, study_profile, guardian_name, guardian_phone, guardian_email, exam_year, current_grade, target_university, target_university_other, previous_tutoring, subjects, delivery_mode, biology_level, chemistry_level, whatsapp_opt_in, preparation_types, selected_access_plan_id, selected_plan:access_plans!center_enrollments_selected_access_plan_id_fkey(slug, name), newsletter_opt_in, account_creation_requested, account_created_at, status, admin_notes, next_follow_up_at, source_context, confirmation_email_sent_at, staff_email_sent_at, email_last_error, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to),
  );

  if (result.error) {
    console.error("SmartMed admin center enrollments failed", {
      code: result.error.code,
    });
    return {
      data: [],
      error: "Înscrierile nu au putut fi încărcate momentan.",
    };
  }

  return {
    data: (result.data ?? []) as AdminCenterEnrollmentRow[],
    error: null,
  };
}
