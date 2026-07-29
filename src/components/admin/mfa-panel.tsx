"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { sanitizeAdminNextPath } from "@/lib/admin/redirects";
import { createBrowserSupabaseClient } from "@/lib/auth/supabase-browser";

type VerifiedTotpFactor = {
  id: string;
  label: string;
};

type TotpEnrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

type MfaPanelProps = {
  nextPath: string;
};

function isSixDigitCode(value: string) {
  return /^\d{6}$/.test(value);
}

function isSafeQrCode(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 200_000 &&
    (value.startsWith("data:image/svg+xml,") ||
      value.startsWith("data:image/svg+xml;"))
  );
}

function getMfaErrorMessage(code?: string) {
  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit"
  ) {
    return "Prea multe încercări într-un timp scurt. Așteaptă puțin și încearcă din nou.";
  }

  return "Codul nu a putut fi verificat. Verifică ora dispozitivului și încearcă din nou.";
}

export function MfaPanel({ nextPath }: MfaPanelProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [factors, setFactors] = useState<VerifiedTotpFactor[]>([]);
  const [loadingFactors, setLoadingFactors] = useState(true);
  const [selectedFactorId, setSelectedFactorId] = useState("");
  const safeNextPath = sanitizeAdminNextPath(nextPath);

  const loadFactors = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();

    if (!supabase) {
      setError("Autentificarea SmartMed nu este configurată.");
      setLoadingFactors(false);
      return;
    }

    const { data, error: listError } = await supabase.auth.mfa.listFactors();

    if (listError) {
      setError("Factorii MFA nu au putut fi încărcați.");
      setLoadingFactors(false);
      return;
    }

    const verifiedFactors = data.totp
      .filter((factor) => factor.status === "verified")
      .map((factor, index) => ({
        id: factor.id,
        label: factor.friendly_name?.trim() || `Authenticator ${index + 1}`,
      }));

    setFactors(verifiedFactors);
    setSelectedFactorId((current) => {
      if (verifiedFactors.some((factor) => factor.id === current)) {
        return current;
      }

      return verifiedFactors[0]?.id ?? "";
    });
    setLoadingFactors(false);
  }, []);

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (active) {
        void loadFactors();
      }
    });

    return () => {
      active = false;
    };
  }, [loadFactors]);

  async function verifyFactor(factorId: string) {
    const supabase = createBrowserSupabaseClient();

    if (!supabase) {
      setError("Autentificarea SmartMed nu este configurată.");
      return;
    }

    if (!factorId || !isSixDigitCode(code)) {
      setError("Introdu codul de 6 cifre din aplicația de autentificare.");
      return;
    }

    setBusy(true);
    setError(null);

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError) {
      setError(getMfaErrorMessage(challengeError.code));
      setBusy(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      challengeId: challengeData.id,
      code,
      factorId,
    });

    if (verifyError) {
      setError(getMfaErrorMessage(verifyError.code));
      setBusy(false);
      return;
    }

    setCode("");
    router.replace(safeNextPath);
    router.refresh();
  }

  async function beginEnrollment() {
    const supabase = createBrowserSupabaseClient();

    if (!supabase) {
      setError("Autentificarea SmartMed nu este configurată.");
      return;
    }

    setBusy(true);
    setError(null);

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "SmartMed Admin",
    });

    if (
      enrollError ||
      !data.totp.secret ||
      !isSafeQrCode(data.totp.qr_code)
    ) {
      setError("Configurarea MFA nu a putut fi pornită. Încearcă din nou.");
      setBusy(false);
      return;
    }

    setEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
    setBusy(false);
  }

  async function cancelEnrollment() {
    if (!enrollment) {
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const factorId = enrollment.factorId;

    setEnrollment(null);
    setCode("");
    setError(null);

    if (supabase) {
      await supabase.auth.mfa.unenroll({ factorId });
      await loadFactors();
    }
  }

  if (loadingFactors) {
    return (
      <p aria-live="polite" className="text-sm text-smart-ink/65">
        Verificăm factorii de autentificare…
      </p>
    );
  }

  return (
    <div className="grid gap-7">
      {error ? (
        <div
          aria-live="polite"
          className="rounded-2xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {enrollment ? (
        <section aria-labelledby="mfa-enrollment-title" className="grid gap-5">
          <div>
            <h2
              className="font-serif text-3xl font-semibold"
              id="mfa-enrollment-title"
            >
              Configurează aplicația
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-smart-ink/68">
              Scanează codul QR în aplicația ta de autentificare. Dacă nu îl
              poți scana, introdu cheia manual. Datele sunt păstrate doar în
              această fereastră.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-[220px_1fr] sm:items-center">
            <div className="w-fit rounded-3xl border border-smart-abyss/10 bg-white p-4 shadow-sm">
              <Image
                alt="Cod QR pentru configurarea autentificării în doi pași"
                height={188}
                src={enrollment.qrCode}
                unoptimized
                width={188}
              />
            </div>
            <div className="min-w-0 rounded-2xl border border-smart-abyss/10 bg-white/65 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-smart-teal">
                Cheie manuală
              </p>
              <code className="mt-2 block break-all rounded-xl bg-smart-dark px-3 py-3 text-sm text-smart-aqua">
                {enrollment.secret}
              </code>
            </div>
          </div>
        </section>
      ) : factors.length ? (
        <section aria-labelledby="mfa-challenge-title" className="grid gap-5">
          <div>
            <h2
              className="font-serif text-3xl font-semibold"
              id="mfa-challenge-title"
            >
              Confirmă autentificarea
            </h2>
            <p className="mt-2 text-sm leading-7 text-smart-ink/68">
              Deschide aplicația de autentificare și introdu codul curent.
            </p>
          </div>

          {factors.length > 1 ? (
            <label className="grid gap-2 text-sm font-bold" htmlFor="mfa-factor">
              Dispozitiv
              <select
                className="min-h-12 rounded-2xl border border-smart-abyss/15 bg-white px-4 font-medium outline-none focus:border-smart-teal focus:ring-2 focus:ring-smart-aqua/30"
                id="mfa-factor"
                onChange={(event) => setSelectedFactorId(event.target.value)}
                value={selectedFactorId}
              >
                {factors.map((factor) => (
                  <option key={factor.id} value={factor.id}>
                    {factor.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="rounded-2xl border border-smart-abyss/10 bg-white/60 px-4 py-3 text-sm">
              Factor: <strong>{factors[0]?.label}</strong>
            </p>
          )}
        </section>
      ) : (
        <section aria-labelledby="mfa-start-title" className="grid gap-4">
          <div>
            <h2
              className="font-serif text-3xl font-semibold"
              id="mfa-start-title"
            >
              Activează autentificarea în doi pași
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-smart-ink/68">
              Contul administrativ nu are încă un factor TOTP verificat.
              Configurează o aplicație precum 1Password, Google Authenticator
              sau Microsoft Authenticator pentru a continua.
            </p>
          </div>
          <button
            className="min-h-12 w-fit rounded-2xl bg-smart-dark px-5 py-3 text-sm font-bold text-smart-white transition hover:bg-smart-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal disabled:cursor-wait disabled:opacity-60"
            disabled={busy}
            onClick={() => void beginEnrollment()}
            type="button"
          >
            {busy ? "Se pregătește…" : "Configurează aplicația"}
          </button>
        </section>
      )}

      {enrollment || factors.length ? (
        <div className="grid gap-4 border-t border-smart-abyss/10 pt-6">
          <label className="grid gap-2 text-sm font-bold" htmlFor="mfa-code">
            Cod de verificare
            <input
              autoComplete="one-time-code"
              className="min-h-14 max-w-xs rounded-2xl border border-smart-abyss/15 bg-white px-4 text-lg font-bold tracking-[0.3em] outline-none focus:border-smart-teal focus:ring-2 focus:ring-smart-aqua/30"
              id="mfa-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              pattern="[0-9]{6}"
              placeholder="000000"
              value={code}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              className="min-h-12 rounded-2xl bg-smart-teal px-5 py-3 text-sm font-bold text-white transition hover:bg-smart-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal disabled:cursor-wait disabled:opacity-60"
              disabled={busy || !isSixDigitCode(code)}
              onClick={() =>
                void verifyFactor(enrollment?.factorId ?? selectedFactorId)
              }
              type="button"
            >
              {busy ? "Se verifică…" : "Verifică și continuă"}
            </button>
            {enrollment ? (
              <button
                className="min-h-12 rounded-2xl border border-smart-abyss/15 bg-white px-5 py-3 text-sm font-bold text-smart-ink transition hover:border-smart-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal"
                disabled={busy}
                onClick={() => void cancelEnrollment()}
                type="button"
              >
                Anulează configurarea
              </button>
            ) : (
              <button
                className="min-h-12 rounded-2xl border border-smart-abyss/15 bg-white px-5 py-3 text-sm font-bold text-smart-ink transition hover:border-smart-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal"
                disabled={busy}
                onClick={() => void beginEnrollment()}
                type="button"
              >
                Adaugă alt dispozitiv
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
