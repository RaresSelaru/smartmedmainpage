"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Brain,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Compass,
  ExternalLink,
  GraduationCap,
  HeartPulse,
  LoaderCircle,
  LockKeyhole,
  MailCheck,
  MapPin,
  MonitorPlay,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  bookEvaluationAction,
  cancelEvaluationAction,
  rescheduleEvaluationAction,
  retryEvaluationEmailAction,
} from "@/app/evaluare/actions";
import type {
  EvaluationAppointment,
  EvaluationGoal,
  EvaluationSlot,
} from "@/lib/evaluations/types";
import { cn } from "@/lib/utils";

import styles from "./evaluation-booking.module.css";

export type EvaluationViewer = {
  email: string;
  emailConfirmed: boolean;
  fullName: string;
  phone: string | null;
  profileSummary: string[];
};

type EvaluationBookingProps = {
  appointments: EvaluationAppointment[];
  dataError?: string | null;
  referenceNow: string;
  slots: EvaluationSlot[];
  source?: string;
  viewer: EvaluationViewer | null;
};

type DeliveryMode = EvaluationSlot["deliveryMode"];
type WizardStep = 1 | 2 | 3 | 4;
type NotificationState =
  | "already_sent"
  | "failed"
  | "not_configured"
  | "queued"
  | "sent";

type SuccessState = {
  appointment: EvaluationAppointment;
  kind: "booked" | "rescheduled";
  notification: {
    message: string;
    state: NotificationState;
  };
};

type DraftSummary = {
  deliveryMode: DeliveryMode | null;
  goal: EvaluationGoal | null;
  slotConfirmed?: boolean;
  selectedSlot: EvaluationSlot | null;
  step?: WizardStep;
};

type GoalChoice = {
  description: string;
  Icon: typeof Brain;
  label: string;
  value: EvaluationGoal;
};

const SIGN_UP_PATH =
  "/cont?mode=creare-cont&access=required&next=%2Fevaluare%23programare";
const LOGIN_PATH =
  "/cont?mode=conectare&access=required&next=%2Fevaluare%23programare";
const CONFIRM_EMAIL_PATH =
  "/cont?mode=conectare&error=email-not-confirmed&next=%2Fevaluare%23programare";

const activeStatuses = new Set(["confirmed", "pending", "requested"]);

const goalChoices: GoalChoice[] = [
  {
    description: "Vreau să știu ce stăpânesc și unde merită să intervin mai întâi.",
    Icon: Brain,
    label: "Să îmi evaluez nivelul actual",
    value: "evaluate_level",
  },
  {
    description: "Am nevoie de o ordine realistă pentru următoarele săptămâni.",
    Icon: Compass,
    label: "Să construim un plan de pregătire",
    value: "build_plan",
  },
  {
    description: "Vreau să înțeleg ce variantă SmartMed se potrivește etapei mele.",
    Icon: GraduationCap,
    label: "Să aleg programul potrivit",
    value: "choose_program",
  },
  {
    description: "Vreau să văd cum ar arăta pregătirea și ritmul la centru.",
    Icon: Building2,
    label: "Să discutăm despre centrul fizic",
    value: "visit_center",
  },
  {
    description: "Vreau să identific modulul care rezolvă cel mai bine blocajul meu.",
    Icon: BookOpenCheck,
    label: "Să aleg modulele care mă ajută",
    value: "choose_modules",
  },
];

const goalLabels = Object.fromEntries(
  goalChoices.map((choice) => [choice.value, choice.label]),
) as Record<EvaluationGoal, string>;

const modeLabels: Record<DeliveryMode, string> = {
  in_person: "La centrul SmartMed",
  online: "Online, prin apel video",
};

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Bucharest",
  year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Bucharest",
  weekday: "long",
  year: "numeric",
});

const compactDateFormatter = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Bucharest",
  weekday: "short",
});

const timeFormatter = new Intl.DateTimeFormat("ro-RO", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Bucharest",
});

function capitalize(value: string) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function formatLongDate(value: string) {
  return capitalize(longDateFormatter.format(new Date(value)));
}

function formatCompactDate(value: string) {
  return capitalize(compactDateFormatter.format(new Date(value)));
}

function formatTime(value: string) {
  return timeFormatter.format(new Date(value));
}

function formatInterval(startsAt: string, endsAt: string) {
  return `${formatTime(startsAt)}–${formatTime(endsAt)}`;
}

function formatPlaces(count: number) {
  return `${count} ${count === 1 ? "loc disponibil" : "locuri disponibile"}`;
}

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) return email;

  return `${localPart.slice(0, 1)}${"•".repeat(Math.min(4, Math.max(2, localPart.length - 1)))}@${domain}`;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    cancelled: "Anulată",
    completed: "Finalizată",
    confirmed: "Confirmată",
    declined: "Refuzată",
    no_show: "Neprezentat",
    pending: "În curs de confirmare",
    requested: "Solicitată",
  };

  return labels[status] ?? status;
}

function googleCalendarUrl(appointment: EvaluationAppointment) {
  const calendarDate = (value: string) =>
    new Date(value)
      .toISOString()
      .replace(/[-:]/gu, "")
      .replace(/\.\d{3}/u, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    dates: `${calendarDate(appointment.startsAt)}/${calendarDate(appointment.endsAt)}`,
    details:
      "Evaluare inițială SmartMed · o întâlnire în grup restrâns despre nivel, obiective și următorul pas potrivit.",
    location:
      appointment.deliveryMode === "online"
        ? "Online · detaliile sunt comunicate de SmartMed"
        : [appointment.locationName, appointment.locationAddress, appointment.locationCity]
            .filter(Boolean)
            .join(", "),
    text: "Evaluare inițială SmartMed",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function ChoiceCard({
  choice,
  onSelect,
  selected,
}: {
  choice: GoalChoice;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <button
      aria-pressed={selected}
      className={cn(
        styles.choice,
        "group relative flex min-h-[108px] w-full items-start gap-3 rounded-[1.35rem] border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-teal",
        selected
          ? "border-smart-teal bg-smart-teal/[0.09] shadow-[0_12px_34px_rgba(31,111,120,0.12)]"
          : "border-smart-abyss/10 bg-white/66 hover:-translate-y-0.5 hover:border-smart-teal/28 hover:bg-white",
      )}
      onClick={onSelect}
      type="button"
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-2xl transition",
          selected
            ? "bg-smart-teal text-white"
            : "bg-smart-cream-deep text-smart-teal group-hover:bg-smart-teal/10",
        )}
      >
        <choice.Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 pr-5">
        <span className="block text-sm font-extrabold leading-5 text-smart-ink">
          {choice.label}
        </span>
        <span className="mt-1.5 block text-xs leading-5 text-smart-ink/64">
          {choice.description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute right-3 top-3 flex size-6 items-center justify-center rounded-full border transition",
          selected
            ? "border-smart-teal bg-smart-teal text-white"
            : "border-smart-abyss/14 bg-white/60 text-transparent",
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    </button>
  );
}

function SummaryLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 border-t border-white/8 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span className="mt-0.5 text-smart-aqua">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[0.62rem] font-extrabold uppercase tracking-[0.15em] text-smart-white/42">
          {label}
        </span>
        <strong className="mt-1 block text-xs font-bold leading-5 text-smart-white/82">
          {value}
        </strong>
      </span>
    </div>
  );
}

