"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, MapPin, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type CentruFizicIntroPromptProps = {
  source?: string | null;
};

export function CentruFizicIntroPrompt({ source }: CentruFizicIntroPromptProps) {
  const [open, setOpen] = useState(true);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          element.getAttribute("aria-hidden") !== "true" &&
          !element.hasAttribute("hidden"),
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!dialog.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocusedElement?.isConnected) {
        previouslyFocusedElement.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      const url = new URL(window.location.href);
      url.searchParams.delete("intro");
      url.searchParams.delete("source");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, [open]);

  if (!open) return null;

  const registrationHref = `/?source=${encodeURIComponent(
    source === "homepage-centru" ? "centru-fizic-intro" : "centru-fizic",
  )}#abonamente`;

  return (
    <div
      aria-describedby="centru-fizic-intro-description"
      aria-labelledby="centru-fizic-intro-title"
      aria-modal="true"
      className="fixed inset-0 z-[90] flex min-h-full items-start justify-center overflow-y-auto bg-smart-abyss/82 p-3 backdrop-blur-md sm:p-6"
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <div className="relative my-auto grid w-full max-w-6xl shrink-0 overflow-hidden rounded-[2rem] border border-white/18 bg-smart-cream text-smart-ink shadow-[0_45px_160px_rgba(0,0,0,0.55)] lg:grid-cols-[0.94fr_1.06fr]">
        <button
          aria-label="Închide și continuă către pagina centrului fizic"
          className="absolute right-4 top-4 z-20 flex size-11 items-center justify-center rounded-full border border-smart-abyss/12 bg-white/88 text-smart-ink shadow-sm transition hover:rotate-3 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal sm:right-6 sm:top-6"
          onClick={() => setOpen(false)}
          ref={closeButtonRef}
          type="button"
        >
          <X aria-hidden="true" className="size-5" />
        </button>

        <div className="relative min-h-[280px] overflow-hidden lg:min-h-[650px]">
          <Image
            alt="Sala Centrului SmartMed, pregătită pentru cursuri și lucru aplicat"
            className="object-cover"
            fill
            loading="eager"
            priority
            sizes="(max-width: 1023px) 100vw, 48vw"
            src="/assets/generated/smartmed-center-physical-class.png"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,17,28,0.02)_36%,rgba(3,17,28,0.82)_100%)]" />
          <div className="absolute inset-x-5 bottom-5 flex items-center gap-3 rounded-2xl border border-white/15 bg-smart-abyss/76 p-4 text-smart-white backdrop-blur-xl sm:inset-x-7 sm:bottom-7">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-smart-gold/18 text-smart-gold-light">
              <MapPin aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-smart-aqua">
                Centrul SmartMed · București
              </p>
              <p className="mt-1 text-sm font-semibold text-smart-white/82">
                Pregătire în sală, feedback direct și comunitate.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 pb-9 pt-16 sm:px-10 sm:pb-12 lg:px-14 lg:py-16">
          <span className="flex size-12 items-center justify-center rounded-2xl border border-smart-teal/14 bg-smart-aqua/12 text-smart-teal">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.2em] text-smart-teal">
            Ai ajuns la centrul fizic
          </p>
          <h2
            className="mt-3 max-w-xl font-serif text-5xl font-semibold leading-[0.92] tracking-[-0.035em] sm:text-6xl"
            id="centru-fizic-intro-title"
          >
            Vrei să vezi dacă locul acesta ți se potrivește?
          </h2>
          <p
            className="mt-5 max-w-xl text-base leading-8 text-smart-ink/65"
            id="centru-fizic-intro-description"
          >
            Spune-ne ce clasă ești, ce facultate ai în minte și materiile la care
            vrei să lucrezi. Echipa îți recomandă apoi grupa și ritmul potrivite.
          </p>

          <div className="mt-7 grid gap-3 text-sm font-semibold text-smart-ink/72 sm:grid-cols-2">
            {["Fără cont obligatoriu", "Răspuns personalizat"].map((item) => (
              <span className="flex items-center gap-2" key={item}>
                <CheckCircle2 aria-hidden="true" className="size-4 text-smart-teal" />
                {item}
              </span>
            ))}
          </div>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-smart-gold-light/55 bg-[linear-gradient(180deg,#efd39b_0%,#d4aa68_100%)] px-6 text-sm font-extrabold text-smart-abyss shadow-[0_18px_42px_rgba(213,173,107,0.22)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-gold"
              href={registrationHref}
            >
              Înscrie-te la Centrul SmartMed
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition group-hover:translate-x-1"
              />
            </Link>
            <button
              className="min-h-14 rounded-2xl border border-smart-abyss/12 bg-white/60 px-6 text-sm font-bold text-smart-ink/72 transition hover:bg-white hover:text-smart-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-teal"
              onClick={() => setOpen(false)}
              type="button"
            >
              Mai întâi, arată-mi centrul
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
