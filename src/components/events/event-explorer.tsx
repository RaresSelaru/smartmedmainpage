"use client";

import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  MonitorPlay,
  Sparkles,
  TicketCheck,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { registerForEventAction } from "@/app/inscriere/actions";
import {
  eventDeliveryModeLabels,
  eventTypeLabels,
  formatEventDate,
  formatEventTime,
} from "@/lib/events/catalog";
import {
  eventDeliveryModeSchema,
  eventTypeSchema,
  type EventDeliveryMode,
  type EventType,
} from "@/lib/events/schema";
import type {
  RegistrationEventRow,
  RegistrationPrefill,
} from "@/lib/events/types";
import { cn } from "@/lib/utils";

type EventExplorerProps = {
  events: RegistrationEventRow[];
  initialSelectedEventId?: number | null;
  initialTypeFilter?: EventType;
  prefill: RegistrationPrefill;
  referenceNow: string;
};

type Availability = {
  canRegister: boolean;
  code:
    | "cancelled"
    | "closed"
    | "completed"
    | "full"
    | "last_places"
    | "not_started"
    | "open"
    | "waitlist";
  label: string;
  remaining: number | null;
  tone: "danger" | "muted" | "success" | "warning";
};

const typeFilters: Array<{ label: string; value: "all" | EventType }> = [
  { label: "Toate", value: "all" },
  { label: "Simulări", value: "simulation" },
  { label: "Teste", value: "test" },
  { label: "Webinarii", value: "webinar" },
  { label: "Ateliere", value: "workshop" },
  { label: "Zile deschise", value: "open_day" },
  { label: "Cursuri", value: "course" },
  { label: "Alte evenimente", value: "other" },
];

const modeFilters: Array<{
  label: string;
  value: "all" | EventDeliveryMode;
}> = [
  { label: "Orice format", value: "all" },
  { label: "Online", value: "online" },
  { label: "La centru", value: "in_person" },
  { label: "Hibrid", value: "hybrid" },
];

const eventDateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Bucharest",
  year: "numeric",
});

function formatEventSchedule(startsAt: string, endsAt: string) {
  const sameDay =
    eventDateKeyFormatter.format(new Date(startsAt)) ===
    eventDateKeyFormatter.format(new Date(endsAt));
  const startsDate = formatEventDate(startsAt);
  const startsTime = formatEventTime(startsAt);
  const endsTime = formatEventTime(endsAt);

  if (sameDay) {
    return {
      compact: `${startsDate} · ${startsTime}–${endsTime}`,
      primary: startsDate,
      secondary: `${startsTime}–${endsTime}`,
    };
  }

  const endsDate = formatEventDate(endsAt);

  return {
    compact: `${startsDate}, ${startsTime} – ${endsDate}, ${endsTime}`,
    primary: `${startsDate}, ${startsTime}`,
    secondary: `până la ${endsDate}, ${endsTime}`,
  };
}

