import { EventForm } from "@/components/admin/event-form";
import { requireAdminCapability } from "@/lib/admin/auth";
import type { EventEditorInput } from "@/lib/events/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function roundToHour(date: Date) {
  date.setMinutes(0, 0, 0);
  return date;
}

export default async function NewAdminEventPage() {
  await requireAdminCapability("events.create", {
    nextPath: "/admin/events/new",
  });

  const now = new Date();
  const starts = roundToHour(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
  starts.setHours(10);
  const ends = new Date(starts.getTime() + 4 * 60 * 60 * 1000);
  const closes = new Date(starts.getTime() - 24 * 60 * 60 * 1000);
  const defaults: EventEditorInput = {
    allowWaitlist: true,
    capacity: 100,
    contactEmail: null,
    coverMediaId: null,
    deliveryMode: "in_person",
    description: "",
    endsAt: ends.toISOString(),
    eventType: "simulation",
    featured: false,
    locationAddress: null,
    locationName: "",
    priceLabel: null,
    registrationClosesAt: closes.toISOString(),
    registrationOpensAt: now.toISOString(),
    slug: "",
    startsAt: starts.toISOString(),
    status: "draft",
    summary: "",
    title: "",
  };

  return <EventForm initialValues={defaults} />;
}
