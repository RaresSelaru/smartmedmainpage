import { HeartPulse } from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { VideoTeaser } from "@/components/home/video-teaser";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionShell } from "@/components/ui/section-shell";
import { homeStats, siteConfig } from "@/lib/site-config";

export function HeroSection() {
  return (
    <SectionShell
      className="overflow-hidden pb-16 pt-32 sm:pb-20 sm:pt-36"
      innerClassName="grid min-h-[86svh] items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]"
    >
      <div className="relative z-10">
        <Reveal>
          <div className="inline-flex items-center gap-3 rounded-md border border-smart-gold/35 bg-white/64 px-3 py-2 text-sm font-medium text-smart-navy shadow-[0_14px_36px_rgba(13,23,38,0.06)] backdrop-blur-md">
            <HeartPulse aria-hidden="true" className="size-4 text-smart-gold" />
            {siteConfig.fullName}
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[1.04] text-smart-ink sm:text-6xl lg:text-7xl">
            Intră la Medicină cu SmartMed
          </h1>
        </Reveal>
        <Reveal delay={0.14}>
          <p className="mt-6 max-w-2xl text-xl font-medium leading-8 text-smart-navy">
            Educație medicală la standarde înalte.
          </p>
          <p className="mt-4 max-w-2xl text-base leading-7 text-smart-ink/68 sm:text-lg">
            Exigență, Excelență și Experiență în pregătirea pentru Medicină,
            într-un ecosistem construit pentru cursuri, grile, simulări și progres
            real.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/centru-online">Alege planul potrivit</ButtonLink>
            <ButtonLink href="/despre" variant="secondary">
              Descoperă SmartMed
            </ButtonLink>
            <ButtonLink href="/cont" variant="ghost">
              Intră în platformă
            </ButtonLink>
          </div>
        </Reveal>
        <Reveal delay={0.26}>
          <dl className="mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {homeStats.map((item) => (
              <div
                className="rounded-lg border border-smart-navy/10 bg-white/58 p-4 backdrop-blur-md"
                key={item.label}
              >
                <dt className="text-sm leading-5 text-smart-ink/56">{item.label}</dt>
                <dd className="mt-2 text-2xl font-semibold text-smart-navy">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>

      <Reveal className="relative z-10" delay={0.12} y={28}>
        <VideoTeaser />
      </Reveal>
    </SectionShell>
  );
}
