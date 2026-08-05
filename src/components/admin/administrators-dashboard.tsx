"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Crown,
  KeyRound,
  MailPlus,
  Search,
  ShieldCheck,
  ShieldX,
  UserRoundPlus,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  cancelAdministratorInvitationAction,
  inviteAdministratorAction,
  revokeAdministratorAction,
} from "@/app/admin/administratori/actions";
import type {
  AdministratorInvitationRecord,
  AdministratorRecord,
} from "@/lib/admin/administrators-types";
import { cn } from "@/lib/utils";

type Props = {
  administrators: AdministratorRecord[];
  error: string | null;
  invitations: AdministratorInvitationRecord[];
};

type ListFilter = "all" | "active" | "pending";

type Feedback = {
  kind: "error" | "success";
  text: string;
};

const dateFormatter = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  timeZone: "Europe/Bucharest",
  year: "numeric",
});

const fieldClass =
  "min-h-12 w-full rounded-2xl border border-smart-abyss/12 bg-white/88 px-4 py-3 text-sm font-semibold text-smart-ink outline-none transition placeholder:text-smart-ink/32 hover:border-smart-teal/30 focus:border-smart-teal focus:ring-4 focus:ring-smart-aqua/12 disabled:cursor-not-allowed disabled:opacity-60";

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function FeedbackMessage({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return null;

  return (
    <p
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm font-semibold",
        feedback.kind === "success"
          ? "border-emerald-600/18 bg-emerald-50 text-emerald-800"
          : "border-red-600/15 bg-red-50 text-red-800",
      )}
      role={feedback.kind === "error" ? "alert" : "status"}
    >
      {feedback.text}
    </p>
  );
}

function MetricCard({
  icon,
  label,
  tone = "teal",
  value,
}: {
  icon: ReactNode;
  label: string;
  tone?: "amber" | "emerald" | "teal";
  value: number;
}) {
  return (
    <article className="rounded-[1.75rem] border border-smart-abyss/9 bg-white/72 p-5 shadow-[0_16px_45px_rgba(3,17,28,0.045)]">
      <div
        className={cn(
          "flex size-11 items-center justify-center rounded-2xl",
          tone === "emerald" && "bg-emerald-100 text-emerald-700",
          tone === "amber" && "bg-amber-100 text-amber-700",
          tone === "teal" && "bg-smart-aqua/12 text-smart-teal",
        )}
      >
        {icon}
      </div>
      <p className="mt-5 font-serif text-4xl font-semibold leading-none">{value}</p>
      <p className="mt-2 text-sm font-semibold text-smart-ink/52">{label}</p>
    </article>
  );
}

