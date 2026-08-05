"use client";

import {
  CalendarCheck2,
  CalendarDays,
  CalendarPlus2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  LoaderCircle,
  Mail,
  MapPin,
  Monitor,
  Phone,
  RotateCcw,
  Save,
  Search,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  createSmartMedEvaluationSlotAction,
  deleteAllSmartMedEvaluationSlotsAction,
  deleteSmartMedEvaluationSlotAction,
  retrySmartMedEvaluationNotificationAction,
  updateSmartMedEvaluationAction,
  updateSmartMedEvaluationSlotCapacityAction,
} from "@/app/admin/evaluari/actions";
import {
  evaluationStatuses,
  type EvaluationStatus,
} from "@/lib/evaluations/admin-schema";
import {
  addCivilDays,
  addCivilMonths,
  bucharestDateKey,
  bucharestWallTimeToIso,
  calendarGridKeys,
  civilDateFromKey,
  monthStartKey,
} from "@/lib/evaluations/admin-calendar";
import type {
  AdminEvaluationRow,
  AdminEvaluationSlot,
  EvaluationSlotCatalog,
} from "@/lib/evaluations/admin-types";
import { cn } from "@/lib/utils";

type EvaluationAdminDashboardProps = {
  catalog: EvaluationSlotCatalog | null;
  catalogError: string | null;
  evaluations: AdminEvaluationRow[];
  evaluationsError: string | null;
  referenceNow: string;
  slots: AdminEvaluationSlot[];
  slotsError: string | null;
};

type Feedback = {
  isError: boolean;
  message: string;
};

const statusLabels: Record<EvaluationStatus, string> = {
  cancelled: "Anulată",
  completed: "Finalizată",
  confirmed: "Confirmată",
  declined: "Refuzată",
  no_show: "Absent",
  pending: "În verificare",
  requested: "Solicitată",
};

const activeEvaluationStatuses = new Set<EvaluationStatus>([
  "requested",
  "pending",
  "confirmed",
]);

const goalLabels: Record<string, string> = {
  build_plan: "Plan de pregătire",
  choose_modules: "Alegerea modulelor",
  choose_program: "Alegerea programului",
  evaluate_level: "Evaluarea nivelului",
  visit_center: "Vizită la centru",
};

const notificationLabels: Record<string, string> = {
  failed: "Email eșuat",
  pending: "Email în așteptare",
  pending_configuration: "Email neconfigurat",
  processing: "Email în curs",
  sent: "Email trimis",
};

const dateTimeFormatter = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  timeZone: "Europe/Bucharest",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("ro-RO", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Bucharest",
});

const dayFormatter = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Bucharest",
  weekday: "long",
});

const calendarMonthFormatter = new Intl.DateTimeFormat("ro-RO", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

const compactDateFormatter = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  weekday: "long",
  year: "numeric",
});

