import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  MapPinned,
  MonitorPlay,
} from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { EventExplorer } from "@/components/events/event-explorer";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import { getCurrentSmartMedSession } from "@/lib/auth/session";
import { getPublicRegistrationEvents } from "@/lib/events/repository";
import type {
  RegistrationEventRow,
  RegistrationPrefill,
} from "@/lib/events/types";
import { parseRegistrationContext } from "@/lib/registration-context";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const description =
  "Descoperă simulările, testele, webinariile și experiențele SmartMed cu înscrieri deschise.";

export const metadata: Metadata = {
  title: "Înscrieri și evenimente SmartMed",
  description,
  alternates: { canonical: "/inscriere" },
  openGraph: {
    title: `Înscrieri și evenimente | ${siteConfig.name}`,
    description,
    siteName: siteConfig.fullName,
    type: "website",
  },
};

type InscrierePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function isOpenEvent(event: RegistrationEventRow, now: number) {
  return (
    event.status === "published" &&
    new Date(event.registration_opens_at).getTime() <= now &&
    new Date(event.registration_closes_at).getTime() > now &&
    new Date(event.starts_at).getTime() > now
  );
}

async function getEventPrefill(): Promise<RegistrationPrefill> {
  const session = await getCurrentSmartMedSession();

  return {
    email: session?.email ?? "",
    fullName: session?.fullName ?? "",
    phone: session?.profile.phone ?? "",
  };
}

