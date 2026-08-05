"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  LoaderCircle,
  Mail,
  Phone,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { updateEventRegistrationStatusAction } from "@/app/admin/events/actions";
import {
  eventRegistrationStatusLabels,
  formatEventDate,
  formatEventTime,
} from "@/lib/events/catalog";
import {
  eventRegistrationStatuses,
  type EventRegistrationStatus,
} from "@/lib/events/schema";
import type {
  EventRegistrationRow,
  RegistrationEventRow,
} from "@/lib/events/types";
import { cn } from "@/lib/utils";

type EventRegistrationsTableProps = {
  event: RegistrationEventRow;
  registrations: EventRegistrationRow[];
};

const eventDateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Bucharest",
  year: "numeric",
});

function escapeCsv(value: unknown) {
  const text = value == null ? "" : String(value);
  const singleLine = text.replace(/[\r\n\t]+/gu, " ").replaceAll("\0", "");
  const neutralized = /^\s*[=+\-@]/u.test(singleLine)
    ? `'${singleLine}`
    : singleLine;

  return `"${neutralized.replaceAll('"', '""')}"`;
}

function statusClass(status: string) {
  if (status === "confirmed" || status === "attended") {
    return "border-emerald-600/20 bg-emerald-50 text-emerald-800";
  }

  if (status === "waitlist") {
    return "border-amber-600/20 bg-amber-50 text-amber-800";
  }

  if (status === "cancelled" || status === "no_show") {
    return "border-red-600/20 bg-red-50 text-red-800";
  }

  return "border-smart-abyss/10 bg-smart-cream text-smart-ink/62";
}

