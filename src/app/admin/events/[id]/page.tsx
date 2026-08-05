import { notFound } from "next/navigation";
import Link from "next/link";

import { EventForm } from "@/components/admin/event-form";
import { requireAdminCapability } from "@/lib/admin/auth";
import {
  eventDeliveryModeSchema,
  eventStatusSchema,
  eventTypeSchema,
  type EventEditorInput,
} from "@/lib/events/schema";
import { getAdminRegistrationEvent } from "@/lib/events/repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditAdminEventPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const eventId = Number(rawId);

  if (!Number.isSafeInteger(eventId) || eventId <= 0) notFound();

  await requireAdminCapability("events.update", {
    nextPath: `/admin/events/${eventId}`,
  });

  const result = await getAdminRegistrationEvent(eventId);

  if (!result.data) {
    if (result.error === "Evenimentul nu există.") notFound();

    return (
      <section className="rounded-[2rem] border border-red-200 bg-red-50 p-7 text-red-900">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em]">
          Eveniment indisponibil
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold">
          Editorul nu a putut fi încărcat
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7">
          {result.error ?? "Încearcă din nou în câteva momente."}
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-smart-dark px-5 text-sm font-bold text-white"
          href="/admin/events"
        >
          Înapoi la evenimente
        </Link>
      </section>
    );
  }

  const event = result.data;
  const type = eventTypeSchema.safeParse(event.event_type);
  const mode = eventDeliveryModeSchema.safeParse(event.delivery_mode);
  const status = eventStatusSchema.safeParse(event.status);

  if (!type.success || !mode.success || !status.success) notFound();

  const values: EventEditorInput = {
    allowWaitlist: event.allow_waitlist,
    capacity: event.capacity,
    contactEmail: event.contact_email,
    coverMediaId: event.cover_media_id,
    deliveryMode: mode.data,
    description: event.description,
    endsAt: event.ends_at,
    eventType: type.data,
    featured: event.featured,
    locationAddress: event.location_address,
    locationName: event.location_name,
    priceLabel: event.price_label,
    registrationClosesAt: event.registration_closes_at,
    registrationOpensAt: event.registration_opens_at,
    slug: event.slug,
    startsAt: event.starts_at,
    status: status.data,
    summary: event.summary,
    title: event.title,
  };

  return <EventForm event={event} initialValues={values} />;
}
