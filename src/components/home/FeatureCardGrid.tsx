import { GraduationCap } from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import { cn } from "@/lib/utils";

type TealBreakSectionProps = {
  variant?: "heading" | "compact";
};

export function TealBreakSection({ variant = "heading" }: TealBreakSectionProps) {
  const isHeading = variant === "heading";

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden bg-smart-teal px-5 text-smart-white sm:px-7 lg:px-8",
        isHeading ? "pb-44 pt-28" : "pb-36 pt-20",
      )}
    >
      <div className="grain-overlay" />
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {isHeading ? (
          <>
            <Reveal>
              <SectionLabel>Resurse SmartMed</SectionLabel>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-3 font-serif text-5xl font-semibold leading-none tracking-[-0.025em] sm:text-6xl">
                Tot ce ai nevoie, la un click distanță
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-4 text-base leading-8 text-smart-white/74 sm:text-lg">
                Resurse esențiale pentru o pregătire completă și eficientă. Continuă scroll-ul
                să descoperi fiecare zonă a SmartMed.
              </p>
            </Reveal>
          </>
        ) : (
          <>
            <Reveal>
              <span className="mx-auto inline-flex size-20 items-center justify-center rounded-full border border-smart-gold/40 bg-smart-abyss/40 text-smart-gold-light shadow-[0_18px_50px_rgba(3,17,28,0.28)]">
                <GraduationCap aria-hidden="true" className="size-9" strokeWidth={1.5} />
              </span>
            </Reveal>
            <Reveal delay={0.06}>
              <p className="mt-6 font-serif text-3xl italic leading-[1.25] text-smart-white/92 sm:text-4xl">
                Pregătirea constantă transformă ambiția în rezultate.
              </p>
            </Reveal>
            <Reveal delay={0.12}>
              <SectionLabel className="mt-6 inline-block text-smart-gold-light">
                Excelență în educație medicală
              </SectionLabel>
            </Reveal>
          </>
        )}
      </div>
      <WaveSeparator fill="cream" />
    </section>
  );
}

export function FeatureCardGrid() {
  return <TealBreakSection variant="heading" />;
}