export function EventRegistrationsTable({
  event,
  registrations,
}: EventRegistrationsTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const eventSchedule =
    eventDateKeyFormatter.format(new Date(event.starts_at)) ===
    eventDateKeyFormatter.format(new Date(event.ends_at))
      ? `${formatEventDate(event.starts_at)} · ${formatEventTime(event.starts_at)}–${formatEventTime(event.ends_at)}`
      : `${formatEventDate(event.starts_at)}, ${formatEventTime(event.starts_at)} – ${formatEventDate(event.ends_at)}, ${formatEventTime(event.ends_at)}`;
  const statusCounts = useMemo(
    () =>
      Object.fromEntries(
        eventRegistrationStatuses.map((status) => [
          status,
          registrations.filter((registration) => registration.status === status)
            .length,
        ]),
      ) as Record<EventRegistrationStatus, number>,
    [registrations],
  );

  function downloadCsv() {
    const rows = [
      [
        "Nume",
        "Email",
        "Telefon",
        "Status",
        "Data înscrierii",
        "Marketing",
      ],
      ...registrations.map((registration) => [
        registration.full_name,
        registration.email,
        registration.phone ?? "",
        eventRegistrationStatusLabels[
          registration.status as EventRegistrationStatus
        ] ?? registration.status,
        new Date(registration.registered_at).toLocaleString("ro-RO"),
        registration.marketing_opt_in ? "Da" : "Nu",
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `inscrieri-${event.slug}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function updateStatus(registrationId: string, status: EventRegistrationStatus) {
    setPendingId(registrationId);
    setMessage(null);
    setMessageIsError(false);

    startTransition(async () => {
      const result = await updateEventRegistrationStatusAction({
        eventId: event.id,
        registrationId,
        status,
      });

      if (!result.ok) {
        setMessage(result.message);
        setMessageIsError(true);
        setPendingId(null);
        return;
      }

      setMessage("Statusul participantului a fost actualizat.");
      setPendingId(null);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-smart-teal"
          href={`/admin/events/${event.id}`}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Înapoi la eveniment
        </Link>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-smart-abyss/12 bg-white px-4 text-sm font-bold text-smart-ink transition hover:border-smart-teal/35 disabled:opacity-40"
          disabled={registrations.length === 0}
          onClick={downloadCsv}
          type="button"
        >
          <Download aria-hidden="true" className="size-4 text-smart-teal" />
          Descarcă CSV
        </button>
      </div>

      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-smart-teal">
          Participanți
        </p>
        <h1 className="mt-3 max-w-4xl font-serif text-5xl font-semibold leading-[0.96] sm:text-6xl">
          {event.title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-smart-ink/62">
          {eventSchedule}
          {event.capacity === null
            ? " · locuri nelimitate"
            : ` · ${event.confirmed_count}/${event.capacity} locuri ocupate`}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Situația înscrierilor">
        {[
          {
            icon: <CheckCircle2 aria-hidden="true" className="size-5" />,
            label: "Confirmate",
            value:
              statusCounts.confirmed +
              statusCounts.attended +
              statusCounts.no_show,
          },
          {
            icon: <Clock3 aria-hidden="true" className="size-5" />,
            label: "În așteptare",
            value: statusCounts.waitlist,
          },
          {
            icon: <Users aria-hidden="true" className="size-5" />,
            label: "Total înregistrări",
            value: registrations.length,
          },
        ].map((item) => (
          <article
            className="rounded-[1.6rem] border border-smart-abyss/10 bg-white/75 p-5"
            key={item.label}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-smart-aqua/12 text-smart-teal">
                {item.icon}
              </span>
              <strong className="font-serif text-4xl font-semibold">
                {item.value}
              </strong>
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.13em] text-smart-ink/50">
              {item.label}
            </p>
          </article>
        ))}
      </section>

      {message ? (
        <p
          aria-live="polite"
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm font-semibold",
            messageIsError
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800",
          )}
        >
          {message}
        </p>
      ) : null}

      {registrations.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-smart-teal/30 bg-white/55 px-6 py-16 text-center">
          <Users aria-hidden="true" className="mx-auto size-9 text-smart-teal" />
          <h2 className="mt-4 font-serif text-4xl font-semibold">
            Încă nu există înscrieri
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-smart-ink/58">
            Participanții vor apărea aici imediat ce completează formularul de
            pe pagina publică.
          </p>
        </section>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-[1.75rem] border border-smart-abyss/10 bg-white/78 lg:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-smart-dark text-smart-white">
                <tr>
                  <th className="px-5 py-4 font-bold">Participant</th>
                  <th className="px-5 py-4 font-bold">Contact</th>
                  <th className="px-5 py-4 font-bold">Înscris la</th>
                  <th className="px-5 py-4 font-bold">Stare</th>
                  <th className="px-5 py-4 font-bold">Actualizează</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((registration) => (
                  <tr
                    className="border-t border-smart-abyss/8 align-middle"
                    key={registration.id}
                  >
                    <td className="px-5 py-5">
                      <p className="font-bold text-smart-ink">
                        {registration.full_name}
                      </p>
                      <p className="mt-1 text-xs text-smart-ink/46">
                        {registration.marketing_opt_in
                          ? "Comunicări acceptate"
                          : "Doar comunicări despre eveniment"}
                      </p>
                    </td>
                    <td className="px-5 py-5 text-xs leading-6 text-smart-ink/65">
                      <a
                        className="flex items-center gap-2 hover:text-smart-teal"
                        href={`mailto:${registration.email}`}
                      >
                        <Mail aria-hidden="true" className="size-3.5" />
                        {registration.email}
                      </a>
                      {registration.phone ? (
                        <a
                          className="mt-1 flex items-center gap-2 hover:text-smart-teal"
                          href={`tel:${registration.phone}`}
                        >
                          <Phone aria-hidden="true" className="size-3.5" />
                          {registration.phone}
                        </a>
                      ) : null}
                    </td>
                    <td className="px-5 py-5 text-xs text-smart-ink/58">
                      {new Intl.DateTimeFormat("ro-RO", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(registration.registered_at))}
                    </td>
                    <td className="px-5 py-5">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-3 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.11em]",
                          statusClass(registration.status),
                        )}
                      >
                        {eventRegistrationStatusLabels[
                          registration.status as EventRegistrationStatus
                        ] ?? registration.status}
                      </span>
                    </td>
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-2">
                        <select
                          aria-label={`Actualizează statusul pentru ${registration.full_name}`}
                          className="min-h-10 rounded-xl border border-smart-abyss/12 bg-white px-3 text-xs font-bold outline-none focus:border-smart-teal"
                          defaultValue={registration.status}
                          disabled={pending && pendingId === registration.id}
                          onChange={(selectEvent) =>
                            updateStatus(
                              registration.id,
                              selectEvent.target.value as EventRegistrationStatus,
                            )
                          }
                        >
                          {eventRegistrationStatuses.map((status) => (
                            <option key={status} value={status}>
                              {eventRegistrationStatusLabels[status]}
                            </option>
                          ))}
                        </select>
                        {pending && pendingId === registration.id ? (
                          <LoaderCircle
                            aria-hidden="true"
                            className="size-4 animate-spin text-smart-teal"
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:hidden">
            {registrations.map((registration) => (
              <article
                className="rounded-[1.5rem] border border-smart-abyss/10 bg-white/78 p-5"
                key={registration.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-2xl font-semibold">
                      {registration.full_name}
                    </h2>
                    <a
                      className="mt-2 block text-xs text-smart-teal"
                      href={`mailto:${registration.email}`}
                    >
                      {registration.email}
                    </a>
                    {registration.phone ? (
                      <a
                        className="mt-1 block text-xs text-smart-ink/58"
                        href={`tel:${registration.phone}`}
                      >
                        {registration.phone}
                      </a>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[0.65rem] font-extrabold uppercase tracking-[0.1em]",
                      statusClass(registration.status),
                    )}
                  >
                    {eventRegistrationStatusLabels[
                      registration.status as EventRegistrationStatus
                    ] ?? registration.status}
                  </span>
                </div>
                <select
                  aria-label={`Actualizează statusul pentru ${registration.full_name}`}
                  className="mt-5 min-h-11 w-full rounded-xl border border-smart-abyss/12 bg-white px-3 text-sm font-bold"
                  defaultValue={registration.status}
                  disabled={pending && pendingId === registration.id}
                  onChange={(selectEvent) =>
                    updateStatus(
                      registration.id,
                      selectEvent.target.value as EventRegistrationStatus,
                    )
                  }
                >
                  {eventRegistrationStatuses.map((status) => (
                    <option key={status} value={status}>
                      {eventRegistrationStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
