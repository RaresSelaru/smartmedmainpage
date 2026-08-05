import { notFound } from "next/navigation";
import Link from "next/link";

import { EventRegistrationsTable } from "@/components/admin/event-registrations-table";
import { requireAdminCapability } from "@/lib/admin/auth";
import {
  getAdminEventRegistrations,
  getAdminRegistrationEvent,
} from "@/lib/events/repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEventRegistrationsPage({
  params,
}: PageProps) {
  const { id: rawId } = await params;
  const eventId = Number(rawId);

  if (!Number.isSafeInteger(eventId) || eventId <= 0) notFound();

  await requireAdminCapability("events.registrations.read", {
    nextPath: `/admin/events/${eventId}/registrations`,
  });

  const [eventResult, registrationsResult] = await Promise.all([
    getAdminRegistrationEvent(eventId),
    getAdminEventRegistrations(eventId),
  ]);

  if (!eventResult.data) {
    if (eventResult.error === "Evenimentul nu există.") notFound();

    return (
      <section className="rounded-[2rem] border border-red-200 bg-red-50 p-7 text-red-900">
        <h1 className="font-serif text-4xl font-semibold">
          Participanții nu pot fi încărcați
        </h1>
        <p className="mt-3 text-sm leading-7">
          {eventResult.error ?? "Încearcă din nou în câteva momente."}
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

  if (!registrationsResult.data) {
    return (
      <section className="rounded-[2rem] border border-red-200 bg-red-50 p-7 text-red-900">
        <h1 className="font-serif text-4xl font-semibold">
          Lista participanților este temporar indisponibilă
        </h1>
        <p className="mt-3 text-sm leading-7">
          {registrationsResult.error ?? "Încearcă din nou în câteva momente."}
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-smart-dark px-5 text-sm font-bold text-white"
          href={`/admin/events/${eventId}`}
        >
          Înapoi la eveniment
        </Link>
      </section>
    );
  }

  return (
    <EventRegistrationsTable
      event={eventResult.data}
      registrations={registrationsResult.data}
    />
  );
}
