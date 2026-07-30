"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Check,
  Cookie,
  LockKeyhole,
  Megaphone,
  Play,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ACCEPT_ALL_CONSENT,
  OPEN_CONSENT_SETTINGS_EVENT,
  REJECT_OPTIONAL_CONSENT,
  type ConsentChoices,
  type OptionalConsentCategory,
} from "@/lib/consent";
import { cn } from "@/lib/utils";

import styles from "./consent-manager.module.css";
import { useConsent } from "./consent-provider";

const categoryDetails: ReadonlyArray<{
  category: OptionalConsentCategory;
  description: string;
  icon: ReactNode;
  title: string;
}> = [
  {
    category: "preferences",
    title: "Preferințe",
    description:
      "Rețin opțiuni de afișare și funcții personalizate pe care le vom adăuga în viitor.",
    icon: <SlidersHorizontal aria-hidden="true" className="size-5" />,
  },
  {
    category: "analytics",
    title: "Analiză",
    description:
      "Ne vor ajuta să înțelegem ce pagini sunt utile. SmartMed nu folosește momentan analytics.",
    icon: <BarChart3 aria-hidden="true" className="size-5" />,
  },
  {
    category: "externalMedia",
    title: "Conținut extern",
    description:
      "Permit încărcarea serviciilor terțe, precum playerul YouTube în modul de confidențialitate extinsă.",
    icon: <Play aria-hidden="true" className="size-5" />,
  },
  {
    category: "marketing",
    title: "Marketing",
    description:
      "Vor permite măsurarea campaniilor doar dacă vom integra în viitor platforme de promovare.",
    icon: <Megaphone aria-hidden="true" className="size-5" />,
  },
];

