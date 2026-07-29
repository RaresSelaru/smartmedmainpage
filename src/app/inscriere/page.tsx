import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  MessageCircleMore,
} from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import { siteConfig } from "@/lib/site-config";

const description =
  "Punctul de pornire pentru viitoarele înscrieri la programele SmartMed Academy.";

export const metadata: Metadata = {
  title: "Înscriere",
  description,
  alternates: {
    canonical: "/inscriere",
  },
  openGraph: {
    title: `Înscriere | ${siteConfig.name}`,
    description,
    siteName: siteConfig.fullName,
    type: "website",
  },
};

const upcomingSteps = [
  "Alegerea programului și a formatului de pregătire",
  "Completarea datelor necesare pentru înscriere",
  "Confirmarea locului și următorii pași",
] as const;

export default function InscrierePage() {
  return (
    <>
      <section className="relative isolate min-h-[760px] overflow-hidden bg-smart-dark px-5 pb-44 pt-32 text-smart-white sm:px-7 sm:pt-36 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(200,168,117,0.17),transparent_30%),radial-gradient(circle_at_82%_26%,rgba(156,206,208,0.2),transparent_34%),linear-gradient(135deg,#03111c_0%,#071b29_56%,#061622_100%)]" />
        <div className="absolute -left-36 top-40 size-[420px] rounded-full border border-smart-aqua/10" />
        <div className="absolute -right-24 bottom-20 size-[520px] rounded-full bg-smart-teal/16 blur-3xl" />
        <div className="grain-overlay" />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <Reveal>
            <SectionLabel>Următorul tău pas</SectionLabel>
            <h1 className="mt-5 max-w-3xl font-serif text-6xl font-semibold leading-[0.9] tracking-[-0.04em] sm:text-7xl lg:text-[6.5rem]">
              Înscriere
              <span className="mt-2 block text-smart-aqua">SmartMed</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-smart-muted sm:text-lg">
              Pregătim aici un proces simplu și clar pentru înscrierea la
              programele SmartMed. Până la lansarea formularului, poți afla
              mai jos cum va fi organizat parcursul.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-smart-gold-light/55 bg-[linear-gradient(180deg,#efd39b_0%,#d4aa68_100%)] px-6 py-3 text-sm font-extrabold text-smart-abyss shadow-[0_18px_42px_rgba(213,173,107,0.22),inset_0_1px_0_rgba(255,255,255,0.58)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(213,173,107,0.3),inset_0_1px_0_rgba(255,255,255,0.68)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold"
                href="#detalii-inscriere"
              >
                Vezi ce urmează
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-1"
                />
              </Link>
              <Link
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-white/18 bg-white/7 px-6 py-3 text-sm font-bold text-smart-white backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-smart-aqua/45 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua"
                href="/contact"
              >
                <MessageCircleMore aria-hidden="true" className="size-4 text-smart-aqua" />
                Vorbește cu echipa
              </Link>
            </div>
          </Reveal>

          <Reveal className="lg:pl-6">
            <div className="relative min-h-[400px] overflow-hidden rounded-[2.5rem] border border-white/14 bg-smart-deep shadow-[0_32px_90px_rgba(0,0,0,0.38)] sm:min-h-[500px]">
              <Image
                alt="Sală de curs SmartMed pregătită pentru elevi"
                className="object-cover"
                fill
                priority
                sizes="(max-width: 1023px) 100vw, 58vw"
                src="/assets/generated/smartmed-center-physical-class.png"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,17,28,0.02)_42%,rgba(3,17,28,0.78)_100%)]" />
              <div className="absolute inset-x-5 bottom-5 flex items-center gap-3 rounded-2xl border border-white/14 bg-smart-abyss/72 px-5 py-4 backdrop-blur-xl sm:inset-x-7 sm:bottom-7">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-smart-gold/18 text-smart-gold-light">
                  <GraduationCap aria-hidden="true" className="size-5" strokeWidth={1.7} />
                </span>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-smart-aqua">
                    Formular în pregătire
                  </p>
                  <p className="mt-1 text-sm font-semibold text-smart-white/82">
                    Înscrierile vor fi gestionate direct din această pagină.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        <WaveSeparator fill="cream" />
      </section>

      <section
        className="relative overflow-hidden bg-smart-cream px-5 pb-44 pt-20 text-smart-ink sm:px-7 sm:pt-24 lg:px-8"
        id="detalii-inscriere"
      >
        <div className="absolute right-[-8%] top-12 size-[360px] rounded-full border border-smart-teal/10" />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <Reveal>
            <SectionLabel tone="cream">Structură de bază</SectionLabel>
            <h2 className="mt-5 max-w-2xl font-serif text-5xl font-semibold leading-[0.96] tracking-[-0.03em] sm:text-6xl">
              Înscrierea va începe de aici
            </h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-smart-ink/68">
              Pagina este pregătită vizual pentru viitorul flux de înscriere.
              Vom adăuga formularul și opțiunile exacte după ce sunt stabilite
              programele, perioadele și datele necesare.
            </p>
          </Reveal>

          <Reveal>
            <div className="rounded-[2rem] border border-smart-abyss/10 bg-white/58 p-6 shadow-[0_24px_70px_rgba(3,17,28,0.11)] sm:p-8">
              <div className="flex items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-smart-gold/35 bg-smart-cream-deep text-smart-teal">
                  <CalendarDays aria-hidden="true" className="size-5" strokeWidth={1.7} />
                </span>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-smart-teal">
                    În curând
                  </p>
                  <h3 className="mt-1 font-serif text-3xl font-semibold">
                    Ce pregătim
                  </h3>
                </div>
              </div>
              <ul className="mt-7 grid gap-4">
                {upcomingSteps.map((step) => (
                  <li
                    className="flex gap-3 border-t border-smart-ink/10 pt-4 text-sm font-semibold leading-7 text-smart-ink/72 first:border-t-0 first:pt-0"
                    key={step}
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-1 size-5 shrink-0 text-smart-teal"
                      strokeWidth={1.8}
                    />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        <WaveSeparator fill="teal" />
      </section>

      <section className="relative overflow-hidden bg-smart-teal px-5 pb-24 pt-20 text-smart-white sm:px-7 sm:pb-28 sm:pt-24 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(156,206,208,0.2),transparent_28%),linear-gradient(135deg,#1f6f78,#0d4351_76%)]" />
        <div className="grain-overlay" />
        <Reveal className="relative z-10 mx-auto max-w-4xl text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-smart-gold-light">
            Până deschidem formularul
          </p>
          <h2 className="mt-4 font-serif text-5xl font-semibold leading-none sm:text-6xl">
            Ai o întrebare despre programe?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-smart-white/72">
            Echipa SmartMed îți poate oferi momentan informațiile disponibile
            despre pregătire, grupe și următoarele perioade de înscriere.
          </p>
          <Link
            className="group mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-smart-gold-light/55 bg-[linear-gradient(180deg,#efd39b_0%,#d4aa68_100%)] px-7 py-3 text-sm font-extrabold text-smart-abyss shadow-[0_18px_42px_rgba(3,17,28,0.2)] transition duration-300 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold"
            href="/contact"
          >
            Contactează echipa
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform group-hover:translate-x-1"
            />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