export default async function InscrierePage({ searchParams }: InscrierePageProps) {
  const context = parseRegistrationContext(await searchParams);
  const referenceDateTime = new Date();
  const referenceNow = referenceDateTime.toISOString();
  const [eventResult, prefill] = await Promise.all([
    getPublicRegistrationEvents(),
    getEventPrefill(),
  ]);
  const events = eventResult.data ?? [];
  const openEvents = events.filter((event) =>
    isOpenEvent(event, referenceDateTime.getTime()),
  );
  const contextualSimulation =
    context.flow === "simulare"
      ? openEvents.find((event) => event.event_type === "simulation") ?? null
      : null;

  return (
    <>
      <section className="relative isolate overflow-hidden bg-smart-dark px-5 pb-44 pt-32 text-smart-white sm:px-7 sm:pt-36 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(200,168,117,0.17),transparent_29%),radial-gradient(circle_at_82%_32%,rgba(156,206,208,0.2),transparent_34%),linear-gradient(135deg,#03111c_0%,#071b29_56%,#061622_100%)]" />
        <div className="absolute -left-36 top-40 size-[420px] rounded-full border border-smart-aqua/10" />
        <div className="grain-overlay" />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <SectionLabel>Calendar SmartMed</SectionLabel>
            <h1 className="mt-5 max-w-3xl font-serif text-6xl font-semibold leading-[0.9] tracking-[-0.04em] sm:text-7xl lg:text-[5.3rem]">
              Experiențe care te apropie de
              <span className="mt-2 block text-smart-aqua">Medicină</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-smart-muted sm:text-lg">
              Simulări, teste, webinarii și întâlniri la centru. Alegi experiența,
              verifici locurile și te înscrii simplu, fără să amestecăm acest proces cu
              programul de meditații.
            </p>
            <Link
              className="group mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-smart-gold-light/55 bg-[linear-gradient(180deg,#efd39b_0%,#d4aa68_100%)] px-7 py-3 text-sm font-extrabold text-smart-abyss shadow-[0_18px_42px_rgba(213,173,107,0.22),inset_0_1px_0_rgba(255,255,255,0.58)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(213,173,107,0.3),inset_0_1px_0_rgba(255,255,255,0.68)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold"
              href="#evenimente"
            >
              Vezi evenimentele
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </Link>

            <div className="mt-9 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                { icon: MonitorPlay, label: "Online și fizic" },
                { icon: MapPinned, label: "Locuri actualizate" },
                { icon: CheckCircle2, label: "Confirmare imediată" },
              ].map((item) => (
                <span
                  className="flex items-center gap-2 rounded-xl border border-white/9 bg-white/4 px-3 py-3 text-xs font-semibold text-smart-white/68"
                  key={item.label}
                >
                  <item.icon aria-hidden="true" className="size-4 shrink-0 text-smart-aqua" />
                  {item.label}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal className="lg:pl-6">
            <div className="relative min-h-[440px] overflow-hidden rounded-[2.75rem] border border-white/14 bg-[#e7ddcc] shadow-[0_34px_100px_rgba(0,0,0,0.42)] sm:min-h-[560px]">
              <Image
                alt="Inimă anatomică SmartMed și stetoscop"
                className="object-cover"
                fill
                priority
                sizes="(max-width: 1023px) 100vw, 55vw"
                src="/assets/generated/cta-heart-stethoscope.png"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,17,28,0.01)_45%,rgba(3,17,28,0.78)_100%)]" />
              <div className="absolute inset-x-5 bottom-5 flex items-center gap-4 rounded-2xl border border-white/14 bg-smart-abyss/76 px-5 py-4 backdrop-blur-xl sm:inset-x-7 sm:bottom-7">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-smart-gold/18 text-smart-gold-light">
                  <CalendarDays aria-hidden="true" className="size-5" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-smart-aqua">
                    Calendar actualizat
                  </p>
                  <p className="mt-1 text-sm font-semibold text-smart-white/82">
                    {openEvents.length === 1
                      ? "1 experiență cu înscrieri deschise"
                      : `${openEvents.length} experiențe cu înscrieri deschise`}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        <WaveSeparator fill="cream" />
      </section>

      <section
        className="relative scroll-mt-24 overflow-hidden bg-smart-cream px-5 pb-44 pt-20 text-smart-ink sm:px-7 sm:pt-24 lg:px-8"
        id="evenimente"
      >
        <div className="absolute right-[-8%] top-12 size-[360px] rounded-full border border-smart-teal/10" />
        <div className="absolute -left-48 bottom-40 size-[420px] rounded-full bg-smart-gold/8 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-7xl">
          <Reveal className="flex flex-wrap items-end justify-between gap-7">
            <div>
              <SectionLabel tone="cream">Înscrieri deschise</SectionLabel>
              <h2 className="mt-5 max-w-4xl font-serif text-5xl font-semibold leading-[0.96] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
                Alege următoarea experiență SmartMed
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-smart-ink/62 sm:text-base">
              Filtrează după tip sau format și vezi în timp real locurile rămase.
              Înscrierea la fiecare eveniment rămâne independentă.
            </p>
          </Reveal>

          {context.flow === "simulare" && !contextualSimulation ? (
            <div className="mt-8 rounded-[1.75rem] border border-smart-gold/30 bg-smart-gold/10 px-5 py-4 text-sm font-semibold text-smart-ink/72">
              Următoarea simulare nu are încă înscrierile deschise. Poți vedea mai jos
              toate experiențele disponibile sau reveni când publicăm data nouă.
            </div>
          ) : null}

          {eventResult.error ? (
            <div className="mt-9 rounded-[2rem] border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-800">
              {eventResult.error}
            </div>
          ) : events.length ? (
            <EventExplorer
              events={events}
              initialSelectedEventId={contextualSimulation?.id ?? null}
              initialTypeFilter={context.flow === "simulare" ? "simulation" : undefined}
              prefill={prefill}
              referenceNow={referenceNow}
            />
          ) : (
            <div className="mt-10 rounded-[2.25rem] border border-dashed border-smart-teal/28 bg-white/52 px-6 py-16 text-center shadow-[0_20px_60px_rgba(3,17,28,0.05)]">
              <CalendarDays aria-hidden="true" className="mx-auto size-10 text-smart-teal" />
              <h3 className="mt-5 font-serif text-4xl font-semibold sm:text-5xl">
                Pregătim următoarele date
              </h3>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-smart-ink/60">
                Calendarul va fi completat cu noile simulări, teste și webinarii.
              </p>
              <Link
                className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-smart-dark px-6 text-sm font-bold text-smart-white transition hover:bg-smart-teal"
                href="/contact"
              >
                Vorbește cu echipa
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          )}
        </div>

        <WaveSeparator fill="dark" />
      </section>
    </>
  );
}
