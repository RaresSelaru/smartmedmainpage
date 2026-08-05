"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import {
  initialAuthActionState,
  type AuthActionState,
  getFirstFieldError,
} from "@/lib/auth/action-state";
import {
  loginAction,
  logoutAction,
  oauthLoginAction,
  requestPasswordResetAction,
  signUpAction,
  updatePasswordAction,
  updateProfileAction,
} from "@/lib/auth/actions";
import type { AuthMode } from "@/lib/auth/access-control";
import type { SmartMedSession } from "@/lib/auth/session";
import { createBrowserSupabaseClient } from "@/lib/auth/supabase-browser";
import {
  OPEN_STUDENT_ONBOARDING_EVENT,
  type FocusSubject,
} from "@/lib/onboarding/schema";
import { cn } from "@/lib/utils";

type AccountHubProps = {
  accessRequired: boolean;
  activeMode: AuthMode;
  errorCode?: string;
  isConfigured: boolean;
  nextPath: string;
  oauthProviders: Record<"facebook" | "google", boolean>;
  session: SmartMedSession | null;
  status?: string;
};

type FieldProps = {
  autoComplete?: string;
  defaultValue?: string | null;
  error?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
};

const modeLabels: Record<AuthMode, string> = {
  conectare: "Conectare",
  "creare-cont": "Creare cont",
  "parola-noua": "Parolă nouă",
  "recuperare-parola": "Am uitat parola",
};

const roleLabels: Record<SmartMedSession["role"], string> = {
  admin: "Admin",
  guest: "Guest",
  premium: "Premium (compatibilitate)",
  user: "Utilizator",
};

function accountModeHref(mode: AuthMode, nextPath: string) {
  const params = new URLSearchParams({ mode });

  if (nextPath !== "/cont") {
    params.set("next", nextPath);
  }

  return `/cont?${params.toString()}`;
}

function getStatusMessage(status?: string, errorCode?: string) {
  if (errorCode === "auth-not-configured") {
    return {
      tone: "error" as const,
      text: "Autentificarea SmartMed nu este configurată încă.",
    };
  }

  if (errorCode === "callback-invalid") {
    return {
      tone: "error" as const,
      text: "Linkul de autentificare este invalid sau a expirat.",
    };
  }

  if (errorCode === "oauth-cancelled") {
    return {
      tone: "error" as const,
      text: "Conectarea socială a fost anulată. Contul tău nu a fost modificat.",
    };
  }

  if (errorCode === "oauth-failed") {
    return {
      tone: "error" as const,
      text: "Conectarea socială nu a putut fi finalizată. Încearcă din nou.",
    };
  }

  if (errorCode === "email-not-confirmed") {
    return {
      tone: "error" as const,
      text: "Confirmă adresa de email înainte să accesezi această secțiune.",
    };
  }

  if (errorCode === "access-forbidden") {
    return {
      tone: "error" as const,
      text: "Contul tău nu are drepturile necesare pentru această secțiune.",
    };
  }

  if (status === "email-confirmed") {
    return {
      tone: "success" as const,
      text: "Emailul a fost confirmat. Contul tău SmartMed este activ.",
    };
  }

  if (status === "social-connected") {
    return {
      tone: "success" as const,
      text: "Te-ai conectat cu succes. Bine ai venit în SmartMed!",
    };
  }

  if (status === "enrollment-link-pending") {
    return {
      tone: "success" as const,
      text: "Conectează-te cu adresa folosită la înscriere. După autentificare, asociem automat formularul și precompletăm profilul tău de studiu.",
    };
  }

  if (status === "enrollment-linked") {
    return {
      tone: "success" as const,
      text: "Înscrierea la centru a fost asociată contului, iar răspunsurile utile au fost preluate automat în profil.",
    };
  }

  if (status === "recovery-ready") {
    return {
      tone: "success" as const,
      text: "Poți alege acum o parolă nouă.",
    };
  }

  if (status === "password-updated") {
    return {
      tone: "success" as const,
      text: "Parola a fost actualizată.",
    };
  }

  if (status === "logged-out") {
    return {
      tone: "success" as const,
      text: "Ai ieșit din cont.",
    };
  }

  return null;
}

