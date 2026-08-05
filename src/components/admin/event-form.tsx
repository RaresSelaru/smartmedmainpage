"use client";

import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Save,
  Sparkles,
  TicketCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { z } from "zod";

import {
  createRegistrationEventAction,
  updateRegistrationEventAction,
} from "@/app/admin/events/actions";
import { EventCoverPicker } from "@/components/admin/event-cover-picker";
import {
  eventDeliveryModeLabels,
  eventStatusLabels,
  eventTypeLabels,
} from "@/lib/events/catalog";
import {
  eventDeliveryModes,
  eventEditorInputSchema,
  eventStatuses,
  eventTypes,
  slugifyEventTitle,
  type EventEditorInput,
} from "@/lib/events/schema";
import type { RegistrationEventRow } from "@/lib/events/types";

const fieldClass =
  "min-h-12 w-full rounded-2xl border border-smart-abyss/15 bg-white px-4 py-3 text-sm text-smart-ink outline-none transition focus:border-smart-teal focus:ring-2 focus:ring-smart-aqua/30 disabled:cursor-not-allowed disabled:bg-smart-cream/60 disabled:text-smart-ink/45";

const ROMANIA_TIME_ZONE = "Europe/Bucharest";
const SAVED_MESSAGE = "Evenimentul a fost salvat.";

type LocalDateTimeParts = {
  day: number;
  hour: number;
  minute: number;
  month: number;
  second: number;
  year: number;
};

type DateTimeConversion =
  | { iso: string; ok: true }
  | { message: string; ok: false };

const romanianDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  second: "2-digit",
  timeZone: ROMANIA_TIME_ZONE,
  year: "numeric",
});

type EventFormProps = {
  event?: RegistrationEventRow;
  initialValues: EventEditorInput;
};

function getRomanianDateTimeParts(value: Date): LocalDateTimeParts {
  const parts = romanianDateTimeFormatter.formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? Number.NaN);

  return {
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    month: get("month"),
    second: get("second"),
    year: get("year"),
  };
}

function toRomanianLocalInput(value: string) {
  const parts = getRomanianDateTimeParts(new Date(value));
  const pad = (part: number) => String(part).padStart(2, "0");

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

function sameLocalDateTime(
  left: LocalDateTimeParts,
  right: LocalDateTimeParts,
) {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  );
}

function parseLocalDateTime(value: string): LocalDateTimeParts | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u.exec(value);

  if (!match) return null;

  const parts = {
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    month: Number(match[2]),
    second: 0,
    year: Number(match[1]),
  };
  const calendarCheck = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
    ),
  );

  if (
    calendarCheck.getUTCFullYear() !== parts.year ||
    calendarCheck.getUTCMonth() + 1 !== parts.month ||
    calendarCheck.getUTCDate() !== parts.day ||
    calendarCheck.getUTCHours() !== parts.hour ||
    calendarCheck.getUTCMinutes() !== parts.minute
  ) {
    return null;
  }

  return parts;
}

function romanianTimeZoneOffset(instant: number) {
  const local = getRomanianDateTimeParts(new Date(instant));
  const localAsUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second,
  );

  return localAsUtc - Math.trunc(instant / 1000) * 1000;
}

function romanianLocalInputToIso(value: string): DateTimeConversion {
  const target = parseLocalDateTime(value);

  if (!target) {
    return { message: "Data și ora nu sunt valide.", ok: false };
  }

  const wallClockUtc = Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hour,
    target.minute,
  );
  const offsets = new Set<number>();

  for (const distance of [-48, -24, 0, 24, 48]) {
    offsets.add(
      romanianTimeZoneOffset(wallClockUtc + distance * 60 * 60 * 1000),
    );
  }

  const matches = [...offsets]
    .map((offset) => wallClockUtc - offset)
    .filter((instant) =>
      sameLocalDateTime(getRomanianDateTimeParts(new Date(instant)), target),
    )
    .sort((left, right) => left - right);

  if (matches.length === 0) {
    return {
      message:
        "Ora aleasă nu există în România din cauza trecerii la ora de vară. Alege o altă oră.",
      ok: false,
    };
  }

  // During the autumn clock change, the same wall-clock time occurs twice.
  // Choosing the first occurrence makes the conversion deterministic.
  return { iso: new Date(matches[0]).toISOString(), ok: true };
}

function FieldErrors({
  errors,
  name,
}: {
  errors: Record<string, string[]>;
  name: string;
}) {
  return errors[name]?.map((error) => (
    <span className="text-xs font-semibold text-red-700" key={error}>
      {error}
    </span>
  ));
}

