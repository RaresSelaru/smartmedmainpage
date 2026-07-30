"use client";

import { Play, Settings2, ShieldCheck } from "lucide-react";

import { OPEN_CONSENT_SETTINGS_EVENT } from "@/lib/consent";

import { useConsent } from "./consent-provider";

export function ConsentYouTubeEmbed({
  title,
  videoId,
}: {
  title: string;
  videoId: string;
}) {
  const { allowCategory, allows } = useConsent();

  if (allows("externalMedia")) {
    return (
      <iframe
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="size-full border-0"
        data-consent-enabled="external-media"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={title}
      />
    );
  }

  return (
    <div
      className="relative flex size-full min-h-64 flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_20%,rgba(156,206,208,0.18),transparent_38%),linear-gradient(145deg,#061622,#03111c)] px-6 py-8 text-center text-smart-white"
      data-consent-gate="external-media"
    >
      <div className="grain-overlay" />
      <div className="relative z-10 flex max-w-lg flex-col items-center">
        <span className="flex size-16 items-center justify-center rounded-full border border-smart-aqua/35 bg-smart-aqua/10 text-smart-aqua">
          <Play aria-hidden="true" className="ml-1 size-7" fill="currentColor" />
        </span>
        <p className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-smart-aqua">
          <ShieldCheck aria-hidden="true" className="size-4" />
          Conținut extern protejat
        </p>
        <p className="mt-2 font-serif text-2xl font-semibold leading-tight text-smart-cream sm:text-3xl">
          {title}
        </p>
        <p className="mt-3 max-w-md text-sm leading-6 text-smart-muted">
          Playerul YouTube se încarcă doar dacă permiți categoria „Conținut
          extern”.
        </p>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <button
            className="min-h-11 rounded-full bg-smart-aqua px-5 text-sm font-extrabold text-smart-abyss transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-aqua"
            onClick={() => allowCategory("externalMedia")}
            type="button"
          >
            Permite și redă
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/18 bg-white/6 px-5 text-sm font-bold text-smart-cream transition hover:border-smart-aqua/45 hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-smart-aqua"
            onClick={() =>
              window.dispatchEvent(new Event(OPEN_CONSENT_SETTINGS_EVENT))
            }
            type="button"
          >
            <Settings2 aria-hidden="true" className="size-4" />
            Setări
          </button>
        </div>
      </div>
    </div>
  );
}
