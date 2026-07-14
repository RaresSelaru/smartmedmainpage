import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  LayoutGrid,
  MapPin,
  Stethoscope,
} from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import { generatedAssets, heroCopy } from "@/lib/site-config";

const proofItems = [
  { label: "Profesori medici", Icon: Stethoscope },
  { label: "Centru fizic + online", Icon: MapPin },
  { label: "Simulări", Icon: ChartNoAxesColumnIncreasing },
  { label: "Platformă de grile", Icon: LayoutGrid },
] as const;

export function HeroSection() {
  return (
    <section
      className="relative isolate min-h-[780px] overflow-hidden bg-smart-dark px-5 pb-36 pt-28 text-smart-white sm:min-h-[820px] sm:px-7 sm:pb-44 sm:pt-32 lg:px-8"
      data-home-hero="true"
    >
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_82%_18%,rgba(156,206,208,0.20),transparent_38%),radial-gradient(circle_at_12%_28%,rgba(200,168,117,0.10),transparent_30%),linear-gradient(135deg,#03111c_0%,#071b29_48%,#061622_100%)]" />
      <div className="hero-neural-layer pointer-events-none absolute inset-0 z-[2] hidden lg:block">
        <Image
          alt=""
          className="object-cover object-top [object-position:68%_0%]"
          fill
          loading="eager"
          priority
          sizes="100vw"
          src={generatedAssets.heroNeural}
        />
        <div aria-hidden="true" className="hero-neural-overlay absolute inset-0" />
      </div>
      <div className="hero-copy-scrim" />
      <div className="grain-overlay z-[4]" />
      <div className="relative z-10 mx-auto flex max-w-[1580px] items-center py-8 sm:py-10 lg:min-h-[510px]">
        <div className="flex w-full min-w-0 max-w-[320px] flex-col items-start text-left sm:max-w-[620px] lg:max-w-[780px]">
          <Reveal>
            <div>
              <h1 className="inline-block text-center font-serif text-[36px] font-semibold leading-[1.04] tracking-normal text-smart-white drop-shadow-[0_12px_34px_rgba(0,0,0,0.34)] sm:text-[50px] lg:text-[64px]">
                {heroCopy.titleLead}
                <span className="mt-2 block whitespace-nowrap bg-[linear-gradient(180deg,#f2d99f_0%,#d5ad6b_48%,#b88643_100%)] bg-clip-text text-[60px] font-bold leading-[0.86] text-transparent drop-shadow-[0_8px_22px_rgba(0,0,0,0.26)] sm:mt-3 sm:text-[86px] lg:text-[128px]">
                  {heroCopy.titleHighlight}
                </span>
              </h1>
              <div
                aria-hidden="true"
                className="relative mt-2 h-px w-full max-w-[620px] bg-gradient-to-r from-transparent via-smart-gold-light/70 to-transparent sm:mt-3 lg:max-w-[700px]"
              >
                <span className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-smart-gold-light shadow-[0_0_18px_5px_rgba(215,190,138,0.42)]" />
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-7 max-w-[720px] font-serif text-[22px] font-medium leading-[1.36] text-smart-white/92 drop-shadow-[0_10px_28px_rgba(0,0,0,0.34)] sm:text-[26px] lg:text-[28px]">
              {heroCopy.subtitle.map((line) => (
                <span className="block" key={line}>
                  {line}
                </span>
              ))}
            </p>
          </Reveal>
          <Reveal delay={0.14}>
            <div className="mt-8 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <Link
                className="group inline-flex min-h-[60px] items-center justify-center gap-4 rounded-xl border border-smart-gold-light/50 bg-[linear-gradient(180deg,#efd298_0%,#d4aa68_100%)] px-7 py-4 text-base font-extrabold text-smart-abyss shadow-[0_18px_42px_rgba(213,173,107,0.22),inset_0_1px_0_rgba(255,255,255,0.52)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(213,173,107,0.30),inset_0_1px_0_rgba(255,255,255,0.62)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold sm:min-w-[360px] sm:text-lg"
                href="/contact"
              >
                <CalendarDays aria-hidden="true" className="size-7 shrink-0" strokeWidth={2} />
                <span>{heroCopy.primaryCta}</span>
              </Link>
              <Link
                className="inline-flex min-h-[60px] items-center justify-center rounded-xl border border-smart-gold-light/80 bg-smart-abyss/34 px-7 py-4 text-base font-bold text-smart-gold-light shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-smart-gold/10 hover:shadow-[0_18px_42px_rgba(213,173,107,0.15)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold sm:min-w-[320px] sm:text-lg"
                href="/module-speciale"
              >
                {heroCopy.secondaryCta}
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <ul className="mt-8 grid w-full max-w-[760px] grid-cols-2 gap-x-5 gap-y-4 text-sm font-medium text-smart-white/88 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-3 sm:text-base">
              {proofItems.map(({ label, Icon }, index) => (
                <li className="flex items-center gap-3" key={label}>
                  {index > 0 ? (
                    <span aria-hidden="true" className="hidden size-1.5 rounded-full bg-smart-gold-light shadow-[0_0_10px_rgba(215,190,138,0.68)] sm:block" />
                  ) : null}
                  <Icon aria-hidden="true" className="size-6 shrink-0 text-smart-gold-light" strokeWidth={1.65} />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.26}>
            <div className="mt-9">
              <Image
                alt={heroCopy.academicTagline}
                className="h-auto w-[min(760px,88vw)] object-contain object-left drop-shadow-[0_8px_22px_rgba(0,0,0,0.28)]"
                height={360}
                src="/assets/brand/hero-medicina-academica.svg"
                unoptimized
                width={2400}
              />
            </div>
          </Reveal>
        </div>
      </div>
      <WaveSeparator fill="cream" />
    </section>
  );
}
