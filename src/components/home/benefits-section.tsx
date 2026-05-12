import { InfoCard } from "@/components/cards/info-card";
import { Reveal } from "@/components/animations/reveal";
import { SectionShell } from "@/components/ui/section-shell";
import { smartBenefits } from "@/lib/site-config";

export function BenefitsSection() {
  return (
    <SectionShell className="border-y border-smart-navy/8" tone="cyan">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <Reveal>
          <p className="text-sm font-semibold uppercase text-smart-gold">
            De ce SmartMed
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-[1.12] text-smart-navy sm:text-5xl">
            Pregătire disciplinată, dar cu o experiență care te ține aproape
          </h2>
          <p className="mt-5 text-base leading-7 text-smart-ink/68">
            Structura inițială lasă loc pentru tot ce urmează: lecții online,
            grile, simulări, shop, blog, automatizări și dashboard-uri.
          </p>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2">
          {smartBenefits.map((benefit, index) => (
            <Reveal delay={index * 0.05} key={benefit.title}>
              <InfoCard {...benefit} />
            </Reveal>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