function Field({
  autoComplete,
  defaultValue,
  error,
  label,
  name,
  placeholder,
  required,
  type = "text",
}: FieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-smart-teal">
        {label}
      </span>
      <input
        aria-invalid={error ? "true" : undefined}
        autoComplete={autoComplete}
        className={cn(
          "mt-2 h-13 w-full rounded-2xl border bg-white/76 px-4 text-sm font-semibold text-smart-ink outline-none transition placeholder:text-smart-ink/34 focus:border-smart-teal focus:bg-white focus:shadow-[0_0_0_4px_rgba(31,111,120,0.10)]",
          error ? "border-red-300" : "border-smart-abyss/10",
        )}
        defaultValue={defaultValue ?? undefined}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
      {error ? <span className="mt-2 block text-xs font-semibold text-red-700">{error}</span> : null}
    </label>
  );
}

function ActionMessage({ state }: { state: AuthActionState }) {
  if (!state.message || state.status === "idle") {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-3 text-sm font-semibold leading-6",
        state.status === "success"
          ? "bg-smart-teal/10 text-smart-teal"
          : "bg-red-50 text-red-800",
      )}
      role="status"
    >
      {state.message}
    </div>
  );
}

function SubmitButton({ children, pending }: { children: string; pending: boolean }) {
  return (
    <button
      className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-smart-teal to-smart-aqua px-6 py-3 text-sm font-extrabold text-white shadow-[0_18px_44px_rgba(46,127,136,0.28)] transition duration-300 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal disabled:cursor-not-allowed disabled:opacity-62"
      disabled={pending}
      type="submit"
    >
      {pending ? "Se procesează..." : children}
    </button>
  );
}

function ShellCard({ children, eyebrow, title }: { children: React.ReactNode; eyebrow: string; title: string }) {
  return (
    <div className="overflow-hidden rounded-[34px] border border-smart-abyss/10 bg-white/66 p-6 shadow-[0_28px_78px_rgba(3,17,28,0.12)] backdrop-blur-xl sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-smart-teal">{eyebrow}</p>
      <h2 className="mt-3 font-serif text-4xl font-semibold leading-none text-smart-ink sm:text-5xl">
        {title}
      </h2>
      <div className="mt-7">{children}</div>
    </div>
  );
}

