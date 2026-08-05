import type {
  EventDeliveryMode,
  EventRegistrationStatus,
  EventStatus,
  EventType,
} from "@/lib/events/schema";

export const eventTypeLabels: Record<EventType, string> = {
  course: "Curs",
  open_day: "Zi deschisă",
  other: "Eveniment",
  simulation: "Simulare",
  test: "Test",
  webinar: "Webinar",
  workshop: "Atelier",
};

export const eventDeliveryModeLabels: Record<EventDeliveryMode, string> = {
  hybrid: "Hibrid",
  in_person: "La centru",
  online: "Online",
};

export const eventStatusLabels: Record<EventStatus, string> = {
  archived: "Arhivat",
  cancelled: "Anulat",
  completed: "Încheiat",
  draft: "Ciornă",
  published: "Publicat",
};

export const eventRegistrationStatusLabels: Record<
  EventRegistrationStatus,
  string
> = {
  attended: "Prezent",
  cancelled: "Anulat",
  confirmed: "Confirmat",
  no_show: "Absent",
  waitlist: "Listă de așteptare",
};

export function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Bucharest",
    weekday: "long",
    year: "numeric",
  }).format(new Date(value));
}
export function formatEventShortDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Bucharest",
    year: "numeric",
  }).format(new Date(value));
}

export function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Bucharest",
  }).format(new Date(value));
}