function eventAvailability(
  event: RegistrationEventRow,
  nowValue: string,
): Availability {
  const now = new Date(nowValue).getTime();
  const starts = new Date(event.starts_at).getTime();
  const opens = new Date(event.registration_opens_at).getTime();
  const closes = new Date(event.registration_closes_at).getTime();
  const remaining =
    event.capacity === null
      ? null
      : Math.max(0, event.capacity - event.confirmed_count);

  if (event.status === "cancelled") {
    return {
      canRegister: false,
      code: "cancelled",
      label: "Eveniment anulat",
      remaining,
      tone: "danger",
    };
  }

  if (event.status === "completed" || starts <= now) {
    return {
      canRegister: false,
      code: "completed",
      label: "Eveniment încheiat",
      remaining,
      tone: "muted",
    };
  }

  if (opens > now) {
    return {
      canRegister: false,
      code: "not_started",
      label: "Înscrieri în curând",
      remaining,
      tone: "muted",
    };
  }

  if (closes <= now) {
    return {
      canRegister: false,
      code: "closed",
      label: "Înscrieri închise",
      remaining,
      tone: "muted",
    };
  }

  if (remaining === 0) {
    if (event.allow_waitlist) {
      return {
        canRegister: true,
        code: "waitlist",
        label: "Listă de așteptare",
        remaining,
        tone: "warning",
      };
    }

    return {
      canRegister: false,
      code: "full",
      label: "Locuri ocupate",
      remaining,
      tone: "danger",
    };
  }

  if (
    remaining !== null &&
    (remaining <= 5 || remaining <= Math.ceil((event.capacity ?? 0) * 0.1))
  ) {
    return {
      canRegister: true,
      code: "last_places",
      label: `${remaining} ${remaining === 1 ? "loc rămas" : "locuri rămase"}`,
      remaining,
      tone: "warning",
    };
  }

  return {
    canRegister: true,
    code: "open",
    label:
      remaining === null
        ? "Înscrieri deschise"
        : `${remaining} ${remaining === 1 ? "loc disponibil" : "locuri disponibile"}`,
    remaining,
    tone: "success",
  };
}

function fallbackCover(eventType: string) {
  if (eventType === "webinar") return "/assets/generated/path-online.png";
  if (eventType === "test") return "/assets/generated/feature-lessons.png";
  if (eventType === "simulation") return "/assets/generated/feature-courses.png";
  return "/assets/generated/smartmed-center-physical-class.png";
}

function coverUrl(event: RegistrationEventRow, variant = "1280") {
  return event.cover_media_id
    ? `/media/cms/${event.cover_media_id}/${variant}`
    : fallbackCover(event.event_type);
}

function AvailabilityBadge({ availability }: { availability: Availability }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.66rem] font-extrabold uppercase tracking-[0.12em]",
        availability.tone === "success" &&
          "border-emerald-300/30 bg-emerald-100/90 text-emerald-900",
        availability.tone === "warning" &&
          "border-amber-300/40 bg-amber-100/95 text-amber-900",
        availability.tone === "danger" &&
          "border-red-300/40 bg-red-100/95 text-red-900",
        availability.tone === "muted" &&
          "border-white/20 bg-smart-dark/75 text-smart-white/80",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          availability.tone === "success" && "bg-emerald-600",
          availability.tone === "warning" && "bg-amber-600",
          availability.tone === "danger" && "bg-red-600",
          availability.tone === "muted" && "bg-smart-white/55",
        )}
      />
      {availability.label}
    </span>
  );
}