function SummaryAside({
  deliveryMode,
  goal,
  slotConfirmed = false,
  selectedSlot,
  step,
  viewer,
}: {
  deliveryMode: DeliveryMode | null;
  goal: EvaluationGoal | null;
  slotConfirmed?: boolean;
  selectedSlot: EvaluationSlot | null;
  step?: WizardStep;
  viewer: EvaluationViewer | null;
}) {
  return (
    <aside className={`${styles.summary} p-8 text-smart-white lg:p-9`}>
      <div className="relative z-10">
        <span className="flex size-13 items-center justify-center rounded-[1.25rem] bg-smart-aqua/12 text-smart-aqua ring-1 ring-smart-aqua/24">
          <Stethoscope aria-hidden="true" className="size-6" />
        </span>
        <p className="mt-7 text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-smart-gold-light">
          Evaluarea ta SmartMed
        </p>
        <h2 className="mt-3 font-serif text-[2.7rem] font-semibold leading-[0.92]">
          Un prim pas simplu. O direcție mai clară.
        </h2>
        <p className="mt-5 text-sm leading-7 text-smart-white/64">
          {step
            ? `Pasul ${step} din 4. Selecțiile tale rămân aici pe măsură ce construim programarea.`
            : "Programarea durează doar câteva alegeri și rămâne mereu în contul tău."}
        </p>
      </div>

      <div className="relative z-10 mt-8 rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
        <SummaryLine
          icon={<HeartPulse aria-hidden="true" className="size-4" />}
          label="Obiectiv"
          value={goal ? goalLabels[goal] : "Îl alegem la primul pas"}
        />
        <SummaryLine
          icon={
            deliveryMode === "online" ? (
              <MonitorPlay aria-hidden="true" className="size-4" />
            ) : (
              <MapPin aria-hidden="true" className="size-4" />
            )
          }
          label="Format"
          value={deliveryMode ? modeLabels[deliveryMode] : "Online sau la centru"}
        />
        <SummaryLine
          icon={<CalendarDays aria-hidden="true" className="size-4" />}
          label="Interval"
          value={
            selectedSlot
              ? `${formatCompactDate(selectedSlot.startsAt)}, ${formatInterval(selectedSlot.startsAt, selectedSlot.endsAt)}${slotConfirmed || selectedSlot.slotId < 0 ? " · Loc confirmat" : ` · ${formatPlaces(selectedSlot.remainingPlaces)} acum`}`
              : "Încă neales"
          }
        />
        {selectedSlot?.slotId && selectedSlot.slotId > 0 && !slotConfirmed ? (
          <p className="mt-4 border-t border-white/8 pt-4 text-[0.68rem] leading-5 text-smart-white/46">
            Locul se confirmă doar după trimiterea programării. Verificăm din
            nou disponibilitatea în acel moment.
          </p>
        ) : null}
      </div>

      <div className="relative z-10 mt-auto rounded-[1.5rem] border border-smart-gold-light/14 bg-smart-gold/8 p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-smart-gold/12 text-smart-gold-light">
            {viewer ? (
              <UserRoundCheck aria-hidden="true" className="size-5" />
            ) : (
              <LockKeyhole aria-hidden="true" className="size-5" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {viewer?.fullName ?? "Cont SmartMed necesar"}
            </p>
            <p className="mt-1 truncate text-xs text-smart-white/48">
              {viewer?.email ?? "Datele și programarea rămân protejate"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function StateHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="shrink-0 border-b border-smart-abyss/8 bg-smart-cream/86 px-5 py-5 backdrop-blur-xl sm:px-8 sm:py-6">
      <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-smart-teal">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-serif text-3xl font-semibold leading-none sm:text-4xl">
        {title}
      </h2>
    </header>
  );
}

function CenteredState({ children }: { children: ReactNode }) {
  return (
    <div className={`${styles.scroller} flex min-h-0 items-center justify-center px-5 py-8 sm:px-8`}>
      <div className="w-full max-w-xl text-center">{children}</div>
    </div>
  );
}

function AccessGate() {
  return (
    <>
      <StateHeader eyebrow="Programare protejată" title="Mai întâi, contul tău." />
      <CenteredState>
        <span className="mx-auto flex size-20 items-center justify-center rounded-full border border-smart-teal/18 bg-smart-aqua/12 text-smart-teal shadow-[0_20px_54px_rgba(31,111,120,0.14)]">
          <LockKeyhole aria-hidden="true" className="size-9" />
        </span>
        <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.18em] text-smart-gold">
          Programarea rămâne a ta
        </p>
        <h3 className="mt-3 font-serif text-5xl font-semibold leading-[0.94]">
          Creează un cont și continuăm exact de aici.
        </h3>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-smart-ink/64">
          Contul ne permite să îți completăm automat datele, să îți trimitem
          confirmarea și să îți oferim reprogramare sau anulare fără telefoane.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-smart-teal px-6 py-3 text-sm font-extrabold text-white shadow-[0_18px_44px_rgba(31,111,120,0.24)] transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
            href={SIGN_UP_PATH}
          >
            Creează contul
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <Link
            className="inline-flex min-h-13 items-center justify-center rounded-full border border-smart-abyss/12 bg-white/72 px-6 py-3 text-sm font-extrabold text-smart-ink transition hover:border-smart-teal/30 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
            href={LOGIN_PATH}
          >
            Am deja cont
          </Link>
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-smart-ink/44">
          <ShieldCheck aria-hidden="true" className="size-4 text-smart-teal" />
          Poți continua și cu Google sau Facebook, dacă sunt active în cont.
        </p>
      </CenteredState>
    </>
  );
}

function EmailConfirmationGate({ email }: { email: string }) {
  return (
    <>
      <StateHeader eyebrow="Un ultim pas de siguranță" title="Confirmă adresa de email." />
      <CenteredState>
        <span className="mx-auto flex size-20 items-center justify-center rounded-full border border-smart-gold/22 bg-smart-gold/12 text-smart-gold shadow-[0_20px_54px_rgba(200,168,117,0.16)]">
          <MailCheck aria-hidden="true" className="size-9" />
        </span>
        <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.18em] text-smart-teal">
          Cont creat
        </p>
        <h3 className="mt-3 font-serif text-5xl font-semibold leading-[0.94]">
          Verificăm emailul înainte să păstrăm un loc.
        </h3>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-smart-ink/64">
          Deschide mesajul trimis la <strong className="text-smart-ink">{maskEmail(email)}</strong>.
          După confirmare, revii aici cu programarea pregătită.
        </p>
        <Link
          className="mt-8 inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-smart-teal px-7 py-3 text-sm font-extrabold text-white shadow-[0_18px_44px_rgba(31,111,120,0.24)] transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
          href={CONFIRM_EMAIL_PATH}
        >
          Mergi la cont
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <p className="mt-5 text-xs leading-6 text-smart-ink/46">
          Nu găsești mesajul? Verifică și folderul Spam sau retrimite confirmarea
          din pagina contului.
        </p>
      </CenteredState>
    </>
  );
}

function EmptySlotsState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <>
      <StateHeader eyebrow="Calendar SmartMed" title="Pregătim următoarele intervale." />
      <CenteredState>
        <span className="mx-auto flex size-20 items-center justify-center rounded-full border border-smart-teal/18 bg-smart-aqua/12 text-smart-teal">
          <CalendarDays aria-hidden="true" className="size-9" />
        </span>
        <h3 className="mt-7 font-serif text-5xl font-semibold leading-[0.94]">
          Momentan nu există ore libere.
        </h3>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-smart-ink/62">
          Echipa adaugă periodic intervale online și la centru. Poți verifica din
          nou fără să pierzi accesul la această pagină.
        </p>
        <button
          className="mt-8 inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-smart-teal px-7 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          Verifică din nou
        </button>
      </CenteredState>
    </>
  );
}

