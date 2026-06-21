import Image from "next/image";

import { Reveal } from "@/components/animations/reveal";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function FinalCTASection() {
  return (
    <section className="relative isolate overflow-hidden bg-smart-cream px-5 py-20 text-smart-ink sm:px-7 lg:px-8">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 mx-auto h-px max-w-3xl bg-gradient-to-r from-transparent via-smart-gold/45 to-transparent"
      />
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_0.8fr_0.9fr]">
        <Reveal>
          <div className="mx-auto max-w-md text-center">
            <blockquote className="font-serif text-2xl italic leading-9 text-smart-ink/82 sm:text-3xl">
              &ldquo;Succesul nu vine din ceea ce faci din când în când, ci din ceea ce
              faci în mod constant.&rdquo;
            </blockquote>
            <p className="mt-6 font-serif text-3xl italic text-smart-teal">
              SmartMed Academy
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="relative mx-auto w-full max-w-md">
            <Image
              alt="Student SmartMed creându-și contul în platformă"
              className="h-auto w-full object-contain drop-shadow-[0_28px_52px_rgba(3,17,28,0.18)]"
              height={1235}
              sizes="(max-width: 1024px) 82vw, 420px"
              src="/assets/generated/smartmed-account-statue.png"
              width={1393}
            />
          </div>
        </Reveal>
        <Reveal delay={0.16}>
          <div className="text-left lg:text-center">
            <SectionLabel tone="cream">Cont SmartMed</SectionLabel>
            <h2 className="mt-3 font-serif text-5xl font-semibold leading-none tracking-[-0.025em] sm:text-6xl">
              Creează-ți contul SmartMed
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base font-semibold leading-8 text-smart-ink/70">
              Intră în platformă, urmărește-ți progresul și începe pregătirea într-un singur loc.
            </p>
            <div className="mt-8 flex lg:justify-center">
              <PremiumButton href="/cont">Creează cont</PremiumButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