function FormSection({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-[2rem] border border-smart-abyss/10 bg-white/78 p-5 shadow-[0_18px_55px_rgba(3,17,28,0.06)] sm:p-7">
      <header className="mb-6 flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-smart-dark text-smart-aqua">
          {icon}
        </span>
        <div>
          <h2 className="font-serif text-3xl font-semibold leading-none">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-smart-ink/58">
            {description}
          </p>
        </div>
      </header>
      {children}
    </section>
  );
}

export function EventForm({ event, initialValues }: EventFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(initialValues.title);
  const [slug, setSlug] = useState(initialValues.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(event));
  const [summary, setSummary] = useState(initialValues.summary);
  const [description, setDescription] = useState(initialValues.description);
  const [eventType, setEventType] = useState(initialValues.eventType);
  const [deliveryMode, setDeliveryMode] = useState(
    initialValues.deliveryMode,
  );
  const [status, setStatus] = useState(initialValues.status);
  const [coverMediaId, setCoverMediaId] = useState(
    initialValues.coverMediaId,
  );
  const [startsAt, setStartsAt] = useState(
    toRomanianLocalInput(initialValues.startsAt),
  );
  const [endsAt, setEndsAt] = useState(
    toRomanianLocalInput(initialValues.endsAt),
  );
  const [registrationOpensAt, setRegistrationOpensAt] = useState(
    toRomanianLocalInput(initialValues.registrationOpensAt),
  );
  const [registrationClosesAt, setRegistrationClosesAt] = useState(
    toRomanianLocalInput(initialValues.registrationClosesAt),
  );
  const [capacity, setCapacity] = useState(
    initialValues.capacity?.toString() ?? "",
  );
  const [allowWaitlist, setAllowWaitlist] = useState(
    initialValues.allowWaitlist,
  );
  const [locationName, setLocationName] = useState(
    initialValues.locationName ?? "",
  );
  const [locationAddress, setLocationAddress] = useState(
    initialValues.locationAddress ?? "",
  );
  const [priceLabel, setPriceLabel] = useState(
    initialValues.priceLabel ?? "",
  );
  const [contactEmail, setContactEmail] = useState(
    initialValues.contactEmail ?? "",
  );
  const [featured, setFeatured] = useState(initialValues.featured);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const capacityNumber = useMemo(() => {
    if (!capacity.trim()) return null;
    const value = Number(capacity);
    return Number.isSafeInteger(value) ? value : Number.NaN;
  }, [capacity]);

  function markDirty() {
    setDirty(true);
    setSaved(false);
    setMessage((currentMessage) =>
      currentMessage === SAVED_MESSAGE ? null : currentMessage,
    );
  }

  function buildInput(): EventEditorInput | null {
    const startsAtConversion = romanianLocalInputToIso(startsAt);
    const endsAtConversion = romanianLocalInputToIso(endsAt);
    const registrationOpensAtConversion =
      romanianLocalInputToIso(registrationOpensAt);
    const registrationClosesAtConversion =
      romanianLocalInputToIso(registrationClosesAt);
    const conversionErrors: Record<string, string[]> = {};

    if (!startsAtConversion.ok) {
      conversionErrors.startsAt = [startsAtConversion.message];
    }
    if (!endsAtConversion.ok) {
      conversionErrors.endsAt = [endsAtConversion.message];
    }
    if (!registrationOpensAtConversion.ok) {
      conversionErrors.registrationOpensAt = [
        registrationOpensAtConversion.message,
      ];
    }
    if (!registrationClosesAtConversion.ok) {
      conversionErrors.registrationClosesAt = [
        registrationClosesAtConversion.message,
      ];
    }

    if (
      !startsAtConversion.ok ||
      !endsAtConversion.ok ||
      !registrationOpensAtConversion.ok ||
      !registrationClosesAtConversion.ok
    ) {
      setFieldErrors(conversionErrors);
      setMessage("Verifică datele și orele evidențiate.");
      return null;
    }

    const candidate = {
      allowWaitlist: capacityNumber === null ? false : allowWaitlist,
      capacity: capacityNumber,
      contactEmail,
      coverMediaId,
      deliveryMode,
      description,
      endsAt: endsAtConversion.iso,
      eventType,
      featured,
      locationAddress,
      locationName,
      priceLabel,
      registrationClosesAt: registrationClosesAtConversion.iso,
      registrationOpensAt: registrationOpensAtConversion.iso,
      slug,
      startsAt: startsAtConversion.iso,
      status,
      summary,
      title,
    };
    const parsed = eventEditorInputSchema.safeParse(candidate);

    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error);
      setFieldErrors(
        Object.fromEntries(
          Object.entries(flattened.fieldErrors).filter(
            (entry): entry is [string, string[]] =>
              Array.isArray(entry[1]) && entry[1].length > 0,
          ),
        ),
      );
      setMessage("Verifică informațiile evidențiate.");
      return null;
    }

    return parsed.data;
  }

  function submit() {
    setMessage(null);
    setSaved(false);
    setFieldErrors({});
    const input = buildInput();

    if (!input) return;

    startTransition(async () => {
      const result = event
        ? await updateRegistrationEventAction(event.id, input)
        : await createRegistrationEventAction(input);

      if (!result.ok) {
        setMessage(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      if (!event) {
        router.push(`/admin/events/${result.data.eventId}`);
        router.refresh();
        return;
      }

      setSaved(true);
      setDirty(false);
      setMessage(SAVED_MESSAGE);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-6xl pb-28">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-smart-teal"
          href="/admin/events"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Înapoi la evenimente
        </Link>

        {event ? (
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-smart-abyss/12 bg-white px-4 text-sm font-bold text-smart-ink transition hover:border-smart-teal/35"
              href={`/admin/events/${event.id}/registrations`}
            >
              <Users aria-hidden="true" className="size-4 text-smart-teal" />
              Participanți ({event.confirmed_count + event.waitlist_count})
            </Link>
            {event.status !== "draft" && event.status !== "archived" ? (
              <Link
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-smart-abyss/12 bg-white px-4 text-sm font-bold text-smart-ink transition hover:border-smart-teal/35"
                href={`/inscriere#event-${event.slug}`}
                target="_blank"
              >
                <ExternalLink aria-hidden="true" className="size-4" />
                Vezi pe site
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <header className="mt-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-smart-teal">
            {event ? "Editor eveniment" : "Eveniment nou"}
          </p>
          <h1 className="mt-3 font-serif text-5xl font-semibold leading-none sm:text-6xl">
            {event ? event.title : "Creează o experiență"}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-smart-ink/65 sm:text-base">
            Tot ce este necesar pentru publicare, într-un singur formular clar.
            Poți salva mai întâi o ciornă și publica atunci când ești gata.
          </p>
        </div>
        {event ? (
          <span className="rounded-full border border-smart-teal/20 bg-smart-aqua/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-smart-teal">
            {eventStatusLabels[event.status as keyof typeof eventStatusLabels] ??
              event.status}
          </span>
        ) : null}
      </header>

      <form
        className="mt-8 grid gap-6"
        onChangeCapture={markDirty}
        onSubmit={(formEvent) => {
          formEvent.preventDefault();
          submit();
        }}
      >
        <FormSection
          description="Titlul, tipul și descrierea pe care le va vedea studentul."
          icon={<Sparkles aria-hidden="true" className="size-5" />}
          title="Despre eveniment"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold lg:col-span-2" htmlFor="event-title">
              Titlu
              <input
                className={fieldClass}
                id="event-title"
                maxLength={160}
                onChange={(inputEvent) => {
                  const value = inputEvent.target.value;
                  setTitle(value);
                  if (!slugTouched) setSlug(slugifyEventTitle(value));
                }}
                placeholder="De exemplu: Simulare Națională SmartMed"
                required
                value={title}
              />
              <FieldErrors errors={fieldErrors} name="title" />
            </label>

            <label className="grid gap-2 text-sm font-bold" htmlFor="event-type">
              Tipul evenimentului
              <select
                className={fieldClass}
                id="event-type"
                onChange={(inputEvent) =>
                  setEventType(inputEvent.target.value as typeof eventType)
                }
                value={eventType}
              >
                {eventTypes.map((value) => (
                  <option key={value} value={value}>
                    {eventTypeLabels[value]}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold" htmlFor="event-mode">
              Format
              <select
                className={fieldClass}
                id="event-mode"
                onChange={(inputEvent) =>
                  setDeliveryMode(
                    inputEvent.target.value as typeof deliveryMode,
                  )
                }
                value={deliveryMode}
              >
                {eventDeliveryModes.map((value) => (
                  <option key={value} value={value}>
                    {eventDeliveryModeLabels[value]}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold lg:col-span-2" htmlFor="event-summary">
              Rezumat scurt
              <textarea
                className={`${fieldClass} min-h-24 resize-y`}
                id="event-summary"
                maxLength={360}
                onChange={(inputEvent) => setSummary(inputEvent.target.value)}
                placeholder="O frază clară care explică de ce merită participarea."
                required
                value={summary}
              />
              <span className="text-xs font-normal text-smart-ink/45">
                {summary.length}/360
              </span>
              <FieldErrors errors={fieldErrors} name="summary" />
            </label>

            <label className="grid gap-2 text-sm font-bold lg:col-span-2" htmlFor="event-description">
              Detalii
              <textarea
                className={`${fieldClass} min-h-44 resize-y leading-7`}
                id="event-description"
                maxLength={6000}
                onChange={(inputEvent) =>
                  setDescription(inputEvent.target.value)
                }
                placeholder="Ce se întâmplă, pentru cine este și ce primește participantul. Folosește paragrafe scurte."
                required
                value={description}
              />
              <FieldErrors errors={fieldErrors} name="description" />
            </label>

            <details className="rounded-2xl border border-smart-abyss/10 bg-smart-cream/55 p-4 lg:col-span-2">
              <summary className="cursor-pointer text-sm font-bold text-smart-teal">
                Adresă web generată automat
              </summary>
              <label className="mt-4 grid gap-2 text-sm font-bold" htmlFor="event-slug">
                Slug
                <input
                  className={fieldClass}
                  id="event-slug"
                  maxLength={160}
                  onChange={(inputEvent) => {
                    setSlugTouched(true);
                    setSlug(slugifyEventTitle(inputEvent.target.value));
                  }}
                  required
                  value={slug}
                />
                <FieldErrors errors={fieldErrors} name="slug" />
              </label>
            </details>
          </div>
        </FormSection>

        <FormSection
          description="Coperta apare în catalog și în fereastra de înscriere."
          icon={<TicketCheck aria-hidden="true" className="size-5" />}
          title="Imagine de copertă"
        >
          <EventCoverPicker
            coverMediaId={coverMediaId}
            disabled={pending}
            onChange={(mediaId) => {
              setCoverMediaId(mediaId);
              markDirty();
            }}
            title={title}
          />
          <div className="mt-2">
            <FieldErrors errors={fieldErrors} name="coverMediaId" />
          </div>
        </FormSection>

        <FormSection
          description="Perioada evenimentului și intervalul în care accepți înscrieri."
          icon={<CalendarDays aria-hidden="true" className="size-5" />}
          title="Dată și înscrieri"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold" htmlFor="event-starts">
              Începe la
              <input
                className={fieldClass}
                id="event-starts"
                onChange={(inputEvent) => setStartsAt(inputEvent.target.value)}
                required
                type="datetime-local"
                value={startsAt}
              />
              <FieldErrors errors={fieldErrors} name="startsAt" />
            </label>
            <label className="grid gap-2 text-sm font-bold" htmlFor="event-ends">
              Se termină la
              <input
                className={fieldClass}
                id="event-ends"
                onChange={(inputEvent) => setEndsAt(inputEvent.target.value)}
                required
                type="datetime-local"
                value={endsAt}
              />
              <FieldErrors errors={fieldErrors} name="endsAt" />
            </label>
            <label className="grid gap-2 text-sm font-bold" htmlFor="registration-opens">
              Înscrierile se deschid
              <input
                className={fieldClass}
                id="registration-opens"
                onChange={(inputEvent) =>
                  setRegistrationOpensAt(inputEvent.target.value)
                }
                required
                type="datetime-local"
                value={registrationOpensAt}
              />
              <FieldErrors errors={fieldErrors} name="registrationOpensAt" />
            </label>
            <label className="grid gap-2 text-sm font-bold" htmlFor="registration-closes">
              Înscrierile se închid
              <input
                className={fieldClass}
                id="registration-closes"
                onChange={(inputEvent) =>
                  setRegistrationClosesAt(inputEvent.target.value)
                }
                required
                type="datetime-local"
                value={registrationClosesAt}
              />
              <FieldErrors errors={fieldErrors} name="registrationClosesAt" />
            </label>
          </div>
          <p className="mt-4 text-xs leading-6 text-smart-ink/48">
            Orele sunt afișate și publicate în fusul orar al României.
          </p>
        </FormSection>

        <FormSection
          description="Locul evenimentului și numărul de participanți acceptați."
          icon={<MapPin aria-hidden="true" className="size-5" />}
          title="Loc și capacitate"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold" htmlFor="event-location">
              {deliveryMode === "online" ? "Platformă / loc afișat" : "Locație"}
              <input
                className={fieldClass}
                id="event-location"
                maxLength={160}
                onChange={(inputEvent) =>
                  setLocationName(inputEvent.target.value)
                }
                placeholder={
                  deliveryMode === "online"
                    ? "Online · Zoom"
                    : "Centrul SmartMed București"
                }
                required={deliveryMode !== "online"}
                value={locationName}
              />
              <FieldErrors errors={fieldErrors} name="locationName" />
            </label>
            <label className="grid gap-2 text-sm font-bold" htmlFor="event-address">
              Adresă <span className="font-normal text-smart-ink/45">(opțional)</span>
              <input
                className={fieldClass}
                id="event-address"
                maxLength={500}
                onChange={(inputEvent) =>
                  setLocationAddress(inputEvent.target.value)
                }
                placeholder="Stradă, număr, oraș"
                value={locationAddress}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold" htmlFor="event-capacity">
              Număr de locuri
              <input
                className={fieldClass}
                id="event-capacity"
                min={1}
                onChange={(inputEvent) => {
                  setCapacity(inputEvent.target.value);
                  if (!inputEvent.target.value) setAllowWaitlist(false);
                }}
                placeholder="Lasă gol pentru nelimitat"
                type="number"
                value={capacity}
              />
              <FieldErrors errors={fieldErrors} name="capacity" />
            </label>
            <label className="flex min-h-12 items-center gap-3 self-end rounded-2xl border border-smart-abyss/10 bg-smart-cream/55 px-4 py-3 text-sm font-bold">
              <input
                checked={allowWaitlist}
                className="size-4 accent-smart-teal"
                disabled={!capacity.trim()}
                onChange={(inputEvent) =>
                  setAllowWaitlist(inputEvent.target.checked)
                }
                type="checkbox"
              />
              Activează lista de așteptare când se ocupă locurile
            </label>
          </div>
        </FormSection>

        <FormSection
          description="Starea evenimentului și câteva detalii opționale."
          icon={<Save aria-hidden="true" className="size-5" />}
          title="Publicare"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold" htmlFor="event-status">
              Stare
              <select
                className={fieldClass}
                id="event-status"
                onChange={(inputEvent) =>
                  setStatus(inputEvent.target.value as typeof status)
                }
                value={status}
              >
                {eventStatuses.map((value) => (
                  <option key={value} value={value}>
                    {eventStatusLabels[value]}
                  </option>
                ))}
              </select>
              <span className="text-xs font-normal leading-5 text-smart-ink/48">
                Ciornele nu apar pe site. Publicarea deschide pagina la data stabilită.
              </span>
            </label>
            <div className="grid gap-3">
              <label className="grid gap-2 text-sm font-bold" htmlFor="event-price">
                Etichetă preț <span className="font-normal text-smart-ink/45">(opțional)</span>
                <input
                  className={fieldClass}
                  id="event-price"
                  maxLength={80}
                  onChange={(inputEvent) => setPriceLabel(inputEvent.target.value)}
                  placeholder="Gratuit / 150 lei"
                  value={priceLabel}
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-smart-gold/20 bg-smart-gold/8 px-4 py-3 text-sm font-bold">
                <input
                  checked={featured}
                  className="size-4 accent-smart-teal"
                  onChange={(inputEvent) => setFeatured(inputEvent.target.checked)}
                  type="checkbox"
                />
                Evidențiază evenimentul în catalog
              </label>
            </div>
            <label className="grid gap-2 text-sm font-bold sm:col-span-2" htmlFor="event-contact">
              Email de contact <span className="font-normal text-smart-ink/45">(opțional)</span>
              <input
                className={fieldClass}
                id="event-contact"
                maxLength={320}
                onChange={(inputEvent) =>
                  setContactEmail(inputEvent.target.value)
                }
                placeholder="echipa@smartmed.ro"
                type="email"
                value={contactEmail}
              />
              <FieldErrors errors={fieldErrors} name="contactEmail" />
            </label>
          </div>
        </FormSection>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-smart-abyss/10 bg-[#f4f0e8]/94 px-4 py-3 backdrop-blur-xl lg:left-72">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div aria-live="polite" className="min-h-6 text-sm font-semibold">
              {message ? (
                <span className={saved ? "text-emerald-700" : "text-red-700"}>
                  {message}
                </span>
              ) : dirty ? (
                <span className="text-amber-700">Ai modificări nesalvate.</span>
              ) : (
                <span className="text-smart-ink/45">
                  {status === "published"
                    ? "La salvare, evenimentul va apărea pe site."
                    : "Poți reveni și modifica totul ulterior."}
                </span>
              )}
            </div>
            <button
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-smart-dark px-6 py-3 text-sm font-bold text-smart-white shadow-lg transition hover:bg-smart-teal disabled:cursor-wait disabled:opacity-60"
              disabled={pending}
              type="submit"
            >
              {pending ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Save aria-hidden="true" className="size-4" />
              )}
              {pending
                ? "Se salvează…"
                : event
                  ? "Salvează evenimentul"
                  : "Creează evenimentul"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
