"use client";

import {
  BellRing,
  CheckCircle2,
  Clock3,
  Download,
  Mail,
  Phone,
  RotateCcw,
  Save,
  Search,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  retryCenterEnrollmentNotificationsAction,
  updateCenterEnrollmentAction,
} from "@/app/admin/inscrieri/actions";
import type {
  AdminCenterEnrollmentRow,
  CenterEnrollmentAdminStatus,
} from "@/lib/center-enrollments/admin";
import { centerEnrollmentStatuses } from "@/lib/center-enrollments/schema";
import { cn } from "@/lib/utils";

type Props = {
  enrollments: AdminCenterEnrollmentRow[];
  error: string | null;
};

const statusLabels: Record<CenterEnrollmentAdminStatus, string> = {
  archived: "Arhivată",
  contacted: "Contactat(ă)",
  duplicate: "Duplicat",
  enrolled: "Înscris(ă)",
  new: "Nouă",
  not_interested: "Nu este interesat(ă)",
  qualified: "Potrivit(ă)",
};

const labels: Record<string, string> = {
  advanced: "Avansat",
  beginner: "Începător",
  biology_barrons: "Biologie Barron’s",
  biology_corint: "Biologie Corint",
  courses: "Cursuri",
  grade_10: "Clasa a X-a",
  grade_11: "Clasa a XI-a",
  grade_12: "Clasa a XII-a",
  graduate: "Absolvent(ă)",
  in_person: "La centru",
  intermediate: "Intermediar",
  mastery: "Foarte bun",
  online: "Online",
  organic_chemistry: "Chimie organică",
  special_modules: "Module speciale",
  umf_brasov: "UMF Brașov",
  umf_bucharest: "UMF București",
  umf_cluj: "UMF Cluj",
  umf_constanta: "UMF Constanța",
  umf_craiova: "UMF Craiova",
  umf_iasi: "UMF Iași",
  umf_sibiu: "UMF Sibiu",
  umf_targu_mures: "UMF Târgu Mureș",
  umf_timisoara: "UMF Timișoara",
};

const dateTimeFormatter = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "long",
  timeZone: "Europe/Bucharest",
  year: "numeric",
});

