import {
  ArrowRight,
  CalendarDays,
  CirclePlus,
  Clock3,
  MapPin,
  Users,
} from "lucide-react";
import Link from "next/link";

import { requireAdminCapability } from "@/lib/admin/auth";
import {
  eventDeliveryModeLabels,
  eventStatusLabels,
  eventTypeLabels,
  formatEventShortDate,
  formatEventTime,
} from "@/lib/events/catalog";
import type {
  EventDeliveryMode,
  EventStatus,
  EventType,
} from "@/lib/events/schema";
import { getAdminRegistrationEvents } from "@/lib/events/repository";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function StatusBadge({ status }: { status: string }) {
  const publicStatus = status === "published";
  const warningStatus = status === "cancelled";

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.12em]",
        publicStatus && "border-emerald-600/20 bg-emerald-50 text-emerald-800",
        warningStatus && "border-red-600/20 bg-red-50 text-red-800",
        !publicStatus &&
          !warningStatus &&
          "border-smart-abyss/10 bg-smart-cream text-smart-ink/62",
      )}
    >
      {eventStatusLabels[status as EventStatus] ?? status}
    </span>
  );
}

export default async function AdminEventsPage() {
  await requireAdminCapability("events.read", {
    nextPath: "/admin/events",
  });
  const result = await getAdminRegistrationEvents();
  const events = result.data ?? [];
  const upcomingPublic = events.filter(
    (event) => event.status === "published",
  ).length;
  const confirmed = events.reduce(
    (total, event) => total + event.confirmed_count,
    0,
  );
  const waiting = events.reduce(
    (total, event) => total + event.waitlist_count,
    0,
  );

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-smart-teal">
            Evenimente și înscrieri
          </p>
          <h1 className="mt-3 font-serif text-5xl font-semibold leading-none sm:text-6xl">
            Calendar SmartMed
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-smart-ink/65 sm:text-base">
            Publică simulări, teste, webinarii sau ateliere și urmărește locurile
            dintr-un singur loc.
          </p>
        </div>
        <Link
          className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-smart-dark px-5 py-3 text-sm font-bold text-smart-white shadow-lg transition hover:-translate-y-0.5 hover:bg-smart-teal"
          href="/admin/events/new"
        >
          <CirclePlus aria-hidden="true" className="size-5" />
          Eveniment nou
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Rezumat evenimente">
        {[
          {
            icon: <CalendarDays aria-hidden="true" className="size-5" />,
            label: "Evenimente publicate",
            value: upcomingPublic,
          },
          {
            icon: <Users aria-hidden="true" className="size-5" />,
            label: "Locuri confirmate",
            value: confirmed,
          },
          {
            icon: <Clock3 aria-hidden="true" className="size-5" />,
            label: "În așteptare",
            value: waiting,
          },
        ].map((item) => (
          <article
            className="rounded-[1.75rem] border border-smart-abyss/10 bg-white/75 p-5 shadow-[0_16px_45px_rgba(3,17,28,0.055)]"
            key={item.label}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-smart-aqua/13 text-smart-teal">
                {item.icon}
              </span>
              <strong className="font-serif text-4xl font-semibold">
                {item.value}
              </strong>
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-smart-ink/52">
              {item.label}
            </p>
          </article>
        ))}
      </section>

      {result.error ? (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-800">
          {result.error}
        </div>
      ) : events.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-smart-teal/30 bg-white/55 px-6 py-16 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-smart-aqua/12 text-smart-teal">
            <CalendarDays aria-hidden="true" className="size-6" />
          </span>
          <h2 className="mt-5 font-serif text-4xl font-semibold">
            Primul eveniment începe aici
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-smart-ink/60">
            Creează o ciornă, adaugă imaginea și datele, apoi publică atunci când
            ești gata să primești înscrieri.
          </p>
          <Link
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-smart-dark px-5 text-sm font-bold text-smart-white"
            href="/admin/events/new"
          >
            Creează evenimentul
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>
      ) : (
        <section className="grid gap-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-smart-teal">
                Toate evenimentele
              </p>
              <h2 className="mt-2 font-serif text-4xl font-semibold">
                Program și locuri
              </h2>
            </div>
            <span className="text-sm text-smart-ink/48">
              {events.length} {events.length === 1 ? "eveniment" : "evenimente"}
            </span>
          </div>

          <div className="grid gap-4">
            {events.map((event) => {
              const remaining =
                event.capacity === null
                  ? null
                  : Math.max(0, event.capacity - event.confirmed_count);

              return (
                <article
                  className="grid gap-5 rounded-[1.75rem] border border-smart-abyss/10 bg-white/78 p-5 shadow-[0_14px_42px_rgba(3,17,28,0.05)] transition hover:border-smart-teal/25 sm:grid-cols-[1fr_auto] sm:items-center"
                  key={event.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={event.status} />
                      <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.13em] text-smart-teal">
                        {eventTypeLabels[event.event_type as EventType] ??
                          event.event_type}
                      </span>
                      <span className="text-xs text-smart-ink/38">·</span>
                      <span className="text-xs font-semibold text-smart-ink/55">
                        {eventDeliveryModeLabels[
                          event.delivery_mode as EventDeliveryMode
                        ] ?? event.delivery_mode}
                      </span>
                    </div>
                    <Link
                      className="mt-3 block w-fit font-serif text-3xl font-semibold leading-tight transition hover:text-smart-teal"
                      href={`/admin/events/${event.id}`}
                    >
                      {event.title}
                    </Link>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-smart-ink/55">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays aria-hidden="true" className="size-3.5 text-smart-teal" />
                        {formatEventShortDate(event.starts_at)} · {formatEventTime(event.starts_at)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin aria-hidden="true" className="size-3.5 text-smart-teal" />
                        {event.location_name || "Online"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users aria-hidden="true" className="size-3.5 text-smart-teal" />
                        {event.confirmed_count} confirmate
                        {remaining === null
                          ? " · nelimitat"
                          : ` · ${remaining} libere`}
                        {event.waitlist_count > 0
                          ? ` · ${event.waitlist_count} în așteptare`
                          : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Link
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-smart-abyss/12 bg-smart-cream/55 px-4 text-sm font-bold text-smart-ink transition hover:border-smart-teal/35"
                      href={`/admin/events/${event.id}/registrations`}
                    >
                      <Users aria-hidden="true" className="size-4" />
                      Participanți
                    </Link>
                    <Link
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-smart-dark px-4 text-sm font-bold text-smart-white transition hover:bg-smart-teal"
                      href={`/admin/events/${event.id}`}
                    >
                      Editează
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