export function ConsentManager() {
  const pathname = usePathname();
  const { isReady, record, saveChoices } = useConsent();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftChoices, setDraftChoices] = useState<ConsentChoices>(
    REJECT_OPTIONAL_CONSENT,
  );
  const [statusMessage, setStatusMessage] = useState("");

  const openDialog = useCallback(() => {
    setDraftChoices(record?.choices ?? REJECT_OPTIONAL_CONSENT);
    setDialogOpen(true);
  }, [record]);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener(OPEN_CONSENT_SETTINGS_EVENT, openDialog);

    return () => {
      window.removeEventListener(OPEN_CONSENT_SETTINGS_EVENT, openDialog);
    };
  }, [openDialog]);

  const persistChoices = useCallback(
    (nextChoices: ConsentChoices, source: "banner" | "settings") => {
      saveChoices(nextChoices, source);
      setDraftChoices(nextChoices);
      setDialogOpen(false);
      setStatusMessage("Preferințele de confidențialitate au fost salvate.");
    },
    [saveChoices],
  );

  if (!isReady || pathname === "/admin" || pathname.startsWith("/admin/")) {
    return null;
  }

  const showBanner = !record && !dialogOpen;

  return (
    <>
      <p aria-live="polite" className="sr-only" role="status">
        {statusMessage}
      </p>

      {showBanner ? (
        <section
          aria-label="Preferințe cookie"
          className={cn(
            styles.banner,
            "fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-[1180px] overflow-hidden rounded-[30px] border border-white/16 bg-smart-abyss/96 text-smart-white shadow-[0_28px_100px_rgba(0,0,0,0.48)] backdrop-blur-2xl sm:inset-x-6 sm:bottom-6",
          )}
          data-consent-banner="true"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(156,206,208,0.16),transparent_35%),radial-gradient(circle_at_90%_15%,rgba(200,168,117,0.12),transparent_32%)]" />
          <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.17em] text-smart-aqua">
                <ShieldCheck aria-hidden="true" className="size-4" />
                Controlul tău, mereu
              </div>
              <h2 className="mt-3 font-serif text-3xl font-semibold leading-none sm:text-4xl">
                Tu alegi ce activăm
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-smart-muted sm:text-[0.95rem]">
                Folosim tehnologii strict necesare pentru cont, securitate și
                salvarea acestei alegeri. Cele opționale rămân oprite până când
                le permiți.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-2 text-smart-cream">
                  <LockKeyhole aria-hidden="true" className="size-4 text-smart-gold-light" />
                  Necesare: mereu active
                </span>
                <Link
                  className="font-bold text-smart-aqua underline decoration-smart-aqua/40 underline-offset-4 transition hover:decoration-smart-aqua"
                  href="/politica-cookie"
                >
                  Vezi politica de cookies
                </Link>
              </div>
            </div>

            <div className="grid w-full gap-2.5 sm:grid-cols-3 lg:w-[520px]">
              <button
                className="min-h-12 rounded-full border border-smart-aqua/60 bg-smart-aqua px-5 text-sm font-extrabold text-smart-abyss transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-aqua"
                onClick={() =>
                  persistChoices(ACCEPT_ALL_CONSENT, "banner")
                }
                type="button"
              >
                Accept toate
              </button>
              <button
                className="min-h-12 rounded-full border border-smart-cream/45 bg-smart-cream/10 px-5 text-sm font-extrabold text-smart-cream transition hover:border-smart-cream/75 hover:bg-smart-cream/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-cream"
                onClick={() =>
                  persistChoices(REJECT_OPTIONAL_CONSENT, "banner")
                }
                type="button"
              >
                Refuz opționale
              </button>
              <button
                className="min-h-12 rounded-full border border-white/18 bg-white/6 px-5 text-sm font-bold text-smart-white transition hover:border-smart-aqua/45 hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-aqua"
                onClick={openDialog}
                type="button"
              >
                Personalizează
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {record && !dialogOpen ? (
        <button
          aria-label="Deschide setările de consimțământ"
          className={cn(
            styles.tab,
            "group fixed bottom-5 right-0 z-[90] flex min-h-12 items-center gap-2 rounded-l-full border border-r-0 border-smart-aqua/35 bg-smart-abyss/94 px-3.5 py-2.5 text-xs font-extrabold text-smart-cream shadow-[0_14px_44px_rgba(0,0,0,0.3)] backdrop-blur-xl transition hover:border-smart-aqua/70 hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-aqua sm:bottom-7 sm:px-4",
          )}
          data-consent-tab="true"
          onClick={openDialog}
          type="button"
        >
          <Cookie aria-hidden="true" className="size-4 text-smart-aqua" />
          <span className="hidden sm:inline">Setări cookie</span>
          <span className="sm:hidden">Cookie</span>
        </button>
      ) : null}

      {dialogOpen ? (
        <ConsentPreferencesDialog
          choices={draftChoices}
          onAcceptAll={() => persistChoices(ACCEPT_ALL_CONSENT, "settings")}
          onChange={setDraftChoices}
          onClose={closeDialog}
          onRejectOptional={() =>
            persistChoices(REJECT_OPTIONAL_CONSENT, "settings")
          }
          onSave={() => persistChoices(draftChoices, "settings")}
        />
      ) : null}
    </>
  );
}