function EventCard({
  event,
  featured,
  now,
  onOpen,
}: {
  event: RegistrationEventRow;
  featured: boolean;
  now: string;
  onOpen: () => void;
}) {
  const availability = eventAvailability(event, now);
  const type = eventTypeSchema.safeParse(event.event_type);
  const mode = eventDeliveryModeSchema.safeParse(event.delivery_mode);
  const occupation =
    event.capacity === null
      ? null
      : Math.min(100, Math.round((event.confirmed_count / event.capacity) * 100));
  const schedule = formatEventSchedule(event.starts_at, event.ends_at);

  return (
    <article
      className={cn(
        "group relative flex min-h-full flex-col overflow-hidden rounded-[2rem] border border-smart-abyss/10 bg-white/72 shadow-[0_24px_65px_rgba(3,17,28,0.09)] transition duration-300 hover:-translate-y-1 hover:border-smart-teal/28 hover:shadow-[0_30px_80px_rgba(3,17,28,0.14)]",
        featured && "lg:col-span-2 lg:grid lg:grid-cols-[1.08fr_0.92fr]",
      )}
      id={`event-${event.slug}`}
    >
      <div
        className={cn(
          "relative min-h-60 overflow-hidden",
          featured ? "lg:min-h-[420px]" : "sm:min-h-64",
        )}
      >
        <Image
          alt={`Coperta evenimentului ${event.title}`}
          className="object-cover transition duration-700 group-hover:scale-[1.025]"
          fill
          sizes={featured ? "(max-width: 1023px) 100vw, 54vw" : "(max-width: 1023px) 100vw, 33vw"}
          src={coverUrl(event)}
          unoptimized={Boolean(event.cover_media_id)}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,17,28,0.02)_35%,rgba(3,17,28,0.72)_100%)]" />
        <div className="absolute inset-x-5 top-5 flex flex-wrap items-start justify-between gap-3">
          <AvailabilityBadge availability={availability} />
          {featured ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-smart-gold-light/35 bg-smart-dark/78 px-3 py-1.5 text-[0.66rem] font-extrabold uppercase tracking-[0.12em] text-smart-gold-light backdrop-blur-md">
              <Sparkles aria-hidden="true" className="size-3" />
              Recomandat
            </span>
          ) : null}
        </div>
        <div className="absolute bottom-5 left-5 rounded-2xl border border-white/20 bg-smart-dark/72 px-4 py-3 text-smart-white backdrop-blur-lg">
          <span className="block text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-smart-aqua">
            {new Intl.DateTimeFormat("ro-RO", {
              month: "long",
              timeZone: "Europe/Bucharest",
            }).format(new Date(event.starts_at))}
          </span>
          <strong className="mt-0.5 block font-serif text-3xl font-semibold leading-none">
            {new Intl.DateTimeFormat("ro-RO", {
              day: "2-digit",
              timeZone: "Europe/Bucharest",
            }).format(new Date(event.starts_at))}
          </strong>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-2 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-smart-teal">
          <span>{type.success ? eventTypeLabels[type.data] : "Eveniment"}</span>
          <span className="text-smart-ink/25">·</span>
          <span>{mode.success ? eventDeliveryModeLabels[mode.data] : event.delivery_mode}</span>
          {event.price_label ? (
            <>
              <span className="text-smart-ink/25">·</span>
              <span className="text-smart-gold-deep">{event.price_label}</span>
            </>
          ) : null}
        </div>

        <h3 className={cn("mt-4 font-serif font-semibold leading-[1.04]", featured ? "text-4xl sm:text-5xl" : "text-3xl")}>
          {event.title}
        </h3>
        <p className="mt-4 line-clamp-3 text-sm leading-7 text-smart-ink/62">
          {event.summary}
        </p>

        <div className="mt-6 grid gap-2.5 border-t border-smart-abyss/9 pt-5 text-xs font-semibold text-smart-ink/58">
          <span className="flex items-start gap-2">
            <CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-smart-teal" />
            {schedule.compact}
          </span>
          <span className="flex items-start gap-2">
            {event.delivery_mode === "online" ? (
              <MonitorPlay aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-smart-teal" />
            ) : (
              <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-smart-teal" />
            )}
            {event.location_name || "Online"}
          </span>
        </div>

        {occupation !== null ? (
          <div className="mt-5">
            <div className="flex items-center justify-between gap-3 text-[0.68rem] font-bold text-smart-ink/48">
              <span>
                {event.confirmed_count}{" "}
                {event.confirmed_count === 1
                  ? "loc rezervat"
                  : "locuri rezervate"}
              </span>
              <span>{event.capacity} total</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-smart-abyss/8">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  occupation >= 90 ? "bg-smart-gold" : "bg-smart-teal",
                )}
                style={{ width: `${occupation}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-5 flex items-center gap-2 text-xs font-bold text-smart-teal">
            <Users aria-hidden="true" className="size-4" />
            Participare fără limită de locuri
          </p>
        )}

        <button
          className="group/button mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-smart-dark px-5 text-sm font-extrabold text-smart-white transition hover:bg-smart-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
          onClick={onOpen}
          type="button"
        >
          {availability.canRegister ? "Vezi și înscrie-te" : "Vezi detaliile"}
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition group-hover/button:translate-x-1"
          />
        </button>
      </div>
    </article>
  );
}

function EventDialog({
  event,
  now,
  onClose,
  prefill,
}: {
  event: RegistrationEventRow;
  now: string;
  onClose: () => void;
  prefill: RegistrationPrefill;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(prefill.fullName);
  const [email, setEmail] = useState(prefill.email);
  const [phone, setPhone] = useState(prefill.phone);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState<{
    outcome: "received" | "confirmed" | "waitlist";
  } | null>(null);
  const availability = eventAvailability(event, now);
  const type = eventTypeSchema.safeParse(event.event_type);
  const schedule = formatEventSchedule(event.starts_at, event.ends_at);

  useEffect(() => {
    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled]):not([type='hidden'])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    function getFocusableElements() {
      const dialog = dialogContentRef.current;

      if (!dialog) return [];

      return Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter(
        (element) =>
          !element.hasAttribute("aria-hidden") &&
          element.getClientRects().length > 0,
      );
    }

    function onKeyDown(keyEvent: KeyboardEvent) {
      if (keyEvent.key === "Escape") {
        keyEvent.preventDefault();
        onClose();
        return;
      }

      if (keyEvent.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      const first = focusableElements[0];
      const last = focusableElements.at(-1);

      if (!first || !last) {
        keyEvent.preventDefault();
        dialogContentRef.current?.focus({ preventScroll: true });
        return;
      }

      if (
        keyEvent.shiftKey &&
        (document.activeElement === first ||
          !dialogContentRef.current?.contains(document.activeElement))
      ) {
        keyEvent.preventDefault();
        last.focus();
      } else if (
        !keyEvent.shiftKey &&
        (document.activeElement === last ||
          !dialogContentRef.current?.contains(document.activeElement))
      ) {
        keyEvent.preventDefault();
        first.focus();
      }
    }

    function keepFocusInDialog(focusEvent: FocusEvent) {
      const dialog = dialogContentRef.current;

      if (
        dialog &&
        focusEvent.target instanceof Node &&
        !dialog.contains(focusEvent.target)
      ) {
        (getFocusableElements()[0] ?? dialog).focus({ preventScroll: true });
      }
    }

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", keepFocusInDialog);
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", keepFocusInDialog);
      const previousFocus = previouslyFocusedRef.current;

      if (previousFocus?.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [onClose]);

  function clearFieldError(fieldName: string) {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[fieldName]) return currentErrors;

      const nextErrors = { ...currentErrors };
      delete nextErrors[fieldName];
      return nextErrors;
    });
  }

  function submit() {
    setMessage(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await registerForEventAction({
        email,
        eventId: event.id,
        fullName,
        marketingOptIn,
        phone,
        privacyAccepted,
        website: honeypotRef.current?.value ?? "",
      });

      if (!result.ok) {
        setMessage(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSuccess({
        outcome: result.data.outcome,
      });
      router.refresh();
    });
  }

  return (
    <div
      aria-labelledby="event-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-end justify-center bg-smart-abyss/78 px-0 pb-0 pt-[7rem] backdrop-blur-md sm:items-center sm:px-6 sm:pb-5 sm:pt-[7.25rem]"
      role="dialog"
    >
      <button
        aria-label="Închide detaliile evenimentului"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <div
        className="relative grid max-h-[calc(100svh-7rem)] w-full max-w-[1400px] overflow-y-auto rounded-t-[2rem] bg-smart-cream shadow-[0_40px_140px_rgba(0,0,0,0.48)] outline-none sm:max-h-[calc(100svh-8.5rem)] sm:rounded-[2.5rem] lg:grid-cols-[1.08fr_0.92fr] lg:overflow-hidden"
        ref={dialogContentRef}
        tabIndex={-1}
      >
        <button
          aria-label="Închide"
          className="absolute right-4 top-4 z-20 flex size-10 items-center justify-center rounded-full bg-white/92 text-smart-ink shadow-lg transition hover:rotate-6 hover:bg-white sm:right-5 sm:top-5"
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          <X aria-hidden="true" className="size-5" />
        </button>

        <section className="relative overflow-hidden bg-smart-dark p-5 pb-7 text-smart-white sm:p-7 lg:h-full lg:max-h-[calc(100svh-8.5rem)] lg:overflow-hidden lg:p-7">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[1.5rem] lg:h-[clamp(150px,23svh,225px)] lg:aspect-auto">
            <Image
              alt={`Coperta evenimentului ${event.title}`}
              className="object-cover"
              fill
              sizes="(max-width: 1023px) 100vw, 48vw"
              src={coverUrl(event, "1280")}
              unoptimized={Boolean(event.cover_media_id)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-smart-abyss/65 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4">
              <AvailabilityBadge availability={availability} />
            </div>
          </div>

          <p className="mt-4 text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-smart-aqua">
            {type.success ? eventTypeLabels[type.data] : "Eveniment SmartMed"}
          </p>
          <h2
            className="mt-2 font-serif text-4xl font-semibold leading-[0.98] lg:text-[clamp(2rem,4.5svh,2.65rem)]"
            id="event-dialog-title"
          >
            {event.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-smart-white/68 lg:line-clamp-2">
            {event.summary}
          </p>

          <div className="mt-4 grid gap-2 rounded-[1.35rem] border border-white/10 bg-white/5 p-3.5 text-sm text-smart-white/78">
            <p className="flex items-start gap-3">
              <CalendarDays aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-smart-aqua" />
              <span>
                <strong className="block text-smart-white">
                  {schedule.primary}
                </strong>
                {schedule.secondary}
              </span>
            </p>
            <p className="flex items-start gap-3 border-t border-white/8 pt-3">
              {event.delivery_mode === "online" ? (
                <MonitorPlay aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-smart-aqua" />
              ) : (
                <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-smart-aqua" />
              )}
              <span>
                <strong className="block text-smart-white">
                  {event.location_name || "Online"}
                </strong>
                {event.location_address ||
                  (event.delivery_mode === "online"
                    ? "Detaliile de acces sunt comunicate participanților."
                    : "")}
              </span>
            </p>
            <p className="flex items-start gap-3 border-t border-white/8 pt-3">
              <Clock3 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-smart-aqua" />
              <span>
                <strong className="block text-smart-white">
                  Înscrieri până la {formatEventDate(event.registration_closes_at)}
                </strong>
                ora {formatEventTime(event.registration_closes_at)}
              </span>
            </p>
          </div>

          <div className="mt-4 line-clamp-3 whitespace-pre-line text-sm leading-6 text-smart-white/68">
            {event.description}
          </div>
        </section>

        <section className="p-5 pt-14 sm:p-7 sm:pt-16 lg:max-h-[calc(100svh-8.5rem)] lg:overflow-y-auto lg:overscroll-contain lg:p-8 lg:pt-10">
          {success ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <span className="flex size-20 items-center justify-center rounded-full border border-smart-teal/20 bg-smart-aqua/13 text-smart-teal">
                <CheckCircle2 aria-hidden="true" className="size-10" />
              </span>
              <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.18em] text-smart-teal">
                {success.outcome === "waitlist"
                  ? "Listă de așteptare"
                  : success.outcome === "confirmed"
                    ? "Loc confirmat"
                    : "Solicitare primită"}
              </p>
              <h3 className="mt-3 font-serif text-4xl font-semibold leading-none sm:text-5xl">
                {success.outcome === "received"
                  ? "Totul este în regulă"
                  : success.outcome === "waitlist"
                    ? "Te-am trecut pe listă"
                    : "Ne vedem la eveniment"}
              </h3>
              <p className="mt-5 max-w-md text-sm leading-7 text-smart-ink/62">
                {success.outcome === "waitlist"
                  ? "Înscrierea este salvată. Echipa SmartMed te poate contacta atunci când se eliberează un loc."
                  : success.outcome === "confirmed"
                    ? "Înscrierea este salvată. Echipa SmartMed va folosi datele introduse pentru detaliile organizatorice."
                    : "Solicitarea a fost primită. Pentru siguranța datelor, o retrimitere nu afișează detaliile înscrierii existente."}
              </p>
              <button
                className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-smart-dark px-6 text-sm font-bold text-smart-white transition hover:bg-smart-teal"
                onClick={onClose}
                type="button"
              >
                <Check aria-hidden="true" className="size-4" />
                Am înțeles
              </button>
            </div>
          ) : availability.canRegister ? (
            <>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-smart-teal">
                {availability.code === "waitlist"
                  ? "Înscriere pe lista de așteptare"
                  : "Rezervă-ți locul"}
              </p>
              <h3 className="mt-2 font-serif text-4xl font-semibold leading-none sm:text-[2.75rem]">
                Câteva date. Atât.
              </h3>
              <p className="mt-3 text-sm leading-6 text-smart-ink/58">
                Nu ai nevoie de cont. Completează formularul, iar locul este
                calculat și salvat imediat.
              </p>

              <form
                className="mt-5 grid gap-4"
                onSubmit={(formEvent) => {
                  formEvent.preventDefault();
                  submit();
                }}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-[10000px] top-auto size-px overflow-hidden opacity-0"
                >
                  <label htmlFor="registration-website">Website</label>
                  <input
                    autoComplete="off"
                    id="registration-website"
                    name="website"
                    ref={honeypotRef}
                    tabIndex={-1}
                    type="text"
                  />
                </div>
                <label className="grid gap-2 text-sm font-bold" htmlFor="registration-name">
                  Nume complet
                  <input
                    aria-describedby={
                      fieldErrors.fullName?.length
                        ? "registration-name-error"
                        : undefined
                    }
                    aria-invalid={Boolean(fieldErrors.fullName?.length)}
                    autoComplete="name"
                    className="min-h-11 rounded-2xl border border-smart-abyss/14 bg-white px-4 text-sm outline-none focus:border-smart-teal focus:ring-2 focus:ring-smart-aqua/25"
                    id="registration-name"
                    maxLength={120}
                    onChange={(inputEvent) => {
                      setFullName(inputEvent.target.value);
                      clearFieldError("fullName");
                    }}
                    placeholder="Ana Popescu"
                    required
                    value={fullName}
                  />
                  {fieldErrors.fullName?.length ? (
                    <span
                      className="text-xs text-red-700"
                      id="registration-name-error"
                    >
                      {fieldErrors.fullName.join(" ")}
                    </span>
                  ) : null}
                </label>
                <label className="grid gap-2 text-sm font-bold" htmlFor="registration-email">
                  Email
                  <input
                    aria-describedby={
                      fieldErrors.email?.length
                        ? "registration-email-error"
                        : undefined
                    }
                    aria-invalid={Boolean(fieldErrors.email?.length)}
                    autoComplete="email"
                    className="min-h-11 rounded-2xl border border-smart-abyss/14 bg-white px-4 text-sm outline-none focus:border-smart-teal focus:ring-2 focus:ring-smart-aqua/25"
                    id="registration-email"
                    maxLength={320}
                    onChange={(inputEvent) => {
                      setEmail(inputEvent.target.value);
                      clearFieldError("email");
                    }}
                    placeholder="ana@email.ro"
                    required
                    type="email"
                    value={email}
                  />
                  {fieldErrors.email?.length ? (
                    <span
                      className="text-xs text-red-700"
                      id="registration-email-error"
                    >
                      {fieldErrors.email.join(" ")}
                    </span>
                  ) : null}
                </label>
                <label className="grid gap-2 text-sm font-bold" htmlFor="registration-phone">
                  Telefon <span className="font-normal text-smart-ink/45">(opțional)</span>
                  <input
                    aria-describedby={
                      fieldErrors.phone?.length
                        ? "registration-phone-error"
                        : undefined
                    }
                    aria-invalid={Boolean(fieldErrors.phone?.length)}
                    autoComplete="tel"
                    className="min-h-11 rounded-2xl border border-smart-abyss/14 bg-white px-4 text-sm outline-none focus:border-smart-teal focus:ring-2 focus:ring-smart-aqua/25"
                    id="registration-phone"
                    maxLength={32}
                    onChange={(inputEvent) => {
                      setPhone(inputEvent.target.value);
                      clearFieldError("phone");
                    }}
                    placeholder="07xx xxx xxx"
                    type="tel"
                    value={phone}
                  />
                  {fieldErrors.phone?.length ? (
                    <span
                      className="text-xs text-red-700"
                      id="registration-phone-error"
                    >
                      {fieldErrors.phone.join(" ")}
                    </span>
                  ) : null}
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-smart-abyss/9 bg-white/65 p-3.5 text-xs leading-5 text-smart-ink/66">
                  <input
                    aria-describedby={
                      fieldErrors.privacyAccepted?.length
                        ? "registration-privacy-error"
                        : undefined
                    }
                    aria-invalid={Boolean(fieldErrors.privacyAccepted?.length)}
                    checked={privacyAccepted}
                    className="mt-1 size-4 shrink-0 accent-smart-teal"
                    id="registration-privacy"
                    onChange={(inputEvent) => {
                      setPrivacyAccepted(inputEvent.target.checked);
                      clearFieldError("privacyAccepted");
                    }}
                    required
                    type="checkbox"
                  />
                  <span>
                    Sunt de acord cu folosirea datelor pentru gestionarea acestei
                    înscrieri, conform{" "}
                    <Link className="font-bold text-smart-teal underline" href="/confidentialitate" target="_blank">
                      politicii de confidențialitate
                    </Link>.
                  </span>
                </label>
                {fieldErrors.privacyAccepted?.length ? (
                  <span
                    className="-mt-3 text-xs text-red-700"
                    id="registration-privacy-error"
                  >
                    {fieldErrors.privacyAccepted.join(" ")}
                  </span>
                ) : null}

                <label className="flex items-start gap-3 px-1 text-xs leading-5 text-smart-ink/58">
                  <input
                    checked={marketingOptIn}
                    className="mt-1 size-4 shrink-0 accent-smart-teal"
                    onChange={(inputEvent) => setMarketingOptIn(inputEvent.target.checked)}
                    type="checkbox"
                  />
                  Vreau să aflu și despre alte simulări, webinarii sau resurse SmartMed.
                </label>

                {message ? (
                  <p
                    aria-live="polite"
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
                    role="alert"
                  >
                    {message}
                  </p>
                ) : null}

                <button
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-smart-dark px-6 text-sm font-extrabold text-smart-white shadow-[0_16px_35px_rgba(3,17,28,0.18)] transition hover:-translate-y-0.5 hover:bg-smart-teal disabled:cursor-wait disabled:opacity-60"
                  disabled={pending}
                  type="submit"
                >
                  {pending ? (
                    <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
                  ) : (
                    <TicketCheck aria-hidden="true" className="size-5" />
                  )}
                  {pending
                    ? "Se rezervă…"
                    : availability.code === "waitlist"
                      ? "Intră pe lista de așteptare"
                      : "Confirmă înscrierea"}
                </button>
              </form>
            </>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <span className="flex size-20 items-center justify-center rounded-full border border-smart-abyss/10 bg-white text-smart-teal shadow-sm">
                <CalendarDays aria-hidden="true" className="size-9" />
              </span>
              <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.18em] text-smart-teal">
                {availability.label}
              </p>
              <h3 className="mt-3 font-serif text-5xl font-semibold leading-none">
                Formularul nu este activ
              </h3>
              <p className="mt-5 max-w-md text-sm leading-7 text-smart-ink/60">
                {availability.code === "not_started"
                  ? `Înscrierile se deschid pe ${formatEventDate(event.registration_opens_at)}, la ${formatEventTime(event.registration_opens_at)}.`
                  : "Poți contacta echipa SmartMed dacă ai nevoie de informații despre o ediție viitoare."}
              </p>
              <Link
                className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-smart-dark px-6 text-sm font-bold text-smart-white transition hover:bg-smart-teal"
                href="/contact"
              >
                Vorbește cu echipa
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function EventExplorer({
  events,
  initialSelectedEventId = null,
  initialTypeFilter,
  prefill,
  referenceNow,
}: EventExplorerProps) {
  const [typeFilter, setTypeFilter] = useState<"all" | EventType>(
    initialTypeFilter ?? "all",
  );
  const [modeFilter, setModeFilter] = useState<"all" | EventDeliveryMode>("all");
  const [selectedId, setSelectedId] = useState<number | null>(
    initialSelectedEventId,
  );
  const closeDialog = useCallback(() => setSelectedId(null), []);
  const selectedEvent = events.find((event) => event.id === selectedId) ?? null;
  const filteredEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          (typeFilter === "all" || event.event_type === typeFilter) &&
          (modeFilter === "all" || event.delivery_mode === modeFilter),
      ),
    [events, modeFilter, typeFilter],
  );

  return (
    <>
      <div className="mt-9 grid gap-4 rounded-[1.75rem] border border-smart-abyss/9 bg-white/55 p-4 shadow-[0_18px_55px_rgba(3,17,28,0.06)] lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex flex-wrap gap-2" aria-label="Filtrează după tip">
          {typeFilters.map((filter) => (
            <button
              aria-pressed={typeFilter === filter.value}
              className={cn(
                "min-h-10 rounded-full border px-4 text-xs font-extrabold uppercase tracking-[0.1em] transition",
                typeFilter === filter.value
                  ? "border-smart-teal bg-smart-teal text-white"
                  : "border-smart-abyss/10 bg-white/70 text-smart-ink/58 hover:border-smart-teal/35 hover:text-smart-teal",
              )}
              key={filter.value}
              onClick={() => setTypeFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.1em] text-smart-ink/48">
          Format
          <select
            className="min-h-10 rounded-full border border-smart-abyss/10 bg-white px-4 text-xs font-bold normal-case tracking-normal text-smart-ink outline-none focus:border-smart-teal"
            onChange={(selectEvent) =>
              setModeFilter(selectEvent.target.value as typeof modeFilter)
            }
            value={modeFilter}
          >
            {modeFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredEvents.length ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {filteredEvents.map((event, index) => (
            <EventCard
              event={event}
              featured={event.featured && index === 0}
              key={event.id}
              now={referenceNow}
              onOpen={() => setSelectedId(event.id)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-[2rem] border border-dashed border-smart-teal/25 bg-white/45 px-6 py-16 text-center">
          <CalendarDays aria-hidden="true" className="mx-auto size-8 text-smart-teal" />
          <h3 className="mt-4 font-serif text-4xl font-semibold">
            Nu există evenimente în această combinație
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-smart-ink/58">
            Schimbă tipul sau formatul pentru a vedea întregul calendar.
          </p>
          <button
            className="mt-6 text-sm font-bold text-smart-teal underline underline-offset-4"
            onClick={() => {
              setTypeFilter("all");
              setModeFilter("all");
            }}
            type="button"
          >
            Resetează filtrele
          </button>
        </div>
      )}

      {selectedEvent ? (
        <EventDialog
          event={selectedEvent}
          key={selectedEvent.id}
          now={referenceNow}
          onClose={closeDialog}
          prefill={prefill}
        />
      ) : null}
    </>
  );
}