function SocialProviderMark({ provider }: { provider: "facebook" | "google" }) {
  if (provider === "facebook") {
    return (
      <svg
        aria-hidden="true"
        className="size-7 shrink-0"
        focusable="false"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" fill="#1877F2" r="12" />
        <path
          d="M13.7 20v-7h2.35l.35-2.73h-2.7V8.53c0-.79.22-1.33 1.35-1.33h1.44V4.76a19.3 19.3 0 0 0-2.1-.11c-2.08 0-3.5 1.27-3.5 3.6v2.02H8.54V13h2.35v7h2.81Z"
          fill="#fff"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="size-7 shrink-0 rounded-full bg-white p-1 shadow-[0_1px_5px_rgba(3,17,28,0.16)]"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path
        d="M21.35 12.2c0-.68-.06-1.34-.18-1.97H12v3.73h5.24a4.48 4.48 0 0 1-1.94 2.94v2.42h3.14c1.84-1.69 2.91-4.18 2.91-7.12Z"
        fill="#4285F4"
      />
      <path
        d="M12 21.7c2.62 0 4.82-.87 6.44-2.38L15.3 16.9c-.87.58-1.98.93-3.3.93-2.53 0-4.67-1.71-5.44-4.01H3.31v2.5A9.72 9.72 0 0 0 12 21.7Z"
        fill="#34A853"
      />
      <path
        d="M6.56 13.82A5.84 5.84 0 0 1 6.25 12c0-.63.11-1.24.31-1.82v-2.5H3.31A9.72 9.72 0 0 0 2.3 12c0 1.57.38 3.05 1.01 4.32l3.25-2.5Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.17c1.43 0 2.71.49 3.72 1.45l2.79-2.79A9.36 9.36 0 0 0 12 2.3a9.72 9.72 0 0 0-8.69 5.38l3.25 2.5c.77-2.3 2.91-4.01 5.44-4.01Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function SocialAuthButtons({
  availability,
  nextPath,
}: {
  availability: Record<"facebook" | "google", boolean>;
  nextPath: string;
}) {
  const [state, formAction, pending] = useActionState(
    oauthLoginAction,
    initialAuthActionState,
  );
  const providers = [
    { id: "google" as const, label: "Continuă cu Google", name: "Google" },
    {
      id: "facebook" as const,
      label: "Continuă cu Facebook",
      name: "Facebook",
    },
  ];

  return (
    <div className="mb-6 grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {providers.map((provider) => {
          const enabled = availability[provider.id];

          return (
            <form action={formAction} key={provider.id}>
              <input name="next" type="hidden" value={nextPath} />
              <input name="provider" type="hidden" value={provider.id} />
              <button
                aria-label={
                  enabled
                    ? provider.label
                    : `${provider.name} — disponibil în curând`
                }
                className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-smart-abyss/12 bg-white/82 px-4 py-3 text-sm font-extrabold text-smart-ink shadow-[0_12px_28px_rgba(3,17,28,0.06)] transition hover:-translate-y-0.5 hover:border-smart-teal/28 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-teal disabled:cursor-not-allowed disabled:border-smart-abyss/10 disabled:bg-smart-cream-deep/72 disabled:text-smart-ink/68 disabled:shadow-none disabled:hover:translate-y-0"
                disabled={!enabled || pending}
                type="submit"
              >
                <SocialProviderMark provider={provider.id} />
                <span>
                  {enabled ? provider.label : `${provider.name} · Disponibil în curând`}
                </span>
              </button>
            </form>
          );
        })}
      </div>
      <ActionMessage state={state} />
      {!availability.google && !availability.facebook ? (
        <p className="text-center text-xs font-semibold leading-5 text-smart-ink/62">
          Conectarea prin Google și Facebook va fi disponibilă în curând.
        </p>
      ) : null}
      <div className="flex items-center gap-4 py-1" aria-hidden="true">
        <span className="h-px flex-1 bg-smart-abyss/10" />
        <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-smart-ink/38">
          sau continuă cu email
        </span>
        <span className="h-px flex-1 bg-smart-abyss/10" />
      </div>
    </div>
  );
}

function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialAuthActionState);

  return (
    <form action={formAction} className="grid gap-5">
      <input name="next" type="hidden" value={nextPath} />
      <Field
        autoComplete="email"
        error={getFirstFieldError(state, "email")}
        label="Email"
        name="email"
        placeholder="email@exemplu.ro"
        required
        type="email"
      />
      <Field
        autoComplete="current-password"
        error={getFirstFieldError(state, "password")}
        label="Parolă"
        name="password"
        placeholder="Parola ta"
        required
        type="password"
      />
      <ActionMessage state={state} />
      <SubmitButton pending={pending}>Intră în cont</SubmitButton>
      <Link
        className="text-center text-sm font-bold text-smart-teal transition hover:text-smart-ink"
        href={accountModeHref("recuperare-parola", nextPath)}
      >
        Am uitat parola
      </Link>
    </form>
  );
}

function SignUpForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, initialAuthActionState);

  return (
    <form action={formAction} className="grid gap-5">
      <input name="next" type="hidden" value={nextPath} />
      <Field
        autoComplete="name"
        error={getFirstFieldError(state, "fullName")}
        label="Nume complet"
        name="fullName"
        placeholder="Numele tău"
        required
      />
      <Field
        autoComplete="email"
        error={getFirstFieldError(state, "email")}
        label="Email"
        name="email"
        placeholder="email@exemplu.ro"
        required
        type="email"
      />
      <Field
        autoComplete="new-password"
        error={getFirstFieldError(state, "password")}
        label="Parolă"
        name="password"
        placeholder="Minim 8 caractere"
        required
        type="password"
      />
      <Field
        autoComplete="new-password"
        error={getFirstFieldError(state, "confirmPassword")}
        label="Confirmă parola"
        name="confirmPassword"
        placeholder="Repetă parola"
        required
        type="password"
      />
      <ActionMessage state={state} />
      <SubmitButton pending={pending}>Creează cont</SubmitButton>
      <p className="text-center text-xs font-semibold leading-5 text-smart-ink/56">
        După confirmarea contului, finalizezi profilul de studiu prin șase
        alegeri scurte. Răspunsurile pot fi schimbate oricând.
      </p>
    </form>
  );
}