function AdministratorCard({
  administrator,
  onRevoke,
}: {
  administrator: AdministratorRecord;
  onRevoke: (administrator: AdministratorRecord) => void;
}) {
  const mfaEnabled = administrator.mfaStatus === "verified";

  return (
    <article className="rounded-[1.75rem] border border-smart-abyss/9 bg-white/78 p-5 shadow-[0_16px_45px_rgba(3,17,28,0.045)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl",
              administrator.isSuperAdmin
                ? "bg-smart-gold/16 text-[#9b6c13]"
                : "bg-smart-aqua/12 text-smart-teal",
            )}
          >
            {administrator.isSuperAdmin ? (
              <Crown aria-hidden="true" className="size-5" />
            ) : (
              <ShieldCheck aria-hidden="true" className="size-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-extrabold">
                {administrator.fullName || "Administrator SmartMed"}
              </h3>
              {administrator.isSuperAdmin ? (
                <span className="rounded-full border border-smart-gold/30 bg-smart-gold/12 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.1em] text-[#855b0d]">
                  Proprietar
                </span>
              ) : (
                <span className="rounded-full border border-emerald-600/18 bg-emerald-50 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.1em] text-emerald-800">
                  Activ
                </span>
              )}
            </div>
            <p className="mt-1 break-all text-sm font-semibold text-smart-ink/58">
              {administrator.email}
            </p>
          </div>
        </div>

        {administrator.isSuperAdmin ? (
          <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-smart-abyss/8 bg-smart-cream px-3 text-xs font-bold text-smart-ink/48">
            <KeyRound aria-hidden="true" className="size-4" />
            Cont protejat
          </span>
        ) : (
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-600/16 bg-red-50 px-3 text-xs font-bold text-red-800 transition hover:border-red-600/30 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            onClick={() => onRevoke(administrator)}
            type="button"
          >
            <ShieldX aria-hidden="true" className="size-4" />
            Revocă accesul
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-3 border-t border-smart-abyss/8 pt-4 text-xs sm:grid-cols-3">
        <div>
          <p className="font-bold uppercase tracking-[0.08em] text-smart-ink/38">
            Securitate
          </p>
          <p
            className={cn(
              "mt-1.5 inline-flex items-center gap-1.5 font-bold",
              mfaEnabled ? "text-emerald-700" : "text-amber-700",
            )}
          >
            {mfaEnabled ? (
              <CheckCircle2 aria-hidden="true" className="size-4" />
            ) : (
              <AlertTriangle aria-hidden="true" className="size-4" />
            )}
            {mfaEnabled ? "MFA activ" : "MFA de configurat"}
          </p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-[0.08em] text-smart-ink/38">
            Acces acordat
          </p>
          <p className="mt-1.5 font-semibold text-smart-ink/62">
            {formatDate(administrator.grantedAt)}
          </p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-[0.08em] text-smart-ink/38">
            Ultima autentificare
          </p>
          <p className="mt-1.5 font-semibold text-smart-ink/62">
            {formatDate(administrator.lastSignInAt)}
          </p>
        </div>
      </div>
    </article>
  );
}

function InvitationCard({
  invitation,
  onCancel,
  pending,
}: {
  invitation: AdministratorInvitationRecord;
  onCancel: (invitation: AdministratorInvitationRecord) => void;
  pending: boolean;
}) {
  const deliveryFailed = invitation.status === "delivery-failed";

  return (
    <article className="rounded-[1.75rem] border border-amber-700/12 bg-amber-50/62 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Clock3 aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-extrabold">
                {invitation.displayName || "Administrator invitat"}
              </h3>
              <span
                className={cn(
                  "rounded-full border bg-white/58 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.1em]",
                  deliveryFailed
                    ? "border-red-700/18 text-red-800"
                    : "border-amber-700/18 text-amber-800",
                )}
              >
                {deliveryFailed ? "Livrare nereușită" : "Invitație trimisă"}
              </span>
            </div>
            <p className="mt-1 break-all text-sm font-semibold text-smart-ink/58">
              {invitation.email}
            </p>
          </div>
        </div>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-600/14 bg-white/68 px-3 text-xs font-bold text-red-800 transition hover:border-red-600/28 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-wait disabled:opacity-55"
          disabled={pending}
          onClick={() => onCancel(invitation)}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
          Anulează invitația
        </button>
      </div>
      <div className="mt-5 grid gap-3 border-t border-amber-900/8 pt-4 text-xs sm:grid-cols-2">
        <p className="font-semibold text-smart-ink/55">
          Trimisă: <span className="text-smart-ink/75">{formatDate(invitation.sentAt ?? invitation.createdAt)}</span>
        </p>
        <p className="font-semibold text-smart-ink/55 sm:text-right">
          Expiră: <span className="text-smart-ink/75">{formatDate(invitation.expiresAt)}</span>
        </p>
      </div>
    </article>
  );
}

function RevokeDialog({
  administrator,
  onDismiss,
  onRevoked,
}: {
  administrator: AdministratorRecord | null;
  onDismiss: () => void;
  onRevoked: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (administrator && !dialog.open) dialog.showModal();
    if (!administrator && dialog.open) dialog.close();
  }, [administrator]);

  const emailMatches =
    administrator !== null &&
    confirmationEmail.trim().toLowerCase() === administrator.email.toLowerCase();
  const canSubmit = emailMatches && reason.trim().length >= 10 && !pending;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!administrator || !canSubmit) return;

    setFeedback(null);
    startTransition(async () => {
      const result = await revokeAdministratorAction({
        confirmationEmail: confirmationEmail.trim(),
        reason: reason.trim(),
        targetUserId: administrator.id,
      });

      if (!result.ok) {
        setFeedback({ kind: "error", text: result.message });
        return;
      }

      onRevoked();
      onDismiss();
    });
  }

  return (
    <dialog
      aria-labelledby="revoke-admin-title"
      className="fixed inset-0 m-auto w-[min(36rem,calc(100vw-2rem))] rounded-[2rem] border-0 bg-[#f8f4ec] p-0 text-smart-ink shadow-[0_32px_100px_rgba(3,17,28,0.32)] backdrop:bg-smart-abyss/62 backdrop:backdrop-blur-sm"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onDismiss();
      }}
      onClose={onDismiss}
      ref={dialogRef}
    >
      {administrator ? (
        <form className="p-6 sm:p-8" onSubmit={submit}>
          <div className="flex items-start justify-between gap-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
              <ShieldX aria-hidden="true" className="size-5" />
            </div>
            <button
              aria-label="Închide dialogul"
              className="flex size-10 items-center justify-center rounded-xl border border-smart-abyss/10 bg-white/70 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal disabled:opacity-50"
              disabled={pending}
              onClick={onDismiss}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-red-700">
            Acțiune sensibilă
          </p>
          <h2 className="mt-2 font-serif text-4xl font-semibold" id="revoke-admin-title">
            Revocă accesul administrativ
          </h2>
          <p className="mt-4 text-sm leading-7 text-smart-ink/62">
            <strong className="text-smart-ink">{administrator.fullName}</strong> nu va mai putea
            deschide consola de administrare. Contul SmartMed rămâne activ ca utilizator obișnuit.
          </p>

          <div className="mt-6 grid gap-5">
            <label className="grid gap-2 text-sm font-bold">
              Scrie emailul pentru confirmare
              <span className="font-normal text-smart-ink/48">{administrator.email}</span>
              <input
                autoComplete="off"
                autoFocus
                className={fieldClass}
                disabled={pending}
                onChange={(event) => setConfirmationEmail(event.target.value)}
                placeholder={administrator.email}
                spellCheck={false}
                type="email"
                value={confirmationEmail}
              />
            </label>

            <label className="grid gap-2 text-sm font-bold">
              Motivul revocării
              <textarea
                className={cn(fieldClass, "min-h-28 resize-y")}
                disabled={pending}
                maxLength={500}
                minLength={10}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ex: Colaborarea s-a încheiat, iar accesul nu mai este necesar."
                required
                value={reason}
              />
              <span className="text-right text-xs font-medium text-smart-ink/38">
                {reason.trim().length}/500 · minimum 10 caractere
              </span>
            </label>
          </div>

          <div className="mt-5" aria-live="polite">
            <FeedbackMessage feedback={feedback} />
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              className="min-h-12 rounded-2xl border border-smart-abyss/12 bg-white/72 px-5 text-sm font-bold transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal disabled:opacity-50"
              disabled={pending}
              onClick={onDismiss}
              type="button"
            >
              Păstrează accesul
            </button>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-red-700 px-5 text-sm font-bold text-white shadow-lg transition hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!canSubmit}
              type="submit"
            >
              <ShieldX aria-hidden="true" className="size-4" />
              {pending ? "Se revocă…" : "Revocă accesul"}
            </button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}

