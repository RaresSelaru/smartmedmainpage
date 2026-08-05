import type { Database } from "@/lib/supabase/database.types";

export type RegistrationEventRow =
  Database["public"]["Tables"]["registration_events"]["Row"];

export type EventRegistrationRow =
  Database["public"]["Tables"]["event_registrations"]["Row"];

export type RegistrationPrefill = {
  email: string;
  fullName: string;
  phone: string;
};