function label(value: string | null) {
  if (!value) return "—";
  return labels[value] ?? value;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function csvCell(value: unknown) {
  const text = String(value ?? "")
    .replace(/[\r\n\t]+/gu, " ")
    .replaceAll("\0", "");
  const neutralized = /^\s*[=+\-@]/u.test(text) ? `'${text}` : text;
  return `"${neutralized.replaceAll('"', '""')}"`;
}

function statusClass(status: CenterEnrollmentAdminStatus) {
  if (status === "enrolled") {
    return "border-emerald-600/20 bg-emerald-50 text-emerald-800";
  }
  if (status === "new" || status === "qualified") {
    return "border-amber-600/20 bg-amber-50 text-amber-800";
  }
  if (status === "not_interested" || status === "duplicate") {
    return "border-red-600/15 bg-red-50 text-red-800";
  }
  return "border-smart-abyss/10 bg-smart-cream text-smart-ink/70";
}

function dateTimeLocalValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function EnrollmentCard({ enrollment }: { enrollment: AdminCenterEnrollmentRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<CenterEnrollmentAdminStatus>(
    enrollment.status as CenterEnrollmentAdminStatus,
  );
  const [notes, setNotes] = useState(enrollment.admin_notes ?? "");
  const [followUp, setFollowUp] = useState(
    dateTimeLocalValue(enrollment.next_follow_up_at),
  );
  const [message, setMessage] = useState("");
  const emailsSent =
    enrollment.confirmation_email_sent_at && enrollment.staff_email_sent_at;

  function save() {
    setMessage("Se salvează…");
    startTransition(async () => {
      const result = await updateCenterEnrollmentAction({
        adminNotes: notes,
        id: enrollment.id,
        nextFollowUpAt: followUp ? new Date(followUp).toISOString() : null,
        status,
      });
      setMessage(result.ok ? "Salvat." : result.message);
      if (result.ok) router.refresh();
    });
  }

  function retryEmail() {
    setMessage("Retrimitem notificările…");
    startTransition(async () => {
      const result = await retryCenterEnrollmentNotificationsAction({
        id: enrollment.id,
        publicId: enrollment.public_id,
      });
      setMessage(
        result.ok
          ? "Retrimiterea a fost procesată."
          : result.message,
      );
      if (result.ok) router.refresh();
    });
  }

  const university =
    enrollment.target_university === "other"
      ? enrollment.target_university_other || "Alt centru"
      : label(enrollment.target_university);

  return (
    <article className="overflow-hidden rounded-[2rem] border border-smart-abyss/10 bg-white/78 shadow-[0_18px_55px_rgba(3,17,28,0.06)]">
      <div className="grid gap-6 border-b border-smart-abyss/8 p-6 xl:grid-cols-[1.05fr_1fr_auto] xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.12em]",
                statusClass(status),
              )}
            >
              {statusLabels[status]}
            </span>
            <span className="text-xs font-semibold text-smart-ink/45">
              #{enrollment.id} · {dateTimeFormatter.format(new Date(enrollment.created_at))}
            </span>
          </div>
          <h3 className="mt-4 font-serif text-3xl font-semibold leading-tight">
            {enrollment.full_name}
          </h3>
          <p className="mt-2 text-sm text-smart-ink/58">
            {label(enrollment.current_grade)} · admitere {enrollment.exam_year} · {university}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {enrollment.subjects.map((subject) => (
              <span
                className="rounded-full border border-smart-teal/15 bg-smart-aqua/8 px-3 py-1 text-xs font-bold text-smart-teal"
                key={subject}
              >
                {label(subject)}
              </span>
            ))}
            <span className="rounded-full border border-smart-gold/20 bg-smart-gold/8 px-3 py-1 text-xs font-bold text-smart-ink/72">
              {label(enrollment.delivery_mode)}
            </span>
            {enrollment.selected_plan ? (
              <span className="rounded-full border border-smart-teal/18 bg-smart-aqua/12 px-3 py-1 text-xs font-extrabold text-smart-teal">
                {enrollment.selected_plan.name}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 text-sm">
          <a
            className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-smart-teal transition hover:bg-smart-aqua/8"
            href={`mailto:${enrollment.email}`}
          >
            <Mail aria-hidden="true" className="size-4" />
            <span className="break-all font-semibold">{enrollment.email}</span>
          </a>
          <a
            className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-smart-teal transition hover:bg-smart-aqua/8"
            href={`tel:${enrollment.phone}`}
          >
            <Phone aria-hidden="true" className="size-4" />
            <span className="font-semibold">{enrollment.phone}</span>
          </a>
          <p className="px-3 text-smart-ink/58">
            {enrollment.locality_county} · {enrollment.high_school} ({enrollment.study_profile})
          </p>
          {enrollment.participant_status === "minor" ? (
            <p className="px-3 text-xs leading-5 text-smart-ink/55">
              Tutore: {enrollment.guardian_name} · {enrollment.guardian_phone} · {enrollment.guardian_email}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 xl:max-w-52 xl:justify-end">
          <span className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold",
            emailsSent
              ? "border-emerald-600/15 bg-emerald-50 text-emerald-800"
              : "border-amber-600/15 bg-amber-50 text-amber-800",
          )}>
            {emailsSent ? <CheckCircle2 className="size-4" /> : <BellRing className="size-4" />}
            {emailsSent ? "Emailuri trimise" : "Email de verificat"}
          </span>
          {enrollment.newsletter_opt_in ? (
            <span className="rounded-full border border-smart-teal/15 bg-smart-aqua/8 px-3 py-2 text-xs font-bold text-smart-teal">
              Newsletter
            </span>
          ) : null}
          {enrollment.account_created_at || enrollment.user_id ? (
            <span className="rounded-full border border-smart-teal/15 bg-smart-aqua/8 px-3 py-2 text-xs font-bold text-smart-teal">
              Are cont
            </span>
          ) : enrollment.account_creation_requested ? (
            <span className="rounded-full border border-smart-gold/20 bg-smart-gold/8 px-3 py-2 text-xs font-bold text-smart-ink/72">
              Cont solicitat
            </span>
          ) : null}
        </div>
      </div>

      <details className="group">
        <summary className="cursor-pointer list-none px-6 py-4 text-sm font-bold text-smart-teal marker:hidden">
          Detalii și gestionare
          <span className="ml-2 text-smart-ink/35 group-open:hidden">+</span>
          <span className="ml-2 hidden text-smart-ink/35 group-open:inline">−</span>
        </summary>
        <div className="grid gap-6 border-t border-smart-abyss/8 bg-smart-cream/45 p-6 xl:grid-cols-[1fr_1.1fr]">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
            <dt className="text-smart-ink/48">Naștere</dt><dd className="font-semibold">{enrollment.birth_date}</dd>
            <dt className="text-smart-ink/48">Pregătire anterioară</dt><dd className="font-semibold">{enrollment.previous_tutoring ? "Da" : "Nu"}</dd>
            <dt className="text-smart-ink/48">Nivel biologie</dt><dd className="font-semibold">{label(enrollment.biology_level)}</dd>
            <dt className="text-smart-ink/48">Nivel chimie</dt><dd className="font-semibold">{label(enrollment.chemistry_level)}</dd>
            <dt className="text-smart-ink/48">Program dorit</dt><dd className="font-semibold">{enrollment.preparation_types.map(label).join(", ")}</dd>
            <dt className="text-smart-ink/48">Abonament ales</dt><dd className="font-semibold">{enrollment.selected_plan?.name ?? "Înregistrare veche"}</dd>
            <dt className="text-smart-ink/48">WhatsApp</dt><dd className="font-semibold">{enrollment.whatsapp_opt_in ? "Da" : "Nu"}</dd>
            <dt className="text-smart-ink/48">Sursă</dt><dd className="font-semibold">{enrollment.source_context}</dd>
          </dl>

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-bold">
              Stadiu
              <select
                className="min-h-11 rounded-xl border border-smart-abyss/12 bg-white px-3"
                onChange={(event) => setStatus(event.target.value as CenterEnrollmentAdminStatus)}
                value={status}
              >
                {centerEnrollmentStatuses.map((option) => (
                  <option key={option} value={option}>{statusLabels[option]}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Următorul follow-up
              <input
                className="min-h-11 rounded-xl border border-smart-abyss/12 bg-white px-3"
                onChange={(event) => setFollowUp(event.target.value)}
                type="datetime-local"
                value={followUp}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Note interne
              <textarea
                className="min-h-28 rounded-xl border border-smart-abyss/12 bg-white p-3 font-normal"
                maxLength={5000}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ce am discutat și care este următorul pas?"
                value={notes}
              />
            </label>
            {enrollment.email_last_error ? (
              <p className="text-xs text-red-700">Email: {enrollment.email_last_error}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-smart-dark px-5 text-sm font-bold text-smart-white disabled:opacity-50"
                disabled={pending}
                onClick={save}
                type="button"
              >
                <Save className="size-4" /> Salvează
              </button>
              {!emailsSent ? (
                <button
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-smart-teal/25 bg-white px-5 text-sm font-bold text-smart-teal disabled:opacity-50"
                  disabled={pending}
                  onClick={retryEmail}
                  type="button"
                >
                  <RotateCcw className="size-4" /> Retrimite emailurile
                </button>
              ) : null}
              {message ? <span className="text-xs font-semibold text-smart-ink/55">{message}</span> : null}
            </div>
          </div>
        </div>
      </details>
    </article>
  );
}

export function CenterEnrollmentsDashboard({ enrollments, error }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [delivery, setDelivery] = useState("all");
  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return enrollments.filter((enrollment) => {
      if (status !== "all" && enrollment.status !== status) return false;
      if (delivery !== "all" && enrollment.delivery_mode !== delivery) return false;
      if (!needle) return true;
      return normalize([
        enrollment.full_name,
        enrollment.email,
        enrollment.phone,
        enrollment.locality_county,
        enrollment.high_school,
        enrollment.selected_plan?.name ?? "",
      ].join(" ")).includes(needle);
    });
  }, [delivery, enrollments, query, status]);

  const metrics = {
    active: enrollments.filter((item) => ["contacted", "qualified"].includes(item.status)).length,
    enrolled: enrollments.filter((item) => item.status === "enrolled").length,
    new: enrollments.filter((item) => item.status === "new").length,
    total: enrollments.length,
  };

  function exportCsv() {
    const rows = [
      ["Data", "Nume", "Email", "Telefon", "Localitate", "Liceu", "Clasă", "Admitere", "Universitate", "Materii", "Format", "Abonament", "Status", "Newsletter", "Cont", "Note"],
      ...filtered.map((item) => [
        item.created_at,
        item.full_name,
        item.email,
        item.phone,
        item.locality_county,
        item.high_school,
        label(item.current_grade),
        item.exam_year,
        item.target_university === "other" ? item.target_university_other : label(item.target_university),
        item.subjects.map(label).join("; "),
        label(item.delivery_mode),
        item.selected_plan?.name ?? "Înregistrare veche",
        statusLabels[item.status as CenterEnrollmentAdminStatus],
        item.newsletter_opt_in ? "Da" : "Nu",
        item.user_id ? "Da" : "Nu",
        item.admin_notes,
      ]),
    ];
    const blob = new Blob(["\uFEFF", rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inscrieri-smartmed-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: UsersRound, label: "Total", value: metrics.total },
          { icon: BellRing, label: "Noi", value: metrics.new },
          { icon: Clock3, label: "În discuție", value: metrics.active },
          { icon: UserRoundCheck, label: "Înscriși", value: metrics.enrolled },
        ].map(({ icon: Icon, label: metricLabel, value }) => (
          <div className="rounded-[1.6rem] border border-smart-abyss/10 bg-white/72 p-5" key={metricLabel}>
            <Icon className="size-5 text-smart-teal" />
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-smart-ink/45">{metricLabel}</p>
            <p className="mt-1 font-serif text-4xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-wrap items-center gap-3 rounded-[1.6rem] border border-smart-abyss/10 bg-white/72 p-4">
        <label className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-smart-ink/38" />
          <span className="sr-only">Caută înscrieri</span>
          <input
            className="min-h-12 w-full rounded-xl border border-smart-abyss/10 bg-white pl-11 pr-4 text-sm"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Caută după nume, email, telefon sau liceu"
            value={query}
          />
        </label>
        <select className="min-h-12 rounded-xl border border-smart-abyss/10 bg-white px-4 text-sm font-semibold" onChange={(event) => setStatus(event.target.value)} value={status}>
          <option value="all">Toate stadiile</option>
          {centerEnrollmentStatuses.map((option) => <option key={option} value={option}>{statusLabels[option]}</option>)}
        </select>
        <select className="min-h-12 rounded-xl border border-smart-abyss/10 bg-white px-4 text-sm font-semibold" onChange={(event) => setDelivery(event.target.value)} value={delivery}>
          <option value="all">Orice format</option>
          <option value="in_person">La centru</option>
          <option value="online">Online</option>
        </select>
        <button className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-smart-dark px-5 text-sm font-bold text-white" onClick={exportCsv} type="button">
          <Download className="size-4" /> Exportă CSV
        </button>
      </section>

      {error ? <p className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-smart-ink/55">{filtered.length} din {enrollments.length} înscrieri</p>
      </div>
      <section className="grid gap-5">
        {filtered.map((enrollment) => <EnrollmentCard enrollment={enrollment} key={enrollment.public_id} />)}
        {filtered.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-smart-abyss/15 bg-white/45 p-12 text-center">
            <UserRoundCheck className="mx-auto size-10 text-smart-teal/55" />
            <h2 className="mt-4 font-serif text-3xl font-semibold">Nicio înscriere aici</h2>
            <p className="mt-2 text-sm text-smart-ink/55">Schimbă filtrele sau revino după ce sosesc primele înscrieri.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