function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialAuthActionState,
  );

  return (
    <form action={formAction} className="grid gap-5">
      <Field
        autoComplete="email"
        error={getFirstFieldError(state, "email")}
        label="Email"
        name="email"
        placeholder="email@exemplu.ro"
        required
        type="email"
      />
      <ActionMessage state={state} />
      <SubmitButton pending={pending}>Trimite emailul de resetare</SubmitButton>
    </form>
  );
}

function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialAuthActionState);

  return (
    <form action={formAction} className="grid gap-5">
      <Field
        autoComplete="new-password"
        error={getFirstFieldError(state, "password")}
        label="Parolă nouă"
        name="password"
        placeholder="Minim 8 caractere"
        required
        type="password"
      />
      <Field
        autoComplete="new-password"
        error={getFirstFieldError(state, "confirmPassword")}
        label="Confirmă parola"
        name="confirmPassword"
        placeholder="Repetă parola"
        required
        type="password"
      />
      <ActionMessage state={state} />
      <SubmitButton pending={pending}>Salvează parola nouă</SubmitButton>
    </form>
  );
}

function ProfileForm({ session }: { session: SmartMedSession }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialAuthActionState);

  return (
    <form action={formAction} className="grid gap-5">
      <Field
        autoComplete="name"
        defaultValue={session.profile.fullName}
        error={getFirstFieldError(state, "fullName")}
        label="Nume complet"
        name="fullName"
        required
      />
      <Field
        autoComplete="tel"
        defaultValue={session.profile.phone}
        error={getFirstFieldError(state, "phone")}
        label="Telefon"
        name="phone"
        placeholder="Opțional"
        type="tel"
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          autoComplete="address-level2"
          defaultValue={session.profile.city}
          error={getFirstFieldError(state, "city")}
          label="Oraș"
          name="city"
          placeholder="Opțional"
        />
        <Field
          defaultValue={session.profile.examYear}
          error={getFirstFieldError(state, "examYear")}
          label="An admitere"
          name="examYear"
          placeholder="2026"
        />
      </div>
      <Field
        defaultValue={session.profile.school}
        error={getFirstFieldError(state, "school")}
        label="Liceu / facultate"
        name="school"
        placeholder="Opțional"
      />
      <ActionMessage state={state} />
      <SubmitButton pending={pending}>Salvează profilul</SubmitButton>
    </form>
  );
}

function AccountStatusCard({ session }: { session: SmartMedSession }) {
  return (
    <div className="grid gap-4 rounded-[28px] border border-smart-abyss/10 bg-smart-cream/76 p-5">
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-smart-teal text-smart-white shadow-[0_16px_34px_rgba(31,111,120,0.20)]">
          <UserRoundCheck aria-hidden="true" className="size-7" strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-serif text-3xl font-semibold leading-none text-smart-ink">
            {session.fullName}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-smart-ink/58">{session.email}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <span className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-bold text-smart-ink/72">
          Rol: <span className="text-smart-teal">{roleLabels[session.role]}</span>
        </span>
        <span className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-bold text-smart-ink/72">
          Acces:{" "}
          <span className="text-smart-teal">
            {session.hasPremiumAccess ? "Premium" : "Standard"}
          </span>
        </span>
        <span className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-bold text-smart-ink/72">
          Email:{" "}
          <span className={session.emailConfirmed ? "text-smart-teal" : "text-red-700"}>
            {session.emailConfirmed ? "confirmat" : "neconfirmat"}
          </span>
        </span>
      </div>
      {session.role === "admin" ? (
        <Link
          className="group flex min-h-14 items-center justify-between gap-4 rounded-2xl bg-smart-dark px-5 py-4 text-smart-white shadow-[0_18px_38px_rgba(3,17,28,0.16)] transition hover:-translate-y-0.5 hover:bg-smart-teal hover:shadow-[0_22px_46px_rgba(31,111,120,0.24)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
          href="/admin"
        >
          <span className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10">
              <ShieldCheck aria-hidden="true" className="size-5 text-smart-aqua" />
            </span>
            <span>
              <span className="block text-sm font-extrabold">Admin Console</span>
              <span className="mt-0.5 block text-xs font-semibold text-smart-white/62">
                Gestionează conținutul editorial
              </span>
            </span>
          </span>
          <span
            aria-hidden="true"
            className="text-xl transition-transform group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
      ) : null}
    </div>
  );
}

const subjectLabels: Record<FocusSubject, string> = {
  biology: "Biologie",
  chemistry: "Chimie",
  physics: "Fizică",
  undecided: "În explorare",
};

function OnboardingProfileCard({ session }: { session: SmartMedSession }) {
  const completed = session.onboarding.status === "completed";
  const firstName = session.fullName.trim().split(/\s+/)[0] || "viitor medic";
  const summary = [
    session.onboarding.targetExamYear
      ? `Admitere ${session.onboarding.targetExamYear}`
      : null,
    ...session.onboarding.focusSubjects.map((subject) => subjectLabels[subject]),
  ].filter(Boolean);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-smart-teal/18 bg-smart-dark p-5 text-smart-white shadow-[0_20px_52px_rgba(3,17,28,0.18)] sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full border border-smart-aqua/16" />
      <div className="pointer-events-none absolute -bottom-20 right-8 size-44 rounded-full bg-smart-teal/14 blur-3xl" />
      <div className="relative flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-smart-aqua/12 text-smart-aqua ring-1 ring-smart-aqua/22">
          {completed ? (
            <Sparkles aria-hidden="true" className="size-6" />
          ) : (
            <HeartPulse aria-hidden="true" className="size-6" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-smart-gold-light">
            Profilul meu de studiu
          </p>
          <h3 className="mt-2 font-serif text-3xl font-semibold leading-[0.98]">
            {completed
              ? `SmartMed te cunoaște mai bine, ${firstName}`
              : "6 alegeri. Un SmartMed mai aproape de tine."}
          </h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-smart-muted">
            {completed
              ? "Preferințele tale sunt salvate în cont și pot fi actualizate oricând."
              : "Finalizează cele șase alegeri scurte pentru a-ți personaliza experiența SmartMed. Profilul se încheie la prima conectare."}
          </p>
          {summary.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {summary.map((item) => (
                <span
                  className="rounded-full border border-smart-aqua/22 bg-smart-aqua/8 px-3 py-1.5 text-xs font-bold text-smart-aqua"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          <button
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-smart-aqua px-5 py-2.5 text-sm font-extrabold text-smart-abyss transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua"
            data-student-onboarding-trigger="true"
            onClick={() =>
              window.dispatchEvent(new Event(OPEN_STUDENT_ONBOARDING_EVENT))
            }
            type="button"
          >
            {completed ? "Actualizează preferințele" : "Continuă profilul"}
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBanner({
  accessRequired,
  errorCode,
  nextPath,
  status,
}: {
  accessRequired: boolean;
  errorCode?: string;
  nextPath: string;
  status?: string;
}) {
  const statusMessage = getStatusMessage(status, errorCode);

  if (!statusMessage && !accessRequired) {
    return null;
  }

  return (
    <div className="grid gap-3">
      {accessRequired ? (
        <div className="rounded-[26px] border border-smart-gold/35 bg-smart-gold/12 p-5 text-smart-ink shadow-[0_18px_44px_rgba(3,17,28,0.08)]">
          <div className="flex gap-3">
            <ShieldCheck aria-hidden="true" className="mt-1 size-5 shrink-0 text-smart-gold" />
            <div>
              <p className="font-serif text-2xl font-semibold leading-none">Acces restricționat</p>
              <p className="mt-2 text-sm leading-6 text-smart-ink/68">
                Intră în cont sau creează un cont SmartMed pentru a continua către {nextPath}.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      {statusMessage ? (
        <div
          className={cn(
            "rounded-[26px] p-5 text-sm font-semibold leading-6 shadow-[0_18px_44px_rgba(3,17,28,0.08)]",
            statusMessage.tone === "success"
              ? "border border-smart-teal/20 bg-smart-teal/10 text-smart-teal"
              : "border border-red-200 bg-red-50 text-red-800",
          )}
          role="status"
        >
          {statusMessage.text}
        </div>
      ) : null}
    </div>
  );
}

function AuthUnavailable() {
  return (
    <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-900">
      <p className="font-serif text-3xl font-semibold leading-none">Autentificare neconfigurată</p>
      <p className="mt-3 text-sm leading-7">
        Setează `NEXT_PUBLIC_SUPABASE_URL` și `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` pentru a
        activa formularele de cont.
      </p>
    </div>
  );
}

export function AccountHub({
  accessRequired,
  activeMode,
  errorCode,
  isConfigured,
  nextPath,
  oauthProviders,
  session,
  status,
}: AccountHubProps) {
  const router = useRouter();
  const [passwordSessionState, setPasswordSessionState] = useState<
    "checking" | "invalid" | "ready"
  >(session ? "ready" : "checking");

  useEffect(() => {
    window.dispatchEvent(new Event("smartmed-auth-change"));
  }, [session?.fullName, session?.id, status]);

  const showPasswordUpdate = activeMode === "parola-noua";
  const showProfile = session && !showPasswordUpdate;
  const activeAuthMode = activeMode === "parola-noua" ? "conectare" : activeMode;

  useEffect(() => {
    if (!showPasswordUpdate || session) {
      return;
    }

    const supabase = createBrowserSupabaseClient();

    if (!supabase) {
      return;
    }

    let cancelled = false;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (cancelled) {
        return;
      }

      if (error || !data.session) {
        setPasswordSessionState("invalid");
        return;
      }

      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
      setPasswordSessionState("ready");
      router.refresh();
    });

    return () => {
      cancelled = true;
    };
  }, [router, session, showPasswordUpdate]);

  const effectivePasswordSessionState = session
    ? "ready"
    : isConfigured
      ? passwordSessionState
      : "invalid";

  return (
    <section className="relative isolate overflow-hidden bg-smart-cream px-5 pb-28 pt-32 text-smart-ink sm:px-7 sm:pt-36 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(200,168,117,0.16),transparent_30%),radial-gradient(circle_at_84%_12%,rgba(31,111,120,0.16),transparent_34%)]" />
      <div className="absolute right-[-10rem] top-16 h-[30rem] w-[30rem] rounded-full border border-smart-teal/10" />
      <div className="smart-container relative z-10 grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-smart-teal">
            Profil și acces
          </p>
          <h1 className="mt-4 max-w-2xl font-serif text-5xl font-semibold leading-[0.94] tracking-[-0.03em] sm:text-7xl">
            Contul tău SmartMed
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-smart-ink/66 sm:text-lg">
            Autentificare, profil personal și structură pregătită pentru acces diferențiat la
            modulele SmartMed.
          </p>
          <div className="mt-8 grid gap-3">
            <StatusBanner
              accessRequired={accessRequired}
              errorCode={errorCode}
              nextPath={nextPath}
              status={status}
            />
          </div>
        </div>

        <div className="grid gap-6">
          {!isConfigured ? <AuthUnavailable /> : null}

          {showPasswordUpdate ? (
            <ShellCard eyebrow="Recuperare parolă" title="Alege o parolă nouă">
              {effectivePasswordSessionState === "ready" ? (
                <UpdatePasswordForm />
              ) : effectivePasswordSessionState === "checking" ? (
                <p aria-live="polite" className="text-sm font-semibold text-smart-ink/68">
                  Verificăm în siguranță linkul de activare…
                </p>
              ) : (
                <div className="grid gap-4 text-sm leading-7 text-red-800">
                  <p>
                    Linkul de activare sau recuperare este invalid ori a expirat.
                  </p>
                  <Link
                    className="font-bold text-smart-teal"
                    href={accountModeHref("recuperare-parola", nextPath)}
                  >
                    Solicită un link nou
                  </Link>
                </div>
              )}
            </ShellCard>
          ) : null}

          {showProfile ? (
            <>
              <ShellCard eyebrow="Profil activ" title="Datele tale">
                <div className="grid gap-6">
                  <AccountStatusCard session={session} />
                  <Link
                    className="group flex items-center justify-between gap-5 rounded-[1.5rem] border border-smart-teal/18 bg-[linear-gradient(135deg,rgba(31,111,120,0.10),rgba(255,255,255,0.78))] p-5 transition hover:-translate-y-0.5 hover:border-smart-teal/32 hover:shadow-[0_18px_42px_rgba(18,57,62,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
                    href="/evaluare#programare"
                  >
                    <span className="flex items-center gap-4">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-smart-teal text-white shadow-[0_12px_28px_rgba(31,111,120,0.22)]">
                        <CalendarDays aria-hidden="true" className="size-5" />
                      </span>
                      <span>
                        <span className="block text-xs font-bold uppercase tracking-[0.18em] text-smart-teal">
                          Evaluarea mea
                        </span>
                        <span className="mt-1 block font-serif text-xl font-semibold text-smart-ink">
                          Programează sau gestionează evaluarea
                        </span>
                      </span>
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-5 shrink-0 text-smart-teal transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                  <OnboardingProfileCard session={session} />
                  <ProfileForm session={session} />
                  <form action={logoutAction}>
                    <button
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-smart-abyss/12 bg-white/70 px-6 py-3 text-sm font-extrabold text-smart-ink transition hover:border-smart-teal/28 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
                      type="submit"
                    >
                      Ieși din cont
                    </button>
                  </form>
                </div>
              </ShellCard>
            </>
          ) : null}

          {!showProfile && !showPasswordUpdate ? (
            <ShellCard eyebrow="Autentificare" title={modeLabels[activeAuthMode]}>
              <div className="mb-7 grid grid-cols-2 gap-2 rounded-full bg-smart-cream-deep/72 p-1">
                {(["conectare", "creare-cont"] as const).map((mode) => (
                  <Link
                    className={cn(
                      "rounded-full px-4 py-3 text-center text-xs font-extrabold uppercase tracking-[0.12em] transition",
                      activeAuthMode === mode
                        ? "bg-smart-teal text-white shadow-[0_14px_30px_rgba(31,111,120,0.22)]"
                        : "text-smart-ink/58 hover:text-smart-teal",
                    )}
                    href={accountModeHref(mode, nextPath)}
                    key={mode}
                  >
                    {modeLabels[mode]}
                  </Link>
                ))}
              </div>

              {activeAuthMode === "conectare" ||
              activeAuthMode === "creare-cont" ? (
                <SocialAuthButtons
                  availability={oauthProviders}
                  nextPath={nextPath}
                />
              ) : null}

              {!isConfigured ? null : activeAuthMode === "creare-cont" ? (
                <SignUpForm nextPath={nextPath} />
              ) : activeAuthMode === "recuperare-parola" ? (
                <ResetPasswordForm />
              ) : (
                <LoginForm nextPath={nextPath} />
              )}
            </ShellCard>
          ) : null}

          <div className="rounded-[28px] border border-smart-abyss/10 bg-white/44 p-5 text-sm leading-7 text-smart-ink/64">
            <div className="flex gap-3">
              <CheckCircle2 aria-hidden="true" className="mt-1 size-5 shrink-0 text-smart-teal" />
              <p>
                Pentru conturile create cu email, confirmarea adresei este
                obligatorie. Google și Facebook verifică identitatea prin
                serviciul lor. Rolul de administrator și drepturile premium
                rămân gestionate separat și verificate în siguranță pe server.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