function ConsentPreferencesDialog({
  choices,
  onAcceptAll,
  onChange,
  onClose,
  onRejectOptional,
  onSave,
}: {
  choices: ConsentChoices;
  onAcceptAll: () => void;
  onChange: (choices: ConsentChoices) => void;
  onClose: () => void;
  onRejectOptional: () => void;
  onSave: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => titleRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  const toggleCategory = (category: OptionalConsentCategory) => {
    onChange({
      ...choices,
      [category]: !choices[category],
    });
  };

  return (
    <div
      className={cn(
        styles.backdrop,
        "fixed inset-0 z-[110] flex items-end justify-center bg-black/68 p-0 backdrop-blur-md sm:items-center sm:p-5",
      )}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <div
        aria-describedby="consent-dialog-description"
        aria-labelledby="consent-dialog-title"
        aria-modal="true"
        className={cn(
          styles.dialog,
          "relative max-h-[92svh] w-full max-w-3xl overflow-y-auto rounded-t-[34px] border border-white/14 bg-smart-abyss text-smart-white shadow-[0_32px_120px_rgba(0,0,0,0.58)] sm:rounded-[34px]",
        )}
        data-consent-dialog="true"
        ref={dialogRef}
        role="dialog"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-white/10 bg-smart-abyss/94 px-5 py-5 backdrop-blur-xl sm:px-7 sm:py-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-smart-aqua">
              <Settings2 aria-hidden="true" className="size-4" />
              Centru de consimțământ
            </div>
            <h2
              className="mt-2 font-serif text-3xl font-semibold leading-none outline-none sm:text-4xl"
              id="consent-dialog-title"
              ref={titleRef}
              tabIndex={-1}
            >
              Preferințele tale
            </h2>
          </div>
          <button
            aria-label="Închide setările"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/6 text-smart-muted transition hover:border-smart-aqua/45 hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-aqua"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="px-5 py-6 sm:px-7">
          <p
            className="max-w-2xl text-sm leading-6 text-smart-muted"
            id="consent-dialog-description"
          >
            Poți accepta sau refuza separat fiecare categorie opțională. Îți
            poți schimba alegerea oricând din tabul „Setări cookie”.
          </p>

          <div className="mt-6 grid gap-3">
            <ConsentCategoryRow
              checked
              description="Mențin autentificarea, protejează serviciul și memorează această alegere. Nu pot fi dezactivate."
              disabled
              icon={<LockKeyhole aria-hidden="true" className="size-5" />}
              onToggle={() => undefined}
              title="Strict necesare"
            />
            {categoryDetails.map((item) => (
              <ConsentCategoryRow
                checked={choices[item.category]}
                description={item.description}
                icon={item.icon}
                key={item.category}
                onToggle={() => toggleCategory(item.category)}
                title={item.title}
              />
            ))}
          </div>

          <div className="mt-6 rounded-[24px] border border-smart-aqua/18 bg-smart-aqua/[0.07] p-4 text-sm leading-6 text-smart-muted">
            <p className="flex gap-3">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-smart-aqua"
              />
              Alegerea nu conține un identificator personal. Salvăm doar
              categoriile selectate, versiunea politicii și momentul actualizării.
            </p>
          </div>

          <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
            <button
              className="min-h-12 rounded-full border border-smart-cream/38 bg-smart-cream/8 px-5 text-sm font-extrabold text-smart-cream transition hover:border-smart-cream/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-cream"
              onClick={onRejectOptional}
              type="button"
            >
              Refuz opționale
            </button>
            <button
              className="min-h-12 rounded-full border border-smart-aqua/45 bg-smart-aqua/12 px-5 text-sm font-extrabold text-smart-aqua transition hover:bg-smart-aqua/18 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-aqua"
              onClick={onSave}
              type="button"
            >
              Salvează selecția
            </button>
            <button
              className="min-h-12 rounded-full border border-smart-aqua bg-smart-aqua px-5 text-sm font-extrabold text-smart-abyss transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-aqua"
              onClick={onAcceptAll}
              type="button"
            >
              Accept toate
            </button>
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-smart-muted">
            Detalii complete în{" "}
            <Link
              className="font-bold text-smart-aqua underline decoration-smart-aqua/35 underline-offset-4"
              href="/politica-cookie"
              onClick={onClose}
            >
              Politica de cookies
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function ConsentCategoryRow({
  checked,
  description,
  disabled = false,
  icon,
  onToggle,
  title,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  icon: ReactNode;
  onToggle: () => void;
  title: string;
}) {
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[24px] border border-white/11 bg-white/[0.045] p-4 sm:gap-4 sm:p-5">
      <span className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/7 text-smart-aqua">
        {icon}
      </span>
      <span>
        <span className="block font-serif text-xl font-semibold text-smart-cream sm:text-2xl">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-smart-muted sm:text-sm">
          {description}
        </span>
      </span>
      {disabled ? (
        <span className="inline-flex min-w-[86px] items-center justify-center gap-1.5 rounded-full border border-smart-gold/30 bg-smart-gold/10 px-3 py-2 text-[0.68rem] font-extrabold uppercase tracking-[0.09em] text-smart-gold-light">
          <Check aria-hidden="true" className="size-3.5" />
          Activ
        </span>
      ) : (
        <button
          aria-checked={checked}
          aria-label={`${title}: ${checked ? "activat" : "dezactivat"}`}
          className={cn(
            "relative h-8 w-14 shrink-0 rounded-full border p-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-aqua",
            checked
              ? "border-smart-aqua/70 bg-smart-aqua"
              : "border-white/22 bg-white/10",
          )}
          onClick={onToggle}
          onKeyDown={handleKeyDown}
          role="switch"
          type="button"
        >
          <span
            className={cn(
              "block size-5 rounded-full shadow-sm transition-transform",
              checked
                ? "translate-x-6 bg-smart-abyss"
                : "translate-x-0 bg-smart-muted",
            )}
          />
        </button>
      )}
    </div>
  );
}
