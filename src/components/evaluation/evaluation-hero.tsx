import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { WaveSeparator } from "@/components/ui/WaveSeparator";

const heroProof = [
  { Icon: Clock3, label: "30 de minute" },
  { Icon: MapPin, label: "Online sau la centru" },
  { Icon: Sparkles, label: "Grup restrâns, direcție personală" },
] as const;

export function EvaluationHero() {
  return (
    <section className="relative isolate min-h-[720px] overflow-hidden bg-smart-dark px-5 pb-44 pt-32 text-smart-white sm:px-7 sm:pb-48 sm:pt-36 lg:min-h-[40.5rem] lg:px-8 lg:pb-[var(--smart-desktop-hero-bottom)] lg:pt-[var(--smart-desktop-hero-top)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_13%_18%,rgba(200,168,117,0.17),transparent_28%),radial-gradient(circle_at_82%_26%,rgba(156,206,208,0.19),transparent_34%),linear-gradient(135deg,#03111c_0%,#071b29_58%,#061622_100%)]" />
      <div className="absolute -left-44 top-32 size-[430px] rounded-full border border-smart-aqua/10" />
      <div className="absolute -right-32 bottom-20 size-[520px] rounded-full bg-smart-teal/16 blur-3xl" />
      <div className="grain-overlay" />

      <div className="relative z-10 mx-auto grid max-w-[var(--smart-content-max)] gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-11">
        <Reveal>
          <SectionLabel>Evaluare inițială SmartMed</SectionLabel>
          <h1 className="mt-5 max-w-[760px] font-serif text-[3.55rem] font-semibold leading-[0.9] tracking-[-0.045em] sm:text-7xl lg:text-[5.625rem]">
            Începem cu tine,
            <span className="mt-2 block text-smart-aqua">
              nu cu un abonament.
            </span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-smart-muted sm:text-lg lg:mt-6">
            Într-un grup restrâns, printr-o discuție calmă și concretă,
            clarificăm punctul de plecare, obiectivul și traseul SmartMed care
            are sens pentru tine.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center lg:mt-7">
            <Link
              className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-smart-gold-light/55 bg-[linear-gradient(180deg,#efd39b_0%,#d4aa68_100%)] px-6 py-3 text-sm font-extrabold text-smart-abyss shadow-[0_18px_42px_rgba(213,173,107,0.22),inset_0_1px_0_rgba(255,255,255,0.58)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(213,173,107,0.3),inset_0_1px_0_rgba(255,255,255,0.68)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold"
              href="#programare"
            >
              Alege ziua și ora
              <ArrowDown
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-y-1"
              />
            </Link>
            <span className="inline-flex min-h-12 items-center justify-center gap-2 px-3 text-xs font-bold text-smart-white/58 sm:justify-start">
              <ShieldCheck aria-hidden="true" className="size-4 text-smart-aqua" />
              Programarea se salvează în contul tău
            </span>
          </div>

          <ul className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3 lg:mt-7">
            {heroProof.map(({ Icon, label }) => (
              <li
                className="flex items-center gap-2.5 rounded-xl border border-white/9 bg-white/4 px-3 py-3 text-xs font-semibold text-smart-white/72"
                key={label}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0 text-smart-aqua" />
                {label}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="lg:pl-[1.375rem]">
          <div className="relative min-h-[410px] overflow-hidden rounded-[2.75rem] border border-white/14 bg-smart-teal shadow-[0_34px_100px_rgba(0,0,0,0.42)] sm:min-h-[520px] lg:min-h-[29.25rem] lg:rounded-[2.5rem]">
            <Image
              alt="Simbol vizual pentru conversația de orientare SmartMed"
              className="object-cover"
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 54vw"
              src="/assets/generated/feature-contact.png"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,17,28,0.02)_38%,rgba(3,17,28,0.84)_100%)]" />

            <div className="absolute inset-x-5 bottom-5 rounded-[1.65rem] border border-white/14 bg-smart-abyss/78 p-5 backdrop-blur-xl sm:inset-x-7 sm:bottom-7 sm:p-6 lg:inset-x-6 lg:bottom-6 lg:p-[1.375rem]">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-smart-aqua/20 bg-smart-aqua/10 text-smart-aqua">
                  <CalendarCheck2 aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="text-[0.66rem] font-extrabold uppercase tracking-[0.18em] text-smart-gold-light">
                    La finalul evaluării
                  </p>
                  <p className="mt-1 font-serif text-2xl font-semibold leading-none lg:text-[1.375rem]">
                    Știi care este următorul pas bun.
                  </p>
                </div>
              </div>
              <ul className="mt-5 grid gap-2.5 border-t border-white/10 pt-4 text-xs font-semibold text-smart-white/68 sm:grid-cols-3 lg:mt-[1.125rem] lg:pt-3.5">
                {["Punct de plecare", "Prioritate clară", "Traseu recomandat"].map(
                  (item) => (
                    <li className="flex items-center gap-2" key={item}>
                      <CheckCircle2
                        aria-hidden="true"
                        className="size-4 shrink-0 text-smart-aqua"
                      />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>

      <WaveSeparator fill="cream" />
    </section>
  );
}
