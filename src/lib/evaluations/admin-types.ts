import type { Json } from "@/lib/auth/database.types";
import type { EvaluationStatus } from "@/lib/evaluations/admin-schema";

export type AdminEvaluationRow = {
  booking_version: number;
  contact_email: string;
  contact_name: string;
  contact_phone: string | null;
  created_at: string;
  customer_notes: string | null;
  ends_at: string;
  id: number;
  last_rescheduled_at: string | null;
  location_city: string | null;
  location_id: number | null;
  location_kind: string | null;
  location_name: string | null;
  metadata: Json;
  notification_attempts: number | null;
  notification_error: string | null;
  notification_sent_at: string | null;
  notification_status: string | null;
  notification_type: string | null;
  public_id: string;
  reschedule_count: number;
  staff_member_id: number | null;
  staff_name: string | null;
  staff_title: string | null;
  starts_at: string;
  status: EvaluationStatus;
  timezone: string;
  updated_at: string;
  user_id: string | null;
};

export type AdminEvaluationSlot = {
  booked_count: number;
  capacity: number;
  ends_at: string;
  is_public: boolean;
  location_id: number;
  location_kind: string;
  location_name: string;
  public_label: string | null;
  remaining_places: number;
  slot_id: number;
  staff_member_id: number;
  staff_name: string;
  starts_at: string;
};

export type EvaluationStaffOption = {
  displayName: string;
  id: number;
  title: string | null;
};

export type EvaluationLocationOption = {
  city: string | null;
  id: number;
  kind: string;
  name: string;
};

export type EvaluationSlotCatalog = {
  durationMinutes: number;
  locations: EvaluationLocationOption[];
  staff: EvaluationStaffOption[];
};

export type EvaluationRepositoryResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };
