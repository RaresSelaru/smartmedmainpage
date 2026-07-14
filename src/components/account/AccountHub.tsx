"use client";

import Link from "next/link";
import { CheckCircle2, ShieldCheck, UserRoundCheck } from "lucide-react";
import { useActionState, useEffect } from "react";

import {
  initialAuthActionState,
  type AuthActionState,
  getFirstFieldError,
} from "@/lib/auth/action-state";
import {
  loginAction,
  logoutAction,
  requestPasswordResetAction,
  signUpAction,
  updatePasswordAction,
  updateProfileAction,
} from "@/lib/auth/actions";
import type { AuthMode } from "@/lib/auth/access-control";
import type { SmartMedSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

type AccountHubProps = {
  accessRequired: boolean;
  activeMode: AuthMode;
  errorCode?: string;
  isConfigured: boolean;
  nextPath: string;
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
  premium: "Premium",
  user: "User",
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

  if (status === "email-confirmed") {
    return {
      tone: "success" as const,
      text: "Emailul a fost confirmat. Contul tău SmartMed este activ.",
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
      <div className="grid gap-3 sm:grid-cols-2">
        <span className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-bold text-smart-ink/72">
          Rol: <span className="text-smart-teal">{roleLabels[session.role]}</span>
        </span>
        <span className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-bold text-smart-ink/72">
          Email:{" "}
          <span className={session.emailConfirmed ? "text-smart-teal" : "text-red-700"}>
            {session.emailConfirmed ? "confirmat" : "neconfirmat"}
          </span>
        </span>
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
        Setează `NEXT_PUBLIC_SUPABASE_URL` și `NEXT_PUBLIC_SUPABASE_ANON_KEY` pentru a activa
        formularele de cont.
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
  session,
  status,
}: AccountHubProps) {
  useEffect(() => {
    window.dispatchEvent(new Event("smartmed-auth-change"));
  }, [session?.id, status]);

  const showPasswordUpdate = activeMode === "parola-noua";
  const showProfile = session && !showPasswordUpdate;
  const activeAuthMode = activeMode === "parola-noua" ? "conectare" : activeMode;

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
              <UpdatePasswordForm />
            </ShellCard>
          ) : null}

          {showProfile ? (
            <>
              <ShellCard eyebrow="Profil activ" title="Datele tale">
                <div className="grid gap-6">
                  <AccountStatusCard session={session} />
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
                Confirmarea emailului este obligatorie pentru activarea contului. Rolurile premium
                și admin sunt gestionate separat, din zona server-controlled SmartMed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