const timeOptions = Array.from({ length: 25 }, (_, index) => {
  const minutes = 8 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

function metadataValue(metadata: AdminEvaluationRow["metadata"], key: string) {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : null;
}

function formatSchedule(startsAt: string, endsAt: string) {
  return `${dateTimeFormatter.format(new Date(startsAt))}–${timeFormatter.format(new Date(endsAt))}`;
}

function statusClass(status: EvaluationStatus) {
  if (status === "confirmed" || status === "completed") {
    return "border-emerald-600/20 bg-emerald-50 text-emerald-800";
  }

  if (status === "pending" || status === "requested") {
    return "border-amber-600/20 bg-amber-50 text-amber-800";
  }

  if (["cancelled", "declined", "no_show"].includes(status)) {
    return "border-red-600/20 bg-red-50 text-red-800";
  }

  return "border-smart-abyss/10 bg-smart-cream text-smart-ink/62";
}

function notificationClass(status: string | null) {
  if (status === "sent") {
    return "border-emerald-600/20 bg-emerald-50 text-emerald-800";
  }

  if (status === "failed" || status === "pending_configuration") {
    return "border-red-600/20 bg-red-50 text-red-800";
  }

  return "border-smart-teal/18 bg-smart-aqua/10 text-smart-teal";
}

function escapeCsv(value: unknown) {
  const text = value == null ? "" : String(value);
  const singleLine = text.replace(/[\r\n\t]+/gu, " ").replaceAll("\0", "");
  const neutralized = /^\s*[=+\-@]/u.test(singleLine)
    ? `'${singleLine}`
    : singleLine;

  return `"${neutralized.replaceAll('"', '""')}"`;
}

function EvaluationRowActions({
  evaluation,
  onFeedback,
  slots,
}: {
  evaluation: AdminEvaluationRow;
  onFeedback: (feedback: Feedback) => void;
  slots: AdminEvaluationSlot[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [slotId, setSlotId] = useState("");
  const [status, setStatus] = useState<EvaluationStatus>(evaluation.status);
  const activeStatus = activeEvaluationStatuses.has(status);
  const reactivating =
    activeStatus && !activeEvaluationStatuses.has(evaluation.status);

  function save() {
    if (reactivating && !slotId) {
      onFeedback({
        isError: true,
        message:
          "Pentru reactivare, alege o sesiune viitoare cu locuri disponibile.",
      });
      return;
    }

    if (!activeStatus && slotId) {
      onFeedback({
        isError: true,
        message: "O programare închisă nu poate fi mutată într-o sesiune nouă.",
      });
      return;
    }

    if (
      ["cancelled", "declined"].includes(status) &&
      status !== evaluation.status &&
      !window.confirm(
        status === "cancelled"
          ? "Anulezi această programare? Studentul va primi o notificare."
          : "Marchezi această solicitare ca refuzată?",
      )
    ) {
      return;
    }

    onFeedback({ isError: false, message: "Se salvează modificarea…" });
    startTransition(async () => {
      const result = await updateSmartMedEvaluationAction({
        publicId: evaluation.public_id,
        reason,
        slotId: slotId ? Number(slotId) : null,
        status,
      });

      if (!result.ok) {
        onFeedback({ isError: true, message: result.message });
        return;
      }

      setReason("");
      setSlotId("");
      onFeedback({
        isError: false,
        message: "Programarea a fost actualizată.",
      });
      router.refresh();
    });
  }

  function retryEmail() {
    onFeedback({ isError: false, message: "Notificarea este repusă în coadă…" });
    startTransition(async () => {
      const result = await retrySmartMedEvaluationNotificationAction({
        publicId: evaluation.public_id,
      });

      if (!result.ok) {
        onFeedback({ isError: true, message: result.message });
        return;
      }

      onFeedback({
        isError:
          result.data.notificationState === "failed" ||
          result.data.notificationState === "not_configured",
        message:
          result.data.notificationState === "sent"
            ? "Emailul a fost retransmis cu succes."
            : result.data.notificationState === "not_configured"
              ? "Emailul rămâne în așteptare până la configurarea serviciului."
              : result.data.notificationState === "failed"
                ? "Emailul nu a putut fi livrat încă; programarea rămâne salvată."
                : "Notificarea este deja trimisă sau se află în curs de livrare.",
      });
      router.refresh();
    });
  }

  return (
    <details className="group">
      <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-smart-abyss/12 bg-white px-3 text-xs font-bold text-smart-ink transition hover:border-smart-teal/35 marker:hidden">
        Gestionează
        <ChevronDown
          aria-hidden="true"
          className="size-4 transition group-open:rotate-180"
        />
      </summary>
      <div className="mt-3 grid min-w-[18rem] gap-3 rounded-2xl border border-smart-abyss/10 bg-[#fbf9f4] p-4 shadow-xl">
        <label className="grid gap-1.5 text-xs font-bold text-smart-ink/65">
          Status
          <select
            className="min-h-11 rounded-xl border border-smart-abyss/12 bg-white px-3 text-sm text-smart-ink outline-none focus:border-smart-teal"
            disabled={pending}
            onChange={(event) => {
              const nextStatus = event.target.value as EvaluationStatus;
              setStatus(nextStatus);
              if (!activeEvaluationStatuses.has(nextStatus)) setSlotId("");
            }}
            value={status}
          >
            {evaluationStatuses.map((option) => (
              <option key={option} value={option}>
                {statusLabels[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-smart-ink/65">
          {reactivating ? "Sesiune nouă (obligatoriu)" : "Reprogramare opțională"}
          <select
            className="min-h-11 rounded-xl border border-smart-abyss/12 bg-white px-3 text-sm text-smart-ink outline-none focus:border-smart-teal"
            disabled={pending || !activeStatus}
            onChange={(event) => setSlotId(event.target.value)}
            value={slotId}
          >
            <option value="">Păstrează data actuală</option>
            {slots
              .filter((slot) => slot.remaining_places > 0)
              .map((slot) => (
                <option key={slot.slot_id} value={slot.slot_id}>
                  {formatSchedule(slot.starts_at, slot.ends_at)} ·{" "}
                  {slot.location_name} · {slot.remaining_places}{" "}
                  {slot.remaining_places === 1 ? "loc" : "locuri"}
                </option>
              ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-smart-ink/65">
          Motiv / notă internă
          <textarea
            className="min-h-20 resize-y rounded-xl border border-smart-abyss/12 bg-white px-3 py-2 text-sm font-normal text-smart-ink outline-none focus:border-smart-teal"
            disabled={pending}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex: reprogramare solicitată telefonic"
            value={reason}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-smart-dark px-4 text-sm font-bold text-smart-white transition hover:bg-smart-teal disabled:cursor-wait disabled:opacity-55"
            disabled={pending}
            onClick={save}
            type="button"
          >
            {pending ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 aria-hidden="true" className="size-4" />
            )}
            Salvează
          </button>
          {evaluation.notification_status === "failed" ||
          evaluation.notification_status === "pending_configuration" ? (
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 text-xs font-bold text-red-800 disabled:opacity-55"
              disabled={pending}
              onClick={retryEmail}
              type="button"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Reîncearcă email
            </button>
          ) : null}
        </div>
      </div>
    </details>
  );
}

function SlotDateTimePicker({
  disabled,
  onDayChange,
  onTimeChange,
  referenceNow,
  selectedDay,
  selectedTime,
}: {
  disabled: boolean;
  onDayChange: (day: string) => void;
  onTimeChange: (time: string) => void;
  referenceNow: string;
  selectedDay: string;
  selectedTime: string;
}) {
  const referenceInstant = Date.parse(referenceNow);
  const latestAllowedInstant = referenceInstant + 90 * 24 * 60 * 60 * 1000;
  const todayKey = bucharestDateKey(new Date(referenceNow));
  const lastAllowedKey = addCivilDays(todayKey, 90) ?? todayKey;
  const [visibleMonth, setVisibleMonth] = useState(
    () => monthStartKey(todayKey) ?? todayKey,
  );
  const days = calendarGridKeys(visibleMonth);
  const canGoBack = visibleMonth.slice(0, 7) > todayKey.slice(0, 7);
  const canGoForward =
    visibleMonth.slice(0, 7) < lastAllowedKey.slice(0, 7);

  function moveMonth(direction: -1 | 1) {
    setVisibleMonth((current) => addCivilMonths(current, direction) ?? current);
  }

  return (
    <div className="grid max-w-[52rem] items-start gap-4 lg:grid-cols-[21rem_minmax(22rem,1fr)]">
      <section
        aria-label="Alege ziua evaluării"
        className="w-full max-w-[21rem] rounded-[1.35rem] border border-smart-abyss/10 bg-white p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <button
            aria-label="Luna anterioară"
            className="flex size-9 items-center justify-center rounded-xl border border-smart-abyss/10 text-smart-ink transition hover:border-smart-teal/35 disabled:cursor-not-allowed disabled:opacity-25"
            disabled={disabled || !canGoBack}
            onClick={() => moveMonth(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <p className="font-serif text-lg font-semibold capitalize">
            {calendarMonthFormatter.format(
              civilDateFromKey(visibleMonth) ?? new Date(referenceNow),
            )}
          </p>
          <button
            aria-label="Luna următoare"
            className="flex size-9 items-center justify-center rounded-xl border border-smart-abyss/10 text-smart-ink transition hover:border-smart-teal/35 disabled:cursor-not-allowed disabled:opacity-25"
            disabled={disabled || !canGoForward}
            onClick={() => moveMonth(1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[0.65rem] font-bold uppercase tracking-[0.12em] text-smart-ink/42">
          {["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {days.map((key) => {
            const day = civilDateFromKey(key);
            const outsideMonth =
              key.slice(0, 7) !== visibleMonth.slice(0, 7);
            const unavailable = key < todayKey || key > lastAllowedKey;
            const selected = selectedDay === key;

            if (!day) return null;

            return (
              <button
                aria-label={compactDateFormatter.format(day)}
                aria-pressed={selected}
                className={cn(
                  "mx-auto flex size-9 items-center justify-center rounded-xl text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal",
                  selected
                    ? "bg-smart-teal text-white shadow-md"
                    : "text-smart-ink hover:bg-smart-aqua/16",
                  outsideMonth && !selected && "text-smart-ink/28",
                  unavailable && "cursor-not-allowed opacity-25 hover:bg-transparent",
                )}
                disabled={disabled || unavailable}
                key={key}
                onClick={() => onDayChange(key)}
                type="button"
              >
                {day.getUTCDate()}
              </button>
            );
          })}
        </div>
      </section>

      <section
        aria-label="Alege ora evaluării"
        className="w-full max-w-[30rem] rounded-[1.35rem] border border-smart-abyss/10 bg-white p-4"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-smart-aqua/15 text-smart-teal">
            <Clock3 aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-smart-teal">
              Ora de început
            </p>
            <p className="mt-0.5 text-xs text-smart-ink/48">
              Intervale din 30 în 30 de minute
            </p>
          </div>
        </div>
        {!selectedDay ? (
          <div className="mt-5 rounded-2xl border border-dashed border-smart-teal/25 px-4 py-8 text-center text-sm text-smart-ink/50">
            Selectează mai întâi o zi din calendar.
          </div>
        ) : (
          <div className="mt-5 grid max-h-[16.5rem] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
            {timeOptions.map((time) => {
              const iso = bucharestWallTimeToIso(selectedDay, time);
              const instant = iso ? Date.parse(iso) : Number.NaN;
              const unavailable =
                !iso ||
                instant < referenceInstant + 5 * 60 * 1000 ||
                instant > latestAllowedInstant;
              return (
                <button
                  aria-pressed={selectedTime === time}
                  className={cn(
                    "min-h-10 rounded-xl border px-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal",
                    selectedTime === time
                      ? "border-smart-teal bg-smart-teal text-white"
                      : "border-smart-abyss/10 bg-white text-smart-ink hover:border-smart-teal/35 hover:bg-smart-aqua/8",
                    unavailable && "cursor-not-allowed opacity-30",
                  )}
                  disabled={disabled || unavailable}
                  key={time}
                  onClick={() => onTimeChange(time)}
                  type="button"
                >
                  {time}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function SlotCapacityEditor({
  onFeedback,
  slot,
}: {
  onFeedback: (feedback: Feedback) => void;
  slot: AdminEvaluationSlot;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const minimum = Math.max(1, slot.booked_count);
  const [capacity, setCapacity] = useState(slot.capacity);
  const changed = capacity !== slot.capacity;

  function saveCapacity() {
    if (capacity < minimum || capacity > 250 || !Number.isInteger(capacity)) {
      onFeedback({
        isError: true,
        message: `Capacitatea trebuie să fie între ${minimum} și 250 de locuri.`,
      });
      return;
    }

    onFeedback({ isError: false, message: "Se actualizează capacitatea…" });
    startTransition(async () => {
      const result = await updateSmartMedEvaluationSlotCapacityAction({
        capacity,
        slotId: slot.slot_id,
      });

      if (!result.ok) {
        onFeedback({ isError: true, message: result.message });
        return;
      }

      onFeedback({
        isError: false,
        message: "Numărul de locuri a fost actualizat.",
      });
      router.refresh();
    });
  }

  return (
    <div className="mt-4 border-t border-smart-abyss/8 pt-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold">
        <span className="text-smart-ink/58">
          {slot.booked_count}/{slot.capacity} ocupate
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 font-bold",
            slot.remaining_places > 0
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800",
          )}
        >
          {slot.remaining_places > 0
            ? `${slot.remaining_places} ${slot.remaining_places === 1 ? "loc liber" : "locuri libere"}`
            : "Sesiune completă"}
        </span>
      </div>
      <div
        aria-hidden="true"
        className="h-1.5 overflow-hidden rounded-full bg-smart-abyss/8"
      >
        <span
          className="block h-full rounded-full bg-smart-teal transition-[width]"
          style={{
            width: `${Math.min(100, (slot.booked_count / slot.capacity) * 100)}%`,
          }}
        />
      </div>
      <div className="mt-3 flex items-end gap-2">
        <label className="grid min-w-0 flex-1 gap-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-smart-ink/48">
          Capacitate totală
          <input
            aria-describedby={`capacity-help-${slot.slot_id}`}
            className="min-h-10 w-full rounded-xl border border-smart-abyss/12 bg-white px-3 text-sm font-bold text-smart-ink outline-none focus:border-smart-teal"
            disabled={pending}
            inputMode="numeric"
            max={250}
            min={minimum}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              if (Number.isInteger(nextValue)) {
                setCapacity(Math.min(250, Math.max(minimum, nextValue)));
              }
            }}
            type="number"
            value={capacity}
          />
        </label>
        <button
          aria-label="Salvează capacitatea"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-smart-dark text-white transition hover:bg-smart-teal disabled:cursor-not-allowed disabled:opacity-35"
          disabled={pending || !changed || capacity < minimum || capacity > 250}
          onClick={saveCapacity}
          type="button"
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>
      <p className="sr-only" id={`capacity-help-${slot.slot_id}`}>
        Minimum {minimum}, maximum 250 de locuri.
      </p>
    </div>
  );
}

function SlotManager({
  catalog,
  catalogError,
  onFeedback,
  referenceNow,
  slots,
  slotsError,
}: {
  catalog: EvaluationSlotCatalog | null;
  catalogError: string | null;
  onFeedback: (feedback: Feedback) => void;
  referenceNow: string;
  slots: AdminEvaluationSlot[];
  slotsError: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [capacity, setCapacity] = useState(8);
  const [locationId, setLocationId] = useState(
    catalog?.locations[0]?.id.toString() ?? "",
  );
  const [publicLabel, setPublicLabel] = useState("");
  const [staffMemberId, setStaffMemberId] = useState(
    catalog?.staff[0]?.id.toString() ?? "",
  );
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  function createSlot() {
    const startsAt =
      selectedDay && selectedTime
        ? bucharestWallTimeToIso(selectedDay, selectedTime)
        : null;

    if (
      !startsAt ||
      !staffMemberId ||
      !locationId ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 250
    ) {
      onFeedback({
        isError: true,
        message:
          "Alege ziua, ora, consilierul, locația și un număr valid de locuri.",
      });
      return;
    }

    onFeedback({ isError: false, message: "Se adaugă sesiunea…" });
    startTransition(async () => {
      const result = await createSmartMedEvaluationSlotAction({
        capacity,
        locationId: Number(locationId),
        publicLabel,
        staffMemberId: Number(staffMemberId),
        startsAt,
      });

      if (!result.ok) {
        onFeedback({ isError: true, message: result.message });
        return;
      }

      setSelectedDay("");
      setSelectedTime("");
      setCapacity(8);
      setPublicLabel("");
      onFeedback({
        isError: false,
        message: "Sesiunea a fost publicată și poate fi rezervată.",
      });
      router.refresh();
    });
  }

  const remainingPlaces = slots.reduce(
    (total, slot) => total + slot.remaining_places,
    0,
  );

  function deleteSlot(slot: AdminEvaluationSlot) {
    if (
      !window.confirm(
        `Ștergi sesiunea din ${dateTimeFormatter.format(new Date(slot.starts_at))}?`,
      )
    ) {
      return;
    }

    onFeedback({ isError: false, message: "Se elimină sesiunea…" });
    startTransition(async () => {
      const result = await deleteSmartMedEvaluationSlotAction({
        slotId: slot.slot_id,
      });

      if (!result.ok) {
        onFeedback({ isError: true, message: result.message });
        return;
      }

      onFeedback({ isError: false, message: "Sesiunea a fost eliminată." });
      router.refresh();
    });
  }

  function deleteAllSlots() {
    if (
      !window.confirm(
        "Ștergi toate sesiunile viitoare fără înscrieri? Sesiunile care au deja persoane programate vor fi păstrate.",
      )
    ) {
      return;
    }

    onFeedback({ isError: false, message: "Se curăță sesiunile libere…" });
    startTransition(async () => {
      const result = await deleteAllSmartMedEvaluationSlotsAction();

      if (!result.ok) {
        onFeedback({ isError: true, message: result.message });
        return;
      }

      const deletedLabel = `${result.data.deletedCount} ${result.data.deletedCount === 1 ? "sesiune ștearsă" : "sesiuni șterse"}`;
      const protectedLabel =
        result.data.protectedCount > 0
          ? ` ${result.data.protectedCount} ${result.data.protectedCount === 1 ? "sesiune cu înscrieri a fost păstrată" : "sesiuni cu înscrieri au fost păstrate"}.`
          : "";

      onFeedback({
        isError: false,
        message: `${deletedLabel}.${protectedLabel}`,
      });
      router.refresh();
    });
  }

  return (
    <section className="rounded-[2rem] border border-smart-abyss/10 bg-white/72 p-5 shadow-[0_18px_55px_rgba(3,17,28,0.055)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-smart-teal">
            Disponibilitate
          </p>
          <h2 className="mt-2 font-serif text-4xl font-semibold">
            Sesiuni deschise
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-smart-ink/58">
            Adaugă sesiuni și stabilește câte persoane pot participa la fiecare.
            Durata este fixată automat la {catalog?.durationMinutes ?? 30} de
            minute, în fusul Europe/București.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-smart-teal/15 bg-smart-aqua/10 px-3 py-1.5 text-xs font-bold text-smart-teal">
            {slots.length} {slots.length === 1 ? "sesiune" : "sesiuni"}
          </span>
          <span className="rounded-full border border-emerald-700/15 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
            {remainingPlaces}{" "}
            {remainingPlaces === 1 ? "loc rămas" : "locuri rămase"}
          </span>
          <button
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={pending || slots.length === 0}
            onClick={deleteAllSlots}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
            Șterge toate
          </button>
        </div>
      </div>

      {catalogError || slotsError ? (
        <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          {catalogError ?? slotsError}
        </p>
      ) : null}

      {catalog && catalog.staff.length > 0 && catalog.locations.length > 0 ? (
        <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-smart-abyss/8 bg-[#f8f4ec] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-smart-teal">
                <CalendarDays aria-hidden="true" className="size-4" />
                Ziua și ora
              </p>
              <p className="mt-1 text-sm text-smart-ink/52">
                Selectează prin click; ora este interpretată în Europe/București.
              </p>
            </div>
            <div className="rounded-2xl border border-smart-teal/15 bg-white px-4 py-2 text-right">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-smart-ink/40">
                Interval ales
              </p>
              <p className="mt-0.5 text-sm font-bold text-smart-ink">
                {selectedDay
                  ? compactDateFormatter.format(
                      civilDateFromKey(selectedDay) ?? new Date(referenceNow),
                    )
                  : "Nicio zi aleasă"}
                {selectedTime ? ` · ${selectedTime}` : ""}
              </p>
            </div>
          </div>

          <SlotDateTimePicker
            disabled={pending}
            onDayChange={(day) => {
              setSelectedDay(day);
              setSelectedTime("");
            }}
            onTimeChange={setSelectedTime}
            referenceNow={referenceNow}
            selectedDay={selectedDay}
            selectedTime={selectedTime}
          />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_0.65fr_1fr_auto] xl:items-end">
            <label className="grid gap-1.5 text-xs font-bold text-smart-ink/62">
              Consilier
              <select
                className="min-h-11 rounded-xl border border-smart-abyss/12 bg-white px-3 text-sm outline-none focus:border-smart-teal"
                disabled={pending}
                onChange={(event) => setStaffMemberId(event.target.value)}
                value={staffMemberId}
              >
                {catalog.staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-smart-ink/62">
              Număr de locuri
              <input
                className="min-h-11 rounded-xl border border-smart-abyss/12 bg-white px-3 text-sm font-bold outline-none focus:border-smart-teal"
                disabled={pending}
                inputMode="numeric"
                max={250}
                min={1}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  if (Number.isInteger(nextValue)) {
                    setCapacity(Math.min(250, Math.max(1, nextValue)));
                  }
                }}
                type="number"
                value={capacity}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-smart-ink/62">
              Format / locație
              <select
                className="min-h-11 rounded-xl border border-smart-abyss/12 bg-white px-3 text-sm outline-none focus:border-smart-teal"
                disabled={pending}
                onChange={(event) => setLocationId(event.target.value)}
                value={locationId}
              >
                {catalog.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.kind === "online" ? "Online" : location.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-smart-ink/62">
              Etichetă publică (opțional)
              <input
                className="min-h-11 rounded-xl border border-smart-abyss/12 bg-white px-3 text-sm outline-none focus:border-smart-teal"
                disabled={pending}
                maxLength={120}
                onChange={(event) => setPublicLabel(event.target.value)}
                placeholder="Ex: Evaluare online"
                value={publicLabel}
              />
            </label>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-smart-dark px-4 text-sm font-bold text-smart-white transition hover:bg-smart-teal disabled:cursor-wait disabled:opacity-55"
              disabled={pending || !selectedDay || !selectedTime}
              onClick={createSlot}
              type="button"
            >
              {pending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : (
                <CalendarPlus2 aria-hidden="true" className="size-4" />
              )}
              Adaugă
            </button>
          </div>
        </div>
      ) : null}

      {slots.length === 0 ? (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-smart-teal/25 px-5 py-8 text-center text-sm text-smart-ink/55">
          Nu există sesiuni rezervabile. Adaugă primul interval de mai sus.
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {slots.map((slot) => (
            <article
              className="rounded-[1.3rem] border border-smart-abyss/9 bg-white p-4"
              key={slot.slot_id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-serif text-xl font-semibold capitalize">
                    {dayFormatter.format(new Date(slot.starts_at))}
                  </p>
                  <p className="mt-1 text-sm font-bold text-smart-teal">
                    {timeFormatter.format(new Date(slot.starts_at))}–
                    {timeFormatter.format(new Date(slot.ends_at))}
                  </p>
                  <p className="mt-2 truncate text-xs font-semibold text-smart-ink/52">
                    {slot.location_kind === "online"
                      ? "Online"
                      : slot.location_name}
                    {slot.staff_name ? ` · ${slot.staff_name}` : ""}
                  </p>
                </div>
                <button
                  aria-label={`Șterge sesiunea din ${dateTimeFormatter.format(new Date(slot.starts_at))}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:opacity-45"
                  disabled={pending || slot.booked_count > 0}
                  onClick={() => deleteSlot(slot)}
                  title={
                    slot.booked_count > 0
                      ? "Sesiunile cu persoane înscrise nu pot fi șterse."
                      : "Șterge sesiunea"
                  }
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
              <SlotCapacityEditor
                key={`${slot.slot_id}:${slot.capacity}`}
                onFeedback={onFeedback}
                slot={slot}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function EvaluationAdminDashboard({
  catalog,
  catalogError,
  evaluations,
  evaluationsError,
  referenceNow,
  slots,
  slotsError,
}: EvaluationAdminDashboardProps) {
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState("upcoming");
  const [statusFilter, setStatusFilter] = useState("all");
  const now = Date.parse(referenceNow);
  const todayKey = bucharestDateKey(new Date(referenceNow));

  const filteredEvaluations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ro-RO");

    return evaluations.filter((evaluation) => {
      const startsAt = new Date(evaluation.starts_at).getTime();
      const delivery =
        metadataValue(evaluation.metadata, "deliveryMode") ??
        (evaluation.location_kind === "online" ? "online" : "in_person");
      const searchText = [
        evaluation.contact_name,
        evaluation.contact_email,
        evaluation.contact_phone,
        evaluation.location_name,
        evaluation.staff_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ro-RO");
      const hasNotificationIssue =
        evaluation.notification_status === "failed" ||
        evaluation.notification_status === "pending_configuration";

      return (
        (!normalizedQuery || searchText.includes(normalizedQuery)) &&
        (statusFilter === "all" || evaluation.status === statusFilter) &&
        (deliveryFilter === "all" || delivery === deliveryFilter) &&
        (scheduleFilter === "all" ||
          (scheduleFilter === "upcoming" && startsAt >= now) ||
          (scheduleFilter === "past" && startsAt < now) ||
          (scheduleFilter === "today" &&
            bucharestDateKey(new Date(evaluation.starts_at)) === todayKey)) &&
        (notificationFilter === "all" ||
          (notificationFilter === "issues" && hasNotificationIssue) ||
          (notificationFilter === "sent" &&
            evaluation.notification_status === "sent"))
      );
    });
  }, [
    deliveryFilter,
    evaluations,
    notificationFilter,
    now,
    query,
    scheduleFilter,
    statusFilter,
    todayKey,
  ]);

  const summary = useMemo(
    () => ({
      issues: evaluations.filter(
        (item) =>
          item.notification_status === "failed" ||
          item.notification_status === "pending_configuration",
      ).length,
      pending: evaluations.filter((item) =>
        ["requested", "pending"].includes(item.status),
      ).length,
      today: evaluations.filter(
        (item) => bucharestDateKey(new Date(item.starts_at)) === todayKey,
      ).length,
      upcoming: evaluations.filter(
        (item) =>
          new Date(item.starts_at).getTime() >= now &&
          ["requested", "pending", "confirmed"].includes(item.status),
      ).length,
    }),
    [evaluations, now, todayKey],
  );

  function downloadCsv() {
    const rows = [
      [
        "Nume",
        "Email",
        "Telefon",
        "Data",
        "Status",
        "Format",
        "Locație",
        "Consilier",
        "Obiectiv",
        "Notificare",
        "Note",
      ],
      ...filteredEvaluations.map((evaluation) => [
        evaluation.contact_name,
        evaluation.contact_email,
        evaluation.contact_phone ?? "",
        formatSchedule(evaluation.starts_at, evaluation.ends_at),
        statusLabels[evaluation.status],
        metadataValue(evaluation.metadata, "deliveryMode") === "online"
          ? "Online"
          : "La centru",
        evaluation.location_name ?? "",
        evaluation.staff_name ?? "",
        goalLabels[metadataValue(evaluation.metadata, "evaluationGoal") ?? ""] ??
          "",
        notificationLabels[evaluation.notification_status ?? ""] ?? "",
        evaluation.customer_notes ?? "",
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `evaluari-smartmed-${todayKey}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-8">
      <section
        aria-label="Rezumat programări"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          {
            icon: <CalendarCheck2 aria-hidden="true" className="size-5" />,
            label: "Programări viitoare",
            value: summary.upcoming,
          },
          {
            icon: <Clock3 aria-hidden="true" className="size-5" />,
            label: "Astăzi",
            value: summary.today,
          },
          {
            icon: <Users aria-hidden="true" className="size-5" />,
            label: "Necesită decizie",
            value: summary.pending,
          },
          {
            icon: <Mail aria-hidden="true" className="size-5" />,
            label: "Emailuri cu probleme",
            value: summary.issues,
          },
        ].map((item) => (
          <article
            className="rounded-[1.65rem] border border-smart-abyss/10 bg-white/75 p-5 shadow-[0_16px_45px_rgba(3,17,28,0.05)]"
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
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.13em] text-smart-ink/50">
              {item.label}
            </p>
          </article>
        ))}
      </section>

      <SlotManager
        catalog={catalog}
        catalogError={catalogError}
        onFeedback={setFeedback}
        referenceNow={referenceNow}
        slots={slots}
        slotsError={slotsError}
      />

      <section className="grid gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-smart-teal">
              Agenda evaluărilor
            </p>
            <h2 className="mt-2 font-serif text-4xl font-semibold">
              Solicitări și întâlniri
            </h2>
          </div>
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-smart-abyss/12 bg-white px-4 text-sm font-bold text-smart-ink transition hover:border-smart-teal/35 disabled:opacity-40"
            disabled={filteredEvaluations.length === 0}
            onClick={downloadCsv}
            type="button"
          >
            <Download aria-hidden="true" className="size-4 text-smart-teal" />
            Exportă rezultatele
          </button>
        </div>

        {feedback ? (
          <p
            aria-atomic="true"
            aria-live="polite"
            className={cn(
              "fixed inset-x-4 bottom-4 z-[90] rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_18px_60px_rgba(3,17,28,0.2)] sm:left-auto sm:right-6 sm:w-[26rem]",
              feedback.isError
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800",
            )}
            role="status"
          >
            {feedback.message}
          </p>
        ) : null}

        {evaluationsError ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {evaluationsError}
          </p>
        ) : null}

        <div className="grid gap-3 rounded-[1.65rem] border border-smart-abyss/10 bg-white/70 p-4 md:grid-cols-2 xl:grid-cols-[1.4fr_repeat(4,1fr)]">
          <label className="relative md:col-span-2 xl:col-span-1">
            <span className="sr-only">Caută programări</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-smart-teal"
            />
            <input
              className="min-h-11 w-full rounded-xl border border-smart-abyss/12 bg-white pl-10 pr-3 text-sm outline-none focus:border-smart-teal"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nume, email sau telefon"
              type="search"
              value={query}
            />
          </label>
          <select
            aria-label="Filtrează după perioadă"
            className="min-h-11 rounded-xl border border-smart-abyss/12 bg-white px-3 text-sm outline-none focus:border-smart-teal"
            onChange={(event) => setScheduleFilter(event.target.value)}
            value={scheduleFilter}
          >
            <option value="upcoming">Viitoare</option>
            <option value="today">Astăzi</option>
            <option value="past">Trecute</option>
            <option value="all">Toate perioadele</option>
          </select>
          <select
            aria-label="Filtrează după status"
            className="min-h-11 rounded-xl border border-smart-abyss/12 bg-white px-3 text-sm outline-none focus:border-smart-teal"
            onChange={(event) => setStatusFilter(event.target.value)}
            value={statusFilter}
          >
            <option value="all">Toate statusurile</option>
            {evaluationStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrează după format"
            className="min-h-11 rounded-xl border border-smart-abyss/12 bg-white px-3 text-sm outline-none focus:border-smart-teal"
            onChange={(event) => setDeliveryFilter(event.target.value)}
            value={deliveryFilter}
          >
            <option value="all">Online și fizic</option>
            <option value="online">Online</option>
            <option value="in_person">La centru</option>
          </select>
          <select
            aria-label="Filtrează după notificare"
            className="min-h-11 rounded-xl border border-smart-abyss/12 bg-white px-3 text-sm outline-none focus:border-smart-teal"
            onChange={(event) => setNotificationFilter(event.target.value)}
            value={notificationFilter}
          >
            <option value="all">Toate emailurile</option>
            <option value="issues">Cu probleme</option>
            <option value="sent">Trimise</option>
          </select>
        </div>

        <div className="flex items-center justify-between gap-4 text-sm text-smart-ink/52">
          <span>
            {filteredEvaluations.length}{" "}
            {filteredEvaluations.length === 1 ? "programare" : "programări"}
          </span>
          <span>Ore afișate pentru România</span>
        </div>

        {filteredEvaluations.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-smart-teal/25 bg-white/50 px-6 py-14 text-center">
            <CalendarCheck2
              aria-hidden="true"
              className="mx-auto size-9 text-smart-teal"
            />
            <h3 className="mt-4 font-serif text-3xl font-semibold">
              Nicio programare în această vedere
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-smart-ink/55">
              Schimbă filtrele sau caută după alte date de contact.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[1.75rem] border border-smart-abyss/10 bg-white/78 shadow-[0_14px_42px_rgba(3,17,28,0.045)]">
            <table className="w-full min-w-[72rem] border-collapse text-left text-sm">
              <thead className="bg-smart-dark text-smart-white">
                <tr>
                  <th className="px-5 py-4 text-xs uppercase tracking-[0.12em]">
                    Data
                  </th>
                  <th className="px-5 py-4 text-xs uppercase tracking-[0.12em]">
                    Student
                  </th>
                  <th className="px-5 py-4 text-xs uppercase tracking-[0.12em]">
                    Evaluare
                  </th>
                  <th className="px-5 py-4 text-xs uppercase tracking-[0.12em]">
                    Status
                  </th>
                  <th className="px-5 py-4 text-xs uppercase tracking-[0.12em]">
                    Notificare
                  </th>
                  <th className="px-5 py-4 text-right text-xs uppercase tracking-[0.12em]">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEvaluations.map((evaluation) => {
                  const delivery =
                    metadataValue(evaluation.metadata, "deliveryMode") ??
                    (evaluation.location_kind === "online"
                      ? "online"
                      : "in_person");
                  const goal = metadataValue(
                    evaluation.metadata,
                    "evaluationGoal",
                  );

                  return (
                    <tr
                      className="border-t border-smart-abyss/8 align-top transition hover:bg-smart-aqua/5"
                      key={`${evaluation.public_id}:${evaluation.booking_version}`}
                    >
                      <td className="whitespace-nowrap px-5 py-5">
                        <p className="font-bold text-smart-ink">
                          {dateTimeFormatter.format(
                            new Date(evaluation.starts_at),
                          )}
                        </p>
                        <p className="mt-1 text-xs text-smart-ink/48">
                          până la {timeFormatter.format(new Date(evaluation.ends_at))}
                        </p>
                      </td>
                      <td className="px-5 py-5">
                        <p className="inline-flex items-center gap-2 font-bold text-smart-ink">
                          <UserRound
                            aria-hidden="true"
                            className="size-4 text-smart-teal"
                          />
                          {evaluation.contact_name}
                        </p>
                        <div className="mt-2 grid gap-1 text-xs text-smart-ink/55">
                          <a
                            className="inline-flex items-center gap-1.5 hover:text-smart-teal"
                            href={`mailto:${evaluation.contact_email}`}
                          >
                            <Mail aria-hidden="true" className="size-3.5" />
                            {evaluation.contact_email}
                          </a>
                          {evaluation.contact_phone ? (
                            <a
                              className="inline-flex items-center gap-1.5 hover:text-smart-teal"
                              href={`tel:${evaluation.contact_phone}`}
                            >
                              <Phone aria-hidden="true" className="size-3.5" />
                              {evaluation.contact_phone}
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td className="max-w-xs px-5 py-5">
                        <p className="inline-flex items-center gap-2 font-semibold">
                          {delivery === "online" ? (
                            <Monitor
                              aria-hidden="true"
                              className="size-4 text-smart-teal"
                            />
                          ) : (
                            <MapPin
                              aria-hidden="true"
                              className="size-4 text-smart-teal"
                            />
                          )}
                          {delivery === "online"
                            ? "Online"
                            : evaluation.location_name ?? "La centru"}
                        </p>
                        <p className="mt-1 text-xs text-smart-ink/52">
                          {evaluation.staff_name ?? "Consilier nealocat"}
                          {goal
                            ? ` · ${goalLabels[goal] ?? goal}`
                            : ""}
                        </p>
                        {evaluation.customer_notes ? (
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-smart-ink/58">
                            „{evaluation.customer_notes}”
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-5">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 text-[0.66rem] font-extrabold uppercase tracking-[0.1em]",
                            statusClass(evaluation.status),
                          )}
                        >
                          {statusLabels[evaluation.status]}
                        </span>
                        {evaluation.reschedule_count > 0 ? (
                          <p className="mt-2 text-xs text-smart-ink/48">
                            {evaluation.reschedule_count}{" "}
                            {evaluation.reschedule_count === 1
                              ? "reprogramare"
                              : "reprogramări"}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-5">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 text-[0.66rem] font-extrabold uppercase tracking-[0.1em]",
                            notificationClass(evaluation.notification_status),
                          )}
                        >
                          {notificationLabels[
                            evaluation.notification_status ?? ""
                          ] ?? "Fără email"}
                        </span>
                        {evaluation.notification_attempts ? (
                          <p className="mt-2 text-xs text-smart-ink/48">
                            {evaluation.notification_attempts}{" "}
                            {evaluation.notification_attempts === 1
                              ? "încercare"
                              : "încercări"}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-5 text-right">
                        <EvaluationRowActions
                          evaluation={evaluation}
                          onFeedback={setFeedback}
                          slots={slots}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