function DataErrorState({ message, onRefresh }: { message: string; onRefresh: () => void }) {
  return (
    <>
      <StateHeader eyebrow="Calendar indisponibil" title="Nu am putut încărca programul." />
      <CenteredState>
        <span className="mx-auto flex size-20 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700">
          <CircleAlert aria-hidden="true" className="size-9" />
        </span>
        <h3 className="mt-7 font-serif text-5xl font-semibold leading-[0.94]">
          Programarea ta nu s-a pierdut.
        </h3>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-smart-ink/62">
          {message}
        </p>
        <button
          className="mt-8 inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-smart-dark px-7 py-3 text-sm font-extrabold text-smart-white transition hover:-translate-y-0.5 hover:bg-smart-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          Reîncarcă programul
        </button>
      </CenteredState>
    </>
  );
}

function AppointmentDetails({ appointment }: { appointment: EvaluationAppointment }) {
  return (
    <div className="grid gap-3 rounded-[1.65rem] border border-smart-abyss/10 bg-white/68 p-5 text-left shadow-[0_18px_48px_rgba(3,17,28,0.06)] sm:grid-cols-2 sm:p-6">
      <div className="flex gap-3">
        <CalendarDays aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-smart-teal" />
        <span>
          <span className="block text-[0.65rem] font-extrabold uppercase tracking-[0.15em] text-smart-ink/42">
            Data și ora
          </span>
          <strong className="mt-1 block text-sm leading-6">
            {formatLongDate(appointment.startsAt)}
            <span className="block text-smart-teal">
              {formatInterval(appointment.startsAt, appointment.endsAt)}
            </span>
          </strong>
        </span>
      </div>
      <div className="flex gap-3">
        {appointment.deliveryMode === "online" ? (
          <MonitorPlay aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-smart-teal" />
        ) : (
          <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-smart-teal" />
        )}
        <span>
          <span className="block text-[0.65rem] font-extrabold uppercase tracking-[0.15em] text-smart-ink/42">
            Format
          </span>
          <strong className="mt-1 block text-sm leading-6">
            {modeLabels[appointment.deliveryMode]}
            <span className="block font-medium text-smart-ink/52">
              {appointment.locationName ?? "Detaliile sunt comunicate în confirmare"}
            </span>
          </strong>
        </span>
      </div>
      <div className="flex gap-3 border-t border-smart-abyss/8 pt-4 sm:col-span-2">
        <Compass aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-smart-teal" />
        <span>
          <span className="block text-[0.65rem] font-extrabold uppercase tracking-[0.15em] text-smart-ink/42">
            Obiectiv
          </span>
          <strong className="mt-1 block text-sm leading-6">
            {appointment.goal ? goalLabels[appointment.goal] : "Evaluare inițială SmartMed"}
          </strong>
        </span>
      </div>
    </div>
  );
}

