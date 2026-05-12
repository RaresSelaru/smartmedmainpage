import { ParallaxHands } from "@/components/animations/parallax-hands";
import { Reveal } from "@/components/animations/reveal";
import { SectionShell } from "@/components/ui/section-shell";

export function SmartMessageSection() {
  return (
    <SectionShell className="border-y border-smart-navy/8" tone="cream">
      <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <p className="text-sm font-semibold uppercase text-smart-gold">
            Ritm, grijă, standard
          </p>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-[1.12] text-smart-navy sm:text-5xl">
            O admitere reușită la buget începe cu o pregătire potrivită la
            SmartMed Academy
          </h2>
          <blockquote className="mt-7 border-l-2 border-smart-gold/60 pl-5 text-base leading-7 text-smart-ink/70 sm:text-lg">
            “Succesul nu vine din ceea ce faci din când în când, ci din ceea ce
            faci în mod constant.”
          </blockquote>
        </Reveal>

        <Reveal delay={0.1}>
          <ParallaxHands />
        </Reveal>
      </div>
    </SectionShell>
  );
}
