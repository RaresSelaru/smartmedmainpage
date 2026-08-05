import type { SmartMedSession } from "@/lib/auth/session";

export const evaluationGoals = [
  "evaluate_level",
  "build_plan",
  "choose_program",
  "visit_center",
  "choose_modules",
] as const;

export type EvaluationGoal = (typeof evaluationGoals)[number];

export const evaluationGoalLabels: Record<EvaluationGoal, string> = {
  build_plan: "Am nevoie de un plan de pregătire",
  choose_modules: "Vreau să aflu ce module m-ar ajuta",
  choose_program: "Nu știu ce program mi se potrivește",
  evaluate_level: "Vreau să îmi evaluez nivelul actual",
  visit_center: "Vreau să discut despre centrul fizic",
};

export type EvaluationDeliveryMode = "in_person" | "online";

export type EvaluationStatus =
  | "cancelled"
  | "completed"
  | "confirmed"
  | "declined"
  | "no_show"
  | "pending"
  | "requested";

export type EvaluationSlot = {
  bookedCount: number;
  capacity: number;
  deliveryMode: EvaluationDeliveryMode;
  endsAt: string;
  locationCity: string | null;
  locationName: string;
  publicLabel: string | null;
  remainingPlaces: number;
  slotId: number;
  staffName: string;
  staffTitle: string | null;
  startsAt: string;
};

export type EvaluationAppointment = {
  bookingVersion: number;
  contactEmail: string;
  contactName: string;
  contactPhone: string | null;
  customerNotes: string | null;
  deliveryMode: EvaluationDeliveryMode;
  endsAt: string;
  goal: EvaluationGoal | null;
  lastRescheduledAt: string | null;
  locationAddress: string | null;
  locationCity: string | null;
  locationName: string | null;
  publicId: string;
  rescheduleCount: number;
  staffName: string | null;
  staffTitle: string | null;
  startsAt: string;
  status: EvaluationStatus;
};

export type EvaluationAppointmentReceipt = Pick<
  EvaluationAppointment,
  "bookingVersion" | "endsAt" | "publicId" | "startsAt" | "status"
> & {
  reused?: boolean;
};

export type EvaluationNotificationState =
  | "already_sent"
  | "failed"
  | "not_configured"
  | "queued"
  | "sent";

export type EvaluationNotificationResult = {
  message: string;
  state: EvaluationNotificationState;
};

export type EvaluationActionResult =
  | {
      data: {
        appointment: EvaluationAppointmentReceipt;
        notification: EvaluationNotificationResult;
      };
      ok: true;
    }
  | {
      fieldErrors?: Record<string, string[]>;
      message: string;
      ok: false;
    };

export type EvaluationPageData = {
  appointments: EvaluationAppointment[];
  session: SmartMedSession | null;
  slots: EvaluationSlot[];
};
