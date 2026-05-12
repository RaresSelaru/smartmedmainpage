import { Reveal } from "@/components/animations/reveal";
import { GlassCard } from "@/components/ui/GlassCard";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SmartIcon } from "@/components/ui/SmartIcon";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import type { PageScaffold } from "@/lib/site-config";

type PageShellProps = {
  page: PageScaffold;
  children?: ReactNode;
  variant?: "standard" | "online" | "grile";
};

export function PageShell({ page, children, variant = "standard" }: PageShellProps) {
  return (
    <>
      <section className="relative isolate min-h-[620px] overflow-hidden bg-smart-dark px-5 pb-44 pt-32 text-smart-white sm:px-7 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(156,206,208,0.28),transparent_34%),radial-gradient(circle_at_18%_12%,rgba(200,168,117,0.12),transparent_28%),linear-gradient(135deg,#03111c_0%,#071b29_54%,#061622_100%)]" />
        <div className="absolute right-[-12%] top-10 h-[520px] w-[520px] rounded-full border border-smart-aqua/16" />
        <div className="absolute left-[-8%] bottom-10 h-[420px] w-[420px] rounded-full bg-smart-teal/18 blur-3xl" />
        <div className="grain-overlay" />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <Reveal>
            <SectionLabel>{page.eyebrow}</SectionLabel>
            <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold leading-[0.96] tracking-[-0.03em] sm:text-7xl lg:text-8xl">
              {page.title}
            </h1>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="max-w-2xl text-base leading-8 text-smart-muted sm:text-lg">
              {page.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PremiumButton href={page.primaryCta.href}>{page.primaryCta.label}</PremiumButton>
              {page.secondaryCta ? (
                <PremiumButton href={page.secondaryCta.href} variant="outline">
                  {page.secondaryCta.label}
                </PremiumButton>
              ) : null}
            </div>
          </Reveal>
        </div>
        <WaveSeparator fill="cream" />
      </section>

      {children ?? (
        <>
          <section className="relative overflow-hidden bg-smart-cream px-5 py-20 text-smart-ink sm:px-7 lg:px-8">
            <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
              {page.highlights.map((item, index) => (
                <Reveal delay={index * 0.05} key={item.title}>
                  <GlassCard className="h-full border-smart-abyss/10 bg-white/55 p-7 text-smart-ink shadow-[0_20px_58px_rgba(3,17,28,0.12)]">
                    <span className="flex size-12 items-center justify-center rounded-full border border-smart-gold/40 bg-smart-cream-deep text-smart-teal">
                      <SmartIcon name={item.icon} />
                    </span>
                    <h2 className="mt-6 font-serif text-3xl font-semibold leading-none">
                      {item.title}
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-smart-ink/68">
                      {item.description}
                    </p>
                  </GlassCard>
                </Reveal>
              ))}
            </div>
            <WaveSeparator fill="teal" />
          </section>

          <section className="relative overflow-hidden bg-smart-teal px-5 pb-44 pt-24 text-smart-white sm:px-7 lg:px-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(156,206,208,0.22),transparent_30%),linear-gradient(135deg,#1f6f78,#0d4351_72%)]" />
            <div className="grain-overlay" />
            <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <Reveal>
                <SectionLabel>Roadmap</SectionLabel>
                <h2 className="mt-4 font-serif text-5xl font-semibold leading-none sm:text-6xl">
                  Pregătit pentru etapa următoare
                </h2>
              </Reveal>
              <Reveal delay={0.08}>
                <GlassCard className="p-7">
                  <div className="flex items-center gap-3">
                    <span className="flex size-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-smart-aqua">
                      <SmartIcon name={variant === "grile" ? "arrow-up-right" : "shield"} />
                    </span>
                    <div>
                      <h3 className="font-serif text-3xl font-semibold">
                        Structură extensibilă
                      </h3>
                      <p className="text-sm text-smart-muted">
                        Sloturi clare pentru auth, CMS, plăți și dashboard.
                      </p>
                    </div>
                  </div>
                  <ul className="mt-7 grid gap-3">
                    {page.roadmap.map((item) => (
                      <li
                        className="flex gap-3 border-t border-white/12 pt-3 text-sm leading-7 text-smart-white/78 first:border-t-0 first:pt-0"
                        key={item}
                      >
                        <SmartIcon className="mt-1 size-4 shrink-0 text-smart-gold-light" name="check" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </Reveal>
            </div>
            <WaveSeparator fill="cream" />
          </section>

          <section className="bg-smart-cream px-5 py-20 text-smart-ink sm:px-7 lg:px-8">
            <Reveal>
              <div className="mx-auto max-w-4xl text-center">
                <SectionLabel tone="cream">Admiterea 2026</SectionLabel>
                <h2 className="mt-4 font-serif text-5xl font-semibold leading-none sm:text-6xl">
                  Pregătire cu medici, într-un ecosistem care crește cu tine
                </h2>
                <div className="mt-8 flex justify-center">
                  <PremiumButton href="/contact">Începe acum pregătirea</PremiumButton>
                </div>
              </div>
            </Reveal>
          </section>
        </>
      )}
    </>
  );
}
import type { ReactNode } from "react";