function CancelInvitationDialog({
  invitation,
  onCancelled,
  onDismiss,
}: {
  invitation: AdministratorInvitationRecord | null;
  onCancelled: () => void;
  onDismiss: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (invitation && !dialog.open) dialog.showModal();
    if (!invitation && dialog.open) dialog.close();
  }, [invitation]);

  const canSubmit = reason.trim().length >= 10 && !pending;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitation || !canSubmit) return;

    setFeedback(null);
    startTransition(async () => {
      const result = await cancelAdministratorInvitationAction({
        invitationId: invitation.id,
        reason: reason.trim(),
      });

      if (!result.ok) {
        setFeedback({ kind: "error", text: result.message });
        return;
      }

      onCancelled();
      onDismiss();
    });
  }

  return (
    <dialog
      aria-labelledby="cancel-admin-invitation-title"
      className="fixed inset-0 m-auto w-[min(34rem,calc(100vw-2rem))] rounded-[2rem] border-0 bg-[#f8f4ec] p-0 text-smart-ink shadow-[0_32px_100px_rgba(3,17,28,0.32)] backdrop:bg-smart-abyss/62 backdrop:backdrop-blur-sm"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onDismiss();
      }}
      onClose={onDismiss}
      ref={dialogRef}
    >
      {invitation ? (
        <form className="p-6 sm:p-8" onSubmit={submit}>
          <div className="flex items-start justify-between gap-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <MailPlus aria-hidden="true" className="size-5" />
            </div>
            <button
              aria-label="Închide dialogul"
              className="flex size-10 items-center justify-center rounded-xl border border-smart-abyss/10 bg-white/70 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal disabled:opacity-50"
              disabled={pending}
              onClick={onDismiss}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-amber-700">
            Invitație în așteptare
          </p>
          <h2
            className="mt-2 font-serif text-4xl font-semibold"
            id="cancel-admin-invitation-title"
          >
            Anulează invitația
          </h2>
          <p className="mt-4 text-sm leading-7 text-smart-ink/62">
            Linkul trimis către <strong className="text-smart-ink">{invitation.email}</strong> nu
            va mai putea fi folosit. Persoana nu va primi acces administrativ.
          </p>

          <label className="mt-6 grid gap-2 text-sm font-bold">
            Motivul anulării
            <textarea
              autoFocus
              className={cn(fieldClass, "min-h-28 resize-y")}
              disabled={pending}
              maxLength={500}
              minLength={10}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex: Invitația a fost trimisă către o adresă greșită."
              required
              value={reason}
            />
            <span className="text-right text-xs font-medium text-smart-ink/38">
              {reason.trim().length}/500 · minimum 10 caractere
            </span>
          </label>

          <div className="mt-5" aria-live="polite">
            <FeedbackMessage feedback={feedback} />
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              className="min-h-12 rounded-2xl border border-smart-abyss/12 bg-white/72 px-5 text-sm font-bold transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal disabled:opacity-50"
              disabled={pending}
              onClick={onDismiss}
              type="button"
            >
              Păstrează invitația
            </button>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-700 px-5 text-sm font-bold text-white shadow-lg transition hover:bg-amber-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!canSubmit}
              type="submit"
            >
              <X aria-hidden="true" className="size-4" />
              {pending ? "Se anulează…" : "Anulează invitația"}
            </button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}