function ExistingAppointment({
  appointment,
  cancelConfirm,
  message,
  onCancel,
  onCancelConfirmChange,
  onReschedule,
  pending,
}: {
  appointment: EvaluationAppointment;
  cancelConfirm: boolean;
  message: string;
  onCancel: () => void;
  onCancelConfirmChange: (value: boolean) => void;
  onReschedule: () => void;
  pending: boolean;
}) {
  return (
    <>
      <StateHeader eyebrow="Programarea mea" title="Locul tău este păstrat." />
      <div className={`${styles.scroller} min-h-0 px-5 py-7 sm:px-8 sm:py-8`}>
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-600/16 bg-emerald-50 px-3 py-1.5 text-[0.66rem] font-extrabold uppercase tracking-[0.14em] text-emerald-800">
                <span className="size-1.5 rounded-full bg-emerald-600" />
                {statusLabel(appointment.status)}
              </span>
              <h3 className="mt-4 font-serif text-5xl font-semibold leading-[0.92]">
                Ne vedem la evaluare.
              </h3>
            </div>
            <span className="flex size-14 items-center justify-center rounded-full border border-smart-teal/16 bg-smart-aqua/12 text-smart-teal">
              <CalendarCheck2 aria-hidden="true" className="size-6" />
            </span>
          </div>

          <p className="mt-5 max-w-xl text-sm leading-7 text-smart-ink/62">
            Toate detaliile sunt păstrate în contul tău. Poți adăuga întâlnirea
            în calendar sau poți schimba intervalul fără să completezi din nou.
          </p>

          <div className="mt-7">
            <AppointmentDetails appointment={appointment} />
          </div>

          {message ? (
            <p
              aria-live="assertive"
              className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
              role="alert"
            >
              {message}
            </p>
          ) : null}

          {cancelConfirm ? (
            <div className="mt-5 rounded-[1.5rem] border border-red-200 bg-red-50 p-5 text-left">
              <div className="flex gap-3">
                <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-red-700" />
                <div>
                  <h4 className="font-serif text-2xl font-semibold leading-none text-red-950">
                    Anulezi această programare?
                  </h4>
                  <p className="mt-2 text-xs leading-6 text-red-900/70">
                    Intervalul va deveni disponibil pentru alt student. Poți face
                    ulterior o programare nouă.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  className="min-h-11 rounded-full px-5 text-sm font-bold text-smart-ink/68 transition hover:text-smart-teal disabled:opacity-45"
                  disabled={pending}
                  onClick={() => onCancelConfirmChange(false)}
                  type="button"
                >
                  Păstrează programarea
                </button>
                <button
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-red-700 px-5 text-sm font-extrabold text-white transition hover:bg-red-800 disabled:cursor-wait disabled:opacity-55"
                  disabled={pending}
                  onClick={onCancel}
                  type="button"
                >
                  {pending ? (
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Trash2 aria-hidden="true" className="size-4" />
                  )}
                  {pending ? "Se anulează…" : "Da, anulează"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-smart-teal px-6 py-3 text-sm font-extrabold text-white shadow-[0_16px_38px_rgba(31,111,120,0.2)] transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
                onClick={onReschedule}
                type="button"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                Reprogramează
              </button>
              <a
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-smart-abyss/12 bg-white/72 px-6 py-3 text-sm font-extrabold text-smart-ink transition hover:border-smart-teal/30 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
                href={googleCalendarUrl(appointment)}
                rel="noopener noreferrer"
                target="_blank"
              >
                <CalendarDays aria-hidden="true" className="size-4 text-smart-teal" />
                Adaugă în calendar
                <ExternalLink aria-hidden="true" className="size-3.5 text-smart-ink/42" />
              </a>
            </div>
          )}

          {!cancelConfirm ? (
            <button
              className="mx-auto mt-5 block min-h-11 px-4 text-xs font-bold text-smart-ink/46 underline decoration-smart-ink/20 underline-offset-4 transition hover:text-red-700"
              onClick={() => onCancelConfirmChange(true)}
              type="button"
            >
              Anulează programarea
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}

function SuccessView({
  onDone,
  onRetryEmail,
  pending,
  success,
}: {
  onDone: () => void;
  onRetryEmail: () => void;
  pending: boolean;
  success: SuccessState;
}) {
  const notificationNeedsAttention =
    success.notification.state === "failed" ||
    success.notification.state === "not_configured";

  return (
    <>
      <StateHeader
        eyebrow={success.kind === "booked" ? "Programare confirmată" : "Programare actualizată"}
        title={success.kind === "booked" ? "Locul tău este păstrat." : "Noul interval este păstrat."}
      />
      <div className={`${styles.scroller} min-h-0 px-5 py-7 sm:px-8 sm:py-8`}>
        <div className="mx-auto max-w-2xl text-center">
          <span className={`${styles.successMark} mx-auto flex size-20 items-center justify-center rounded-full bg-smart-teal text-white shadow-[0_24px_60px_rgba(31,111,120,0.28)]`}>
            <Check aria-hidden="true" className="size-9" strokeWidth={2.5} />
          </span>
          <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.2em] text-smart-teal">
            {success.kind === "booked" ? "Ne vedem la evaluare" : "Reprogramare reușită"}
          </p>
          <h3 className="mt-3 font-serif text-5xl font-semibold leading-[0.92]">
            {success.kind === "booked"
              ? "Evaluarea ta este programată."
              : "Evaluarea ta are o dată nouă."}
          </h3>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-smart-ink/62">
            Detaliile rămân în contul tău. Confirmarea este pregătită pentru
            adresa {maskEmail(success.appointment.contactEmail)}.
          </p>

          <div className="mt-7 text-left">
            <AppointmentDetails appointment={success.appointment} />
          </div>

          <div
            className={cn(
              "mt-5 flex items-start gap-3 rounded-[1.3rem] border p-4 text-left text-xs leading-6",
              notificationNeedsAttention
                ? "border-amber-300/50 bg-amber-50 text-amber-950"
                : "border-emerald-200 bg-emerald-50 text-emerald-900",
            )}
          >
            {notificationNeedsAttention ? (
              <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-700" />
            ) : (
              <MailCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-700" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                {notificationNeedsAttention
                  ? "Programarea este sigură, chiar dacă emailul întârzie."
                  : "Confirmarea pe email este în regulă."}
              </p>
              <p className="mt-1 opacity-75">{success.notification.message}</p>
              {success.notification.state === "failed" ? (
                <button
                  className="mt-2 inline-flex items-center gap-2 font-extrabold text-amber-900 underline underline-offset-4 disabled:opacity-50"
                  disabled={pending}
                  onClick={onRetryEmail}
                  type="button"
                >
                  {pending ? (
                    <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw aria-hidden="true" className="size-3.5" />
                  )}
                  Retrimite confirmarea
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-smart-teal px-6 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
              onClick={onDone}
              type="button"
            >
              Vezi programarea mea
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
            <a
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-smart-abyss/12 bg-white/72 px-6 py-3 text-sm font-extrabold text-smart-ink transition hover:border-smart-teal/30 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
              href={googleCalendarUrl(success.appointment)}
              rel="noopener noreferrer"
              target="_blank"
            >
              <CalendarDays aria-hidden="true" className="size-4 text-smart-teal" />
              Adaugă în calendar
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

function StepHeader({
  isRescheduling,
  onStopRescheduling,
  step,
  titleRef,
}: {
  isRescheduling: boolean;
  onStopRescheduling: () => void;
  step: WizardStep;
  titleRef: RefObject<HTMLHeadingElement | null>;
}) {
  const titles: Record<WizardStep, string> = {
    1: "Ce vrei să clarificăm împreună?",
    2: "Cum vrei să ne întâlnim?",
    3: "Alege ziua și ora potrivite.",
    4: "Verifică programarea.",
  };
  const progress = ((step - 1) / 3) * 100;

  return (
    <header className="relative z-10 shrink-0 border-b border-smart-abyss/8 bg-smart-cream/88 px-5 py-5 backdrop-blur-xl sm:px-8 sm:py-6">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-smart-teal">
            <HeartPulse aria-hidden="true" className="size-4 lg:hidden" />
            {isRescheduling ? "Reprogramare" : `Pasul ${step} din 4`}
          </p>
          <h2
            className="mt-2 font-serif text-3xl font-semibold leading-none outline-none sm:text-4xl"
            id="evaluation-step-title"
            ref={titleRef}
            tabIndex={-1}
          >
            {titles[step]}
          </h2>
        </div>
        {isRescheduling ? (
          <button
            className="shrink-0 rounded-full border border-smart-abyss/10 bg-white/66 px-3 py-2 text-xs font-bold text-smart-ink/58 transition hover:border-smart-teal/30 hover:text-smart-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-teal"
            onClick={onStopRescheduling}
            type="button"
          >
            Renunță
          </button>
        ) : null}
      </div>

      <div className="mt-5">
        <div
          aria-label="Progresul programării"
          aria-valuemax={4}
          aria-valuemin={1}
          aria-valuenow={step}
          aria-valuetext={`Pasul ${step} din 4`}
          className={styles.progressTrack}
          role="progressbar"
        >
          <span className={styles.progressFill} style={{ width: `${progress}%` }} />
          {[1, 2, 3, 4].map((item, index) => (
            <span
              aria-hidden="true"
              className={cn(
                styles.progressDot,
                item <= step && styles.progressDotActive,
              )}
              key={item}
              style={{ left: `${(index / 3) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </header>
  );
}

function MobileSelectionSummary({
  deliveryMode,
  goal,
  selectedSlot,
}: {
  deliveryMode: DeliveryMode | null;
  goal: EvaluationGoal | null;
  selectedSlot: EvaluationSlot | null;
}) {
  const items = [
    goal ? goalLabels[goal] : null,
    deliveryMode ? modeLabels[deliveryMode] : null,
    selectedSlot
      ? `${formatCompactDate(selectedSlot.startsAt)}, ${formatTime(selectedSlot.startsAt)} · ${formatPlaces(selectedSlot.remainingPlaces)}`
      : null,
  ].filter(Boolean) as string[];

  if (!items.length) return null;

  return (
    <div className="mb-5 flex flex-wrap gap-2 lg:hidden">
      {items.map((item) => (
        <span
          className="rounded-full border border-smart-teal/12 bg-smart-teal/8 px-3 py-1.5 text-[0.67rem] font-bold text-smart-teal"
          key={item}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function ReviewStep({
  customerNotes,
  goal,
  onCustomerNotesChange,
  onPhoneChange,
  onPrivacyChange,
  phone,
  privacyAccepted,
  selectedSlot,
  showPrivacy,
  viewer,
}: {
  customerNotes: string;
  goal: EvaluationGoal;
  onCustomerNotesChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onPrivacyChange: (value: boolean) => void;
  phone: string;
  privacyAccepted: boolean;
  selectedSlot: EvaluationSlot;
  showPrivacy: boolean;
  viewer: EvaluationViewer;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-[1.6rem] border border-smart-abyss/10 bg-white/66 p-5 sm:grid-cols-2 sm:p-6">
        <div className="flex gap-3">
          <CalendarDays aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-smart-teal" />
          <span>
            <span className="block text-[0.64rem] font-extrabold uppercase tracking-[0.15em] text-smart-ink/42">
              Data și ora
            </span>
            <strong className="mt-1 block text-sm leading-6">
              {formatLongDate(selectedSlot.startsAt)}
              <span className="block text-smart-teal">
                {formatInterval(selectedSlot.startsAt, selectedSlot.endsAt)}
              </span>
            </strong>
          </span>
        </div>
        <div className="flex gap-3">
          {selectedSlot.deliveryMode === "online" ? (
            <MonitorPlay aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-smart-teal" />
          ) : (
            <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-smart-teal" />
          )}
          <span>
            <span className="block text-[0.64rem] font-extrabold uppercase tracking-[0.15em] text-smart-ink/42">
              Format
            </span>
            <strong className="mt-1 block text-sm leading-6">
              {modeLabels[selectedSlot.deliveryMode]}
              <span className="block font-medium text-smart-ink/50">
                {selectedSlot.locationName}
              </span>
            </strong>
          </span>
        </div>
        <div className="flex gap-3 border-t border-smart-abyss/8 pt-4 sm:col-span-2">
          <Compass aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-smart-teal" />
          <span>
            <span className="block text-[0.64rem] font-extrabold uppercase tracking-[0.15em] text-smart-ink/42">
              Obiectiv
            </span>
            <strong className="mt-1 block text-sm leading-6">{goalLabels[goal]}</strong>
          </span>
        </div>
        <div className="flex gap-3 border-t border-smart-abyss/8 pt-4 sm:col-span-2">
          <UserRoundCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-smart-teal" />
          <span>
            <span className="block text-[0.64rem] font-extrabold uppercase tracking-[0.15em] text-smart-ink/42">
              Disponibilitate
            </span>
            <strong className="mt-1 block text-sm leading-6">
              {formatPlaces(selectedSlot.remainingPlaces)} la momentul selecției
            </strong>
            <span className="mt-1 block text-xs leading-5 text-smart-ink/50">
              Evaluarea poate avea loc într-un grup restrâns. Locul tău devine
              rezervat după confirmarea de mai jos.
            </span>
          </span>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-smart-teal/13 bg-smart-teal/[0.055] p-5">
        <div className="flex items-start gap-3">
          <UserRoundCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-smart-teal" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">{viewer.fullName}</p>
            <p className="mt-1 truncate text-xs text-smart-ink/54">{viewer.email}</p>
            {viewer.profileSummary.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {viewer.profileSummary.map((item) => (
                  <span
                    className="rounded-full bg-white/62 px-3 py-1.5 text-[0.65rem] font-bold text-smart-ink/58 ring-1 ring-smart-abyss/7"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <Link
            className="shrink-0 text-xs font-bold text-smart-teal underline underline-offset-4"
            href="/cont"
          >
            Modifică
          </Link>
        </div>
      </div>

      <label className="grid gap-2 text-sm font-bold" htmlFor="evaluation-phone">
        Telefon <span className="font-normal text-smart-ink/45">(opțional)</span>
        <input
          autoComplete="tel"
          className="min-h-12 rounded-2xl border border-smart-abyss/13 bg-white/82 px-4 text-sm outline-none transition focus:border-smart-teal focus:ring-2 focus:ring-smart-aqua/24"
          id="evaluation-phone"
          maxLength={32}
          onChange={(event) => onPhoneChange(event.target.value)}
          placeholder="07xx xxx xxx"
          type="tel"
          value={phone}
        />
      </label>

      <label className="grid gap-2 text-sm font-bold" htmlFor="evaluation-notes">
        Ce ar fi util să știm înainte?{" "}
        <span className="font-normal text-smart-ink/45">(opțional)</span>
        <textarea
          className="min-h-24 resize-y rounded-2xl border border-smart-abyss/13 bg-white/82 px-4 py-3 text-sm leading-6 outline-none transition focus:border-smart-teal focus:ring-2 focus:ring-smart-aqua/24"
          id="evaluation-notes"
          maxLength={600}
          onChange={(event) => onCustomerNotesChange(event.target.value)}
          placeholder="De exemplu: capitolele care îți dau cele mai multe bătăi de cap."
          value={customerNotes}
        />
        <span className="text-right text-[0.65rem] font-semibold text-smart-ink/38">
          {customerNotes.length}/600
        </span>
      </label>

      {showPrivacy ? (
        <label className="flex items-start gap-3 rounded-2xl border border-smart-abyss/9 bg-white/65 p-4 text-xs leading-6 text-smart-ink/64">
          <input
            checked={privacyAccepted}
            className="mt-1 size-4 shrink-0 accent-smart-teal"
            onChange={(event) => onPrivacyChange(event.target.checked)}
            required
            type="checkbox"
          />
          <span>
            Sunt de acord cu folosirea datelor pentru organizarea evaluării,
            conform{" "}
            <Link
              className="font-bold text-smart-teal underline underline-offset-2"
              href="/confidentialitate"
              target="_blank"
            >
              politicii de confidențialitate
            </Link>
            .
          </span>
        </label>
      ) : (
        <p className="flex items-start gap-3 rounded-2xl border border-smart-teal/12 bg-smart-teal/[0.055] p-4 text-xs leading-6 text-smart-ink/62">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-smart-teal" />
          Folosim acordul oferit la programarea inițială; acum se schimbă doar
          intervalul întâlnirii.
        </p>
      )}
    </div>
  );
}

function Wizard({
  initialAppointment,
  onAppointmentChange,
  onDraftChange,
  onNotice,
  onStopRescheduling,
  referenceNow,
  slots,
  source,
  viewer,
}: {
  initialAppointment: EvaluationAppointment | null;
  onAppointmentChange: (appointment: EvaluationAppointment) => void;
  onDraftChange: (draft: DraftSummary) => void;
  onNotice: (message: string) => void;
  onStopRescheduling: () => void;
  referenceNow: string;
  slots: EvaluationSlot[];
  source: string;
  viewer: EvaluationViewer;
}) {
  const router = useRouter();
  const isRescheduling = Boolean(initialAppointment);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bookingRequestIdRef = useRef<string | null>(null);
  const [step, setStep] = useState<WizardStep>(isRescheduling ? 2 : 1);
  const [goal, setGoal] = useState<EvaluationGoal | null>(
    initialAppointment ? initialAppointment.goal ?? "choose_program" : null,
  );
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode | null>(
    initialAppointment?.deliveryMode ?? null,
  );
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [selectedSlotSnapshot, setSelectedSlotSnapshot] =
    useState<EvaluationSlot | null>(null);
  const [phone, setPhone] = useState(viewer.phone ?? "");
  const [customerNotes, setCustomerNotes] = useState(
    initialAppointment?.customerNotes ?? "",
  );
  const [privacyAccepted, setPrivacyAccepted] = useState(isRescheduling);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedSlot =
    slots.find((slot) => slot.slotId === selectedSlotId) ??
    (selectedSlotSnapshot?.slotId === selectedSlotId
      ? selectedSlotSnapshot
      : null);
  const formats = useMemo(
    () => new Set(slots.map((slot) => slot.deliveryMode)),
    [slots],
  );
  const matchingSlots = useMemo(
    () =>
      slots
        .filter((slot) => !deliveryMode || slot.deliveryMode === deliveryMode)
        .filter(
          (slot) =>
            !initialAppointment ||
            slot.startsAt !== initialAppointment.startsAt ||
            slot.endsAt !== initialAppointment.endsAt ||
            slot.deliveryMode !== initialAppointment.deliveryMode ||
            (initialAppointment.locationName !== null &&
              slot.locationName !== initialAppointment.locationName),
        )
        .sort(
          (left, right) =>
            new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
        ),
    [deliveryMode, initialAppointment, slots],
  );
  const groupedSlots = useMemo(() => {
    const groups = new Map<string, EvaluationSlot[]>();

    for (const slot of matchingSlots) {
      const key = dateKeyFormatter.format(new Date(slot.startsAt));
      groups.set(key, [...(groups.get(key) ?? []), slot]);
    }

    return [...groups.entries()];
  }, [matchingSlots]);

  useEffect(() => {
    contentRef.current?.scrollTo({ behavior: "smooth", top: 0 });
    titleRef.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    onDraftChange({ deliveryMode, goal, selectedSlot, slotConfirmed: false, step });
  }, [deliveryMode, goal, onDraftChange, selectedSlot, step]);

  const normalizedPhone = phone.trim();
  const phoneIsValid = !normalizedPhone || normalizedPhone.length >= 7;
  const canContinue =
    (step === 1 && Boolean(goal)) ||
    (step === 2 && Boolean(deliveryMode)) ||
    (step === 3 && Boolean(selectedSlot)) ||
    (step === 4 && privacyAccepted && phoneIsValid);

  function selectMode(mode: DeliveryMode) {
    if (!formats.has(mode)) return;

    setDeliveryMode(mode);
    setSelectedSlotId(null);
    setSelectedSlotSnapshot(null);
    setMessage("");
  }

  function goBack() {
    setMessage("");
    setStep((current) => Math.max(1, current - 1) as WizardStep);
  }

  function continueForward() {
    if (!canContinue || step === 4) return;

    setMessage("");
    setStep((current) => Math.min(4, current + 1) as WizardStep);
  }

  function createAppointmentFromResult(
    appointmentResult: {
      bookingVersion: number;
      endsAt: string;
      publicId: string;
      startsAt: string;
      status: EvaluationAppointment["status"];
    },
    slot: EvaluationSlot,
  ): EvaluationAppointment {
    return {
      bookingVersion: appointmentResult.bookingVersion,
      contactEmail: viewer.email,
      contactName: viewer.fullName,
      contactPhone: normalizedPhone || viewer.phone,
      customerNotes: customerNotes.trim() || null,
      deliveryMode: slot.deliveryMode,
      endsAt: appointmentResult.endsAt,
      goal,
      lastRescheduledAt: isRescheduling ? new Date(referenceNow).toISOString() : null,
      locationAddress: initialAppointment?.locationAddress ?? null,
      locationCity: slot.locationCity,
      locationName: slot.locationName,
      publicId: appointmentResult.publicId,
      rescheduleCount: isRescheduling
        ? (initialAppointment?.rescheduleCount ?? 0) + 1
        : 0,
      staffName: slot.staffName,
      staffTitle: slot.staffTitle,
      startsAt: appointmentResult.startsAt,
      status: appointmentResult.status,
    };
  }

  function submit() {
    if (!goal || !selectedSlot || !privacyAccepted || !phoneIsValid || pending) {
      if (!phoneIsValid) {
        setMessage("Verifică numărul de telefon sau lasă câmpul gol.");
      }
      return;
    }

    setMessage("");
    startTransition(async () => {
      const result = initialAppointment
        ? await rescheduleEvaluationAction({
            publicId: initialAppointment.publicId,
            slotId: selectedSlot.slotId,
          })
        : await bookEvaluationAction({
            bookingRequestId:
              bookingRequestIdRef.current ??
              (bookingRequestIdRef.current = crypto.randomUUID()),
            customerNotes: customerNotes.trim() || undefined,
            goal,
            phone: normalizedPhone || undefined,
            privacyAccepted,
            slotId: selectedSlot.slotId,
            source,
          });

      if (!result.ok) {
        setMessage(result.message);

        if (result.fieldErrors?.slotId?.length) {
          setSelectedSlotId(null);
          setSelectedSlotSnapshot(null);
          setStep(3);
        }
        return;
      }

      const appointment = createAppointmentFromResult(
        result.data.appointment,
        selectedSlot,
      );
      onNotice("");
      onDraftChange({
        deliveryMode,
        goal,
        selectedSlot,
        slotConfirmed: true,
        step,
      });
      setSuccess({
        appointment,
        kind: initialAppointment ? "rescheduled" : "booked",
        notification: result.data.notification,
      });
    });
  }

  function retryEmail() {
    if (!success || pending) return;

    startTransition(async () => {
      const result = await retryEvaluationEmailAction({
        publicId: success.appointment.publicId,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setSuccess((current) =>
        current
          ? {
              ...current,
              notification: result.data.notification,
            }
          : current,
      );
    });
  }

  if (success) {
    return (
      <SuccessView
        onDone={() => {
          onAppointmentChange(success.appointment);
          setSuccess(null);
          onNotice("");
          onStopRescheduling();
          router.refresh();
        }}
        onRetryEmail={retryEmail}
        pending={pending}
        success={success}
      />
    );
  }

  return (
    <>
      <StepHeader
        isRescheduling={isRescheduling}
        onStopRescheduling={onStopRescheduling}
        step={step}
        titleRef={titleRef}
      />

      <div
        aria-labelledby="evaluation-step-title"
        className={`${styles.scroller} min-h-0 px-5 py-6 sm:px-8 sm:py-7`}
        ref={contentRef}
      >
        <MobileSelectionSummary
          deliveryMode={deliveryMode}
          goal={goal}
          selectedSlot={selectedSlot}
        />

        <div className={styles.stepContent} key={step}>
          {step === 1 ? (
            <>
              <div className="mb-5">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-smart-gold">
                  Obiectivul întâlnirii
                </p>
                <p className="mt-2 text-sm leading-6 text-smart-ink/62">
                  Alege lucrul care ți-ar fi cel mai util acum. Nu este o
                  decizie definitivă.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2" role="group">
                {goalChoices.map((choice) => (
                  <ChoiceCard
                    choice={choice}
                    key={choice.value}
                    onSelect={() => {
                      setGoal(choice.value);
                      setMessage("");
                    }}
                    selected={goal === choice.value}
                  />
                ))}
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="mb-5">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-smart-gold">
                  Formatul întâlnirii
                </p>
                <p className="mt-2 text-sm leading-6 text-smart-ink/62">
                  Durata și conținutul sunt aceleași. Alege varianta care îți
                  este mai comodă.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2" role="group">
                {([
                  {
                    description:
                      "Ne întâlnim într-un grup restrâns și poți descoperi atmosfera SmartMed.",
                    Icon: Building2,
                    label: modeLabels.in_person,
                    value: "in_person" as const,
                  },
                  {
                    description:
                      "Participi din locul în care ești, într-un grup online restrâns.",
                    Icon: MonitorPlay,
                    label: modeLabels.online,
                    value: "online" as const,
                  },
                ]).map((mode) => {
                  const available = formats.has(mode.value);
                  const selected = deliveryMode === mode.value;

                  return (
                    <button
                      aria-disabled={!available}
                      aria-pressed={selected}
                      className={cn(
                        "group relative min-h-[220px] rounded-[1.65rem] border p-6 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-teal",
                        selected
                          ? "border-smart-teal bg-smart-teal/[0.09] shadow-[0_18px_44px_rgba(31,111,120,0.13)]"
                          : available
                            ? "border-smart-abyss/10 bg-white/68 hover:-translate-y-0.5 hover:border-smart-teal/28 hover:bg-white"
                            : "cursor-not-allowed border-smart-abyss/8 bg-smart-cream-deep/42 opacity-55",
                      )}
                      disabled={!available}
                      key={mode.value}
                      onClick={() => selectMode(mode.value)}
                      type="button"
                    >
                      <span
                        className={cn(
                          "flex size-12 items-center justify-center rounded-2xl",
                          selected
                            ? "bg-smart-teal text-white"
                            : "bg-smart-cream-deep text-smart-teal",
                        )}
                      >
                        <mode.Icon aria-hidden="true" className="size-6" />
                      </span>
                      <h3 className="mt-7 font-serif text-3xl font-semibold leading-none">
                        {mode.label}
                      </h3>
                      <p className="mt-3 text-xs leading-6 text-smart-ink/58">
                        {mode.description}
                      </p>
                      <span
                        className={cn(
                          "mt-5 inline-flex rounded-full px-3 py-1.5 text-[0.65rem] font-extrabold uppercase tracking-[0.12em]",
                          available
                            ? "bg-smart-teal/9 text-smart-teal"
                            : "bg-smart-abyss/6 text-smart-ink/44",
                        )}
                      >
                        {available ? "Intervale disponibile" : "Fără intervale momentan"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-smart-gold">
                    Calendar disponibil
                  </p>
                  <p className="mt-2 text-sm leading-6 text-smart-ink/62">
                    Orele sunt afișate în fusul orar al României. Evaluarea se
                    poate desfășura într-un grup restrâns.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-smart-abyss/9 bg-white/62 px-3 py-2 text-[0.66rem] font-bold text-smart-ink/52">
                  <Clock3 aria-hidden="true" className="size-3.5 text-smart-teal" />
                  Durată: 30 min
                </span>
              </div>

              {groupedSlots.length ? (
                <div className="grid gap-4">
                  {groupedSlots.map(([dateKey, daySlots]) => (
                    <section
                      className={`${styles.slotGroup} rounded-[1.55rem] border border-smart-abyss/9 bg-white/62 p-4 sm:p-5`}
                      key={dateKey}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-10 items-center justify-center rounded-2xl bg-smart-aqua/13 text-smart-teal">
                            <CalendarDays aria-hidden="true" className="size-4" />
                          </span>
                          <div>
                            <h3 className="font-serif text-2xl font-semibold leading-none">
                              {formatLongDate(daySlots[0].startsAt)}
                            </h3>
                            <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-smart-ink/38">
                              {formatPlaces(
                                daySlots.reduce(
                                  (total, slot) => total + slot.remainingPlaces,
                                  0,
                                ),
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2" role="group">
                        {daySlots.map((slot) => {
                          const selected = selectedSlotId === slot.slotId;

                          return (
                            <button
                              aria-label={`${formatLongDate(slot.startsAt)}, ${formatInterval(slot.startsAt, slot.endsAt)}, ${slot.locationName}, ${formatPlaces(slot.remainingPlaces)}`}
                              aria-pressed={selected}
                              className={cn(
                                "min-h-14 rounded-2xl border px-4 py-2 text-left text-sm font-extrabold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-teal",
                                selected
                                  ? "border-smart-teal bg-smart-teal text-white shadow-[0_12px_28px_rgba(31,111,120,0.22)]"
                                  : "border-smart-abyss/11 bg-white/78 text-smart-ink hover:-translate-y-0.5 hover:border-smart-teal/32 hover:text-smart-teal",
                              )}
                              key={slot.slotId}
                              onClick={() => {
                                setSelectedSlotId(slot.slotId);
                                setSelectedSlotSnapshot(slot);
                                setMessage("");
                              }}
                              type="button"
                            >
                              <span className="block">
                                {formatInterval(slot.startsAt, slot.endsAt)}
                              </span>
                              <span
                                className={cn(
                                  "mt-0.5 block text-[0.65rem] font-bold",
                                  selected
                                    ? "text-white/76"
                                    : slot.remainingPlaces <= 2
                                      ? "text-amber-700"
                                      : "text-smart-teal/72",
                                )}
                              >
                                {slot.remainingPlaces <= 2
                                  ? `Doar ${formatPlaces(slot.remainingPlaces)}`
                                  : formatPlaces(slot.remainingPlaces)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {selectedSlot &&
                      dateKeyFormatter.format(new Date(selectedSlot.startsAt)) === dateKey ? (
                        <div className="mt-4 flex items-start gap-3 border-t border-smart-abyss/8 pt-4 text-xs leading-6 text-smart-ink/58">
                          <Stethoscope aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-smart-teal" />
                          <p>
                            <strong className="text-smart-ink">
                              {selectedSlot.staffName}
                            </strong>
                            {selectedSlot.staffTitle ? ` · ${selectedSlot.staffTitle}` : ""}
                            <span className="block">
                              {selectedSlot.publicLabel ?? selectedSlot.locationName}
                            </span>
                            <span
                              className={cn(
                                "mt-1 block font-bold",
                                selectedSlot.remainingPlaces <= 2
                                  ? "text-amber-700"
                                  : "text-smart-teal",
                              )}
                            >
                              {selectedSlot.remainingPlaces <= 2
                                ? `Au mai rămas doar ${formatPlaces(selectedSlot.remainingPlaces)}.`
                                : `${formatPlaces(selectedSlot.remainingPlaces)} acum.`}
                            </span>
                            <span className="block text-smart-ink/46">
                              Se verifică din nou când confirmi programarea.
                            </span>
                          </p>
                        </div>
                      ) : null}
                    </section>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.6rem] border border-dashed border-smart-teal/24 bg-white/48 px-5 py-12 text-center">
                  <CalendarDays aria-hidden="true" className="mx-auto size-8 text-smart-teal" />
                  <h3 className="mt-4 font-serif text-3xl font-semibold">
                    Nu mai sunt intervale în acest format
                  </h3>
                  <p className="mx-auto mt-3 max-w-md text-xs leading-6 text-smart-ink/56">
                    Întoarce-te la pasul anterior și verifică celălalt format.
                  </p>
                </div>
              )}
            </>
          ) : null}

          {step === 4 && goal && selectedSlot ? (
            <ReviewStep
              customerNotes={customerNotes}
              goal={goal}
              onCustomerNotesChange={(value) => {
                setCustomerNotes(value);
                setMessage("");
              }}
              onPhoneChange={(value) => {
                setPhone(value);
                setMessage("");
              }}
              onPrivacyChange={(value) => {
                setPrivacyAccepted(value);
                setMessage("");
              }}
              phone={phone}
              privacyAccepted={privacyAccepted}
              selectedSlot={selectedSlot}
              showPrivacy={!isRescheduling}
              viewer={viewer}
            />
          ) : null}

          <p
            aria-live={message ? "assertive" : "polite"}
            className={cn(
              "mt-5 min-h-5 rounded-2xl px-1 text-xs font-bold",
              message ? "border border-red-200 bg-red-50 p-4 text-red-800" : "text-smart-ink/46",
            )}
            role={message ? "alert" : "status"}
          >
            {message ||
              (step === 4
                ? "Intervalul este verificat din nou în momentul confirmării."
                : "Selecțiile tale rămân disponibile cât timp parcurgi pașii.")}
          </p>
        </div>
      </div>

      <footer className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-t border-smart-abyss/8 bg-smart-cream/94 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-16px_36px_rgba(3,17,28,0.05)] backdrop-blur-xl sm:px-8">
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-smart-ink/68 transition hover:text-smart-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-teal disabled:cursor-not-allowed disabled:opacity-38"
          disabled={step === 1 || pending}
          onClick={goBack}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Înapoi
        </button>
        <button
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-smart-teal px-6 py-3 text-sm font-extrabold text-white shadow-[0_16px_38px_rgba(31,111,120,0.22)] transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-teal disabled:cursor-not-allowed disabled:opacity-42 disabled:hover:translate-y-0"
          disabled={!canContinue || pending}
          onClick={step === 4 ? submit : continueForward}
          type="button"
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : step === 4 ? (
            <CheckCircle2 aria-hidden="true" className="size-4" />
          ) : null}
          {pending
            ? isRescheduling
              ? "Se reprogramează…"
              : "Se confirmă…"
            : step === 4
              ? isRescheduling
                ? "Confirmă noul interval"
                : "Confirmă programarea"
              : "Continuă"}
          {!pending && step < 4 ? <ArrowRight aria-hidden="true" className="size-4" /> : null}
        </button>
      </footer>
    </>
  );
}

export function EvaluationBooking({
  appointments,
  dataError,
  referenceNow,
  slots,
  source = "home-hero",
  viewer,
}: EvaluationBookingProps) {
  const router = useRouter();
  const initialActiveAppointment =
    appointments.find(
      (appointment) =>
        activeStatuses.has(appointment.status) &&
        new Date(appointment.startsAt).getTime() > new Date(referenceNow).getTime(),
    ) ?? null;
  const [appointment, setAppointment] = useState<EvaluationAppointment | null>(
    initialActiveAppointment,
  );
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [draftSummary, setDraftSummary] = useState<DraftSummary>({
    deliveryMode: null,
    goal: null,
    selectedSlot: null,
  });
  const [pending, startTransition] = useTransition();

  function cancelAppointment() {
    if (!appointment || pending) return;

    setMessage("");
    startTransition(async () => {
      const result = await cancelEvaluationAction({
        publicId: appointment.publicId,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setAppointment(null);
      setCancelConfirm(false);
      setNotice("Programarea a fost anulată. Poți alege un alt interval oricând.");
      router.refresh();
    });
  }

  const existingSummarySlot: EvaluationSlot | null =
    appointment && !rescheduling
      ? {
          bookedCount: 0,
          capacity: 0,
          deliveryMode: appointment.deliveryMode,
          endsAt: appointment.endsAt,
          locationCity: appointment.locationCity,
          locationName: appointment.locationName ?? modeLabels[appointment.deliveryMode],
          publicLabel: null,
          remainingPlaces: 0,
          slotId: -1,
          staffName: appointment.staffName ?? "Echipa SmartMed",
          staffTitle: appointment.staffTitle,
          startsAt: appointment.startsAt,
        }
      : null;
  const summaryDeliveryMode =
    appointment && !rescheduling
      ? appointment.deliveryMode
      : draftSummary.deliveryMode;
  const summaryGoal =
    appointment && !rescheduling ? appointment.goal : draftSummary.goal;

  return (
    <section
      className="relative overflow-hidden bg-smart-cream px-4 pb-28 pt-20 text-smart-ink sm:px-7 sm:pb-36 sm:pt-24 lg:px-8"
      id="programare"
    >
      <div className="absolute right-[-9rem] top-20 size-[390px] rounded-full border border-smart-teal/10" />
      <div className="absolute -left-48 bottom-24 size-[420px] rounded-full bg-smart-gold/9 blur-3xl" />
      <div className="relative z-10 mx-auto max-w-[1180px]">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-smart-gold">
              Programarea ta
            </p>
            <h2 className="mt-4 max-w-4xl font-serif text-5xl font-semibold leading-[0.96] tracking-[-0.03em] sm:text-6xl">
              Patru pași. Fără formular inutil.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-smart-ink/58">
            Alegi obiectivul, formatul și ora. Datele de identificare vin sigur
            din contul tău.
          </p>
        </div>

        {notice ? (
          <p
            aria-live="polite"
            className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
            role="status"
          >
            <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
            {notice}
          </p>
        ) : null}

        <div className={styles.frame}>
          <SummaryAside
            deliveryMode={summaryDeliveryMode}
            goal={summaryGoal}
            selectedSlot={existingSummarySlot ?? draftSummary.selectedSlot}
            slotConfirmed={Boolean(existingSummarySlot) || draftSummary.slotConfirmed}
            step={draftSummary.step}
            viewer={viewer}
          />

          <section className={styles.panel} aria-label="Programare evaluare SmartMed">
            {!viewer ? (
              <AccessGate />
            ) : !viewer.emailConfirmed ? (
              <EmailConfirmationGate email={viewer.email} />
            ) : dataError ? (
              <DataErrorState message={dataError} onRefresh={() => router.refresh()} />
            ) : appointment && !rescheduling ? (
              <ExistingAppointment
                appointment={appointment}
                cancelConfirm={cancelConfirm}
                message={message}
                onCancel={cancelAppointment}
                onCancelConfirmChange={(value) => {
                  setCancelConfirm(value);
                  setMessage("");
                }}
                onReschedule={() => {
                  setMessage("");
                  setRescheduling(true);
                }}
                pending={pending}
              />
            ) : slots.length === 0 ? (
              <EmptySlotsState onRefresh={() => router.refresh()} />
            ) : (
              <Wizard
                initialAppointment={rescheduling ? appointment : null}
                key={rescheduling ? appointment?.publicId ?? "reschedule" : "new"}
                onAppointmentChange={(nextAppointment) => {
                  setAppointment(nextAppointment);
                  setNotice("");
                }}
                onDraftChange={setDraftSummary}
                onNotice={setNotice}
                onStopRescheduling={() => setRescheduling(false)}
                referenceNow={referenceNow}
                slots={slots}
                source={source}
                viewer={viewer}
              />
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
