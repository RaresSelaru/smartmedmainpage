import { z } from "zod";

import { centerEnrollmentStatuses } from "@/lib/center-enrollments/schema";
import type { Database } from "@/lib/supabase/database.types";

type CenterEnrollmentRow =
  Database["public"]["Tables"]["center_enrollments"]["Row"];

export type AdminCenterEnrollmentRow = Pick<
  CenterEnrollmentRow,
  | "account_created_at"
  | "account_creation_requested"
  | "admin_notes"
  | "biology_level"
  | "birth_date"
  | "chemistry_level"
  | "confirmation_email_sent_at"
  | "created_at"
  | "current_grade"
  | "delivery_mode"
  | "email"
  | "email_last_error"
  | "exam_year"
  | "full_name"
  | "guardian_email"
  | "guardian_name"
  | "guardian_phone"
  | "high_school"
  | "id"
  | "locality_county"
  | "newsletter_opt_in"
  | "next_follow_up_at"
  | "participant_status"
  | "phone"
  | "preparation_types"
  | "previous_tutoring"
  | "public_id"
  | "selected_access_plan_id"
  | "source_context"
  | "staff_email_sent_at"
  | "status"
  | "study_profile"
  | "subjects"
  | "target_university"
  | "target_university_other"
  | "updated_at"
  | "user_id"
  | "whatsapp_opt_in"
> & {
  selected_plan: { name: string; slug: string } | null;
};

export const centerEnrollmentAdminUpdateSchema = z
  .object({
    adminNotes: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() !== ""
          ? value.trim()
          : null,
      z.string().max(5_000).nullable(),
    ),
    id: z.number().int().positive(),
    nextFollowUpAt: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() !== ""
          ? value.trim()
          : null,
      z.iso.datetime({ offset: true }).nullable(),
    ),
    status: z.enum(centerEnrollmentStatuses),
  })
  .strict();

export const centerEnrollmentNotificationRetrySchema = z
  .object({
    id: z.number().int().positive(),
    publicId: z.uuid(),
  })
  .strict();

export type CenterEnrollmentAdminStatus =
  (typeof centerEnrollmentStatuses)[number];