export function AdministratorsDashboard({
  administrators,
  error,
  invitations,
}: Props) {
  const router = useRouter();
  const inviteFormRef = useRef<HTMLFormElement>(null);
  const [filter, setFilter] = useState<ListFilter>("all");
  const [query, setQuery] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState<Feedback | null>(null);
  const [listFeedback, setListFeedback] = useState<Feedback | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<AdministratorRecord | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AdministratorInvitationRecord | null>(null);
  const [pending, startTransition] = useTransition();

  const requiresMfa = administrators.filter(
    (item) => item.mfaStatus !== "verified",
  ).length;
  const normalizedQuery = normalizeSearch(query.trim());

  const visibleAdministrators = useMemo(() => {
    if (filter === "pending") return [];

    return administrators.filter((item) =>
      normalizeSearch(`${item.fullName} ${item.email}`).includes(normalizedQuery),
    );
  }, [administrators, filter, normalizedQuery]);

  const visibleInvitations = useMemo(() => {
    if (filter === "active") return [];

    return invitations.filter((item) =>
      normalizeSearch(`${item.displayName ?? ""} ${item.email}`).includes(normalizedQuery),
    );
  }, [filter, invitations, normalizedQuery]);

  const resultCount = visibleAdministrators.length + visibleInvitations.length;

  function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setInviteFeedback(null);

    startTransition(async () => {
      const result = await inviteAdministratorAction({
        email: String(form.get("email") ?? ""),
        displayName: String(form.get("fullName") ?? ""),
        reason: String(form.get("reason") ?? ""),
      });

      if (!result.ok) {
        setInviteFeedback({ kind: "error", text: result.message });
        return;
      }

      inviteFormRef.current?.reset();
      setInviteFeedback({
        kind: "success",
        text:
          result.data.mode === "existing-granted"
            ? "Contul exista deja, iar accesul administrativ a fost activat."
            : result.data.mode === "already-admin"
              ? "Acest cont are deja acces administrativ."
              : "Invitația a fost trimisă și apare acum în lista de mai jos.",
      });
      router.refresh();
    });
  }

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-smart-teal">
              Acces și securitate
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-smart-gold/28 bg-smart-gold/12 px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.1em] text-[#855b0d]">
              <Crown aria-hidden="true" className="size-3.5" />
              Doar super administrator
            </span>
          </div>
          <h1 className="mt-3 font-serif text-5xl font-semibold leading-none sm:text-6xl">
            Administratori
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-smart-ink/65 sm:text-base">
            Oferă acces numai colegilor care au nevoie de el. Fiecare modificare este
            protejată, verificată și păstrată în istoricul de securitate.
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-smart-teal/18 bg-white/64 px-4 text-sm font-bold text-smart-teal shadow-sm transition hover:-translate-y-0.5 hover:border-smart-teal/32 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal"
          href="/admin/mfa?next=%2Fadmin%2Fadministratori&force=1"
        >
          <KeyRound aria-hidden="true" className="size-4" />
          Reconfirmă MFA
        </Link>
      </header>

      <section aria-label="Rezumat administratori" className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={<UsersRound aria-hidden="true" className="size-5" />}
          label="Administratori activi"
          tone="emerald"
          value={administrators.length}
        />
        <MetricCard
          icon={<MailPlus aria-hidden="true" className="size-5" />}
          label="Invitații în așteptare"
          tone="amber"
          value={invitations.length}
        />
        <MetricCard
          icon={<KeyRound aria-hidden="true" className="size-5" />}
          label="MFA de configurat"
          value={requiresMfa}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <form
          className="rounded-[2rem] border border-smart-abyss/9 bg-white/76 p-6 shadow-[0_20px_60px_rgba(3,17,28,0.055)] sm:p-7"
          onSubmit={invite}
          ref={inviteFormRef}
        >
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-smart-aqua/14 text-smart-teal">
              <UserRoundPlus aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h2 className="font-serif text-3xl font-semibold">Invită un administrator</h2>
              <p className="mt-1 text-sm leading-6 text-smart-ink/55">
                Rolul este fix. Accesul devine activ numai după acceptarea invitației.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Email
              <input
                autoComplete="email"
                className={fieldClass}
                disabled={pending}
                name="email"
                placeholder="coleg@smartmed.ro"
                required
                type="email"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Nume <span className="font-normal text-smart-ink/42">(opțional)</span>
              <input
                autoComplete="name"
                className={fieldClass}
                disabled={pending}
                maxLength={100}
                name="fullName"
                placeholder="Numele colegului"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[0.34fr_0.66fr]">
            <label className="grid gap-2 text-sm font-bold">
              Rol
              <span className="flex min-h-12 items-center gap-2 rounded-2xl border border-smart-abyss/8 bg-smart-cream px-4 text-sm font-bold text-smart-ink/62">
                <ShieldCheck aria-hidden="true" className="size-4 text-smart-teal" />
                Administrator
              </span>
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Motivul acordării accesului
              <input
                className={fieldClass}
                disabled={pending}
                maxLength={300}
                minLength={10}
                name="reason"
                placeholder="Ex: Gestionarea înscrierilor și a evenimentelor"
                required
              />
            </label>
          </div>

          <div className="mt-5" aria-live="polite">
            <FeedbackMessage feedback={inviteFeedback} />
          </div>

          <div className="mt-6 flex justify-end">
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-smart-dark px-5 text-sm font-bold text-smart-white shadow-lg transition hover:-translate-y-0.5 hover:bg-smart-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal disabled:cursor-wait disabled:opacity-55"
              disabled={pending}
              type="submit"
            >
              <MailPlus aria-hidden="true" className="size-4" />
              {pending ? "Se trimite…" : "Trimite invitația"}
            </button>
          </div>
        </form>

        <aside className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(140deg,#167985_0%,#2f9ba4_55%,#73c3c8_100%)] p-6 text-white shadow-[0_20px_60px_rgba(17,111,122,0.16)] sm:p-7">
          <div aria-hidden="true" className="absolute -right-16 -top-16 size-52 rounded-full border border-white/14" />
          <div aria-hidden="true" className="absolute -bottom-24 -left-14 size-60 rounded-full bg-smart-dark/10" />
          <ShieldCheck aria-hidden="true" className="relative size-9" />
          <p className="relative mt-8 text-xs font-extrabold uppercase tracking-[0.18em] text-white/70">
            Principiul accesului minim
          </p>
          <h2 className="relative mt-3 font-serif text-3xl font-semibold leading-tight">
            Fiecare persoană, doar cu accesul de care are nevoie.
          </h2>
          <ul className="relative mt-6 grid gap-3 text-sm leading-6 text-white/82">
            <li className="flex gap-3">
              <CheckCircle2 aria-hidden="true" className="mt-1 size-4 shrink-0" />
              Invitația este legată de un singur email.
            </li>
            <li className="flex gap-3">
              <CheckCircle2 aria-hidden="true" className="mt-1 size-4 shrink-0" />
              MFA protejează operațiunile administrative.
            </li>
            <li className="flex gap-3">
              <CheckCircle2 aria-hidden="true" className="mt-1 size-4 shrink-0" />
              Super administratorul nu poate fi revocat din interfață.
            </li>
          </ul>
        </aside>
      </section>

      <section className="rounded-[2rem] border border-smart-abyss/9 bg-white/54 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl font-semibold">Accesul echipei</h2>
            <p className="mt-1 text-sm text-smart-ink/52">
              {resultCount} {resultCount === 1 ? "rezultat" : "rezultate"}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">
            <div className="flex rounded-2xl border border-smart-abyss/9 bg-white/74 p-1" role="group" aria-label="Filtrează administratorii">
              {([
                ["all", "Toți"],
                ["active", "Activi"],
                ["pending", "În așteptare"],
              ] as const).map(([value, label]) => (
                <button
                  aria-pressed={filter === value}
                  className={cn(
                    "min-h-10 rounded-xl px-3 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal",
                    filter === value
                      ? "bg-smart-dark text-white shadow-sm"
                      : "text-smart-ink/52 hover:bg-smart-aqua/8 hover:text-smart-teal",
                  )}
                  key={value}
                  onClick={() => setFilter(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="relative min-w-0 flex-1 lg:w-72 lg:flex-none">
              <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-smart-ink/34" />
              <span className="sr-only">Caută după nume sau email</span>
              <input
                className="min-h-12 w-full rounded-2xl border border-smart-abyss/9 bg-white/78 pl-11 pr-4 text-sm font-semibold outline-none transition placeholder:text-smart-ink/32 focus:border-smart-teal focus:ring-4 focus:ring-smart-aqua/10"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Caută nume sau email"
                type="search"
                value={query}
              />
            </label>
          </div>
        </div>

        <div className="mt-5" aria-live="polite">
          <FeedbackMessage feedback={listFeedback} />
          {error ? <FeedbackMessage feedback={{ kind: "error", text: error }} /> : null}
        </div>

        {resultCount > 0 ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {visibleAdministrators.map((administrator) => (
              <AdministratorCard
                administrator={administrator}
                key={administrator.id}
                onRevoke={setRevokeTarget}
              />
            ))}
            {visibleInvitations.map((invitation) => (
              <InvitationCard
                invitation={invitation}
                key={invitation.id}
                onCancel={setCancelTarget}
                pending={pending}
              />
            ))}
          </div>
        ) : (
          <div className="mt-5 flex min-h-56 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-smart-abyss/14 bg-white/44 px-6 text-center">
            <UsersRound aria-hidden="true" className="size-8 text-smart-teal/55" />
            <p className="mt-4 font-serif text-2xl font-semibold">Niciun rezultat aici</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-smart-ink/48">
              Schimbă filtrul sau caută după alt nume ori email.
            </p>
          </div>
        )}
      </section>

      <RevokeDialog
        administrator={revokeTarget}
        key={revokeTarget?.id ?? "closed"}
        onDismiss={() => setRevokeTarget(null)}
        onRevoked={() => {
          setListFeedback({ kind: "success", text: "Accesul administrativ a fost revocat." });
          router.refresh();
        }}
      />
      <CancelInvitationDialog
        invitation={cancelTarget}
        key={cancelTarget?.id ?? "closed-invitation"}
        onCancelled={() => {
          setListFeedback({
            kind: "success",
            text: `Invitația pentru ${cancelTarget?.email ?? "administrator"} a fost anulată.`,
          });
          router.refresh();
        }}
        onDismiss={() => setCancelTarget(null)}
      />
    </div>
  );
}
