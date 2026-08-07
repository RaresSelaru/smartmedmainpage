import { PageShell } from "@/components/layout/PageShell";
import { Reveal } from "@/components/animations/reveal";
import { FinalCTASection } from "@/components/home/FinalCTASection";
import { HorizontalScrollSection } from "@/components/home/HorizontalScrollSection";
import { GlassCard } from "@/components/ui/GlassCard";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { SmartIcon } from "@/components/ui/SmartIcon";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import { newsCarousel, siteConfig, type PageScaffold } from "@/lib/site-config";

const grilePage = {
  eyebrow: "Platforma de antrenament",
  title: "Grile SmartMed",
  description:
    "Exersează organizat, verifică ce ai înțeles și transformă fiecare răspuns într-un pas clar spre admitere.",
  primaryCta: { label: "Intră în platforma de grile", href: "/grile" },
  secondaryCta: { label: "Vezi Centrul Online", href: "/centru-online" },
  highlights: [],
  roadmap: [
    "Grile organizate pe discipline și capitole",
    "Explicații clare pentru consolidarea noțiunilor",
    "Antrenament constant, în ritmul tău",
  ],
} satisfies PageScaffold;

export function GrileReferralPage() {
  const grileUrl =
    process.env.NEXT_PUBLIC_GRILE_URL ?? siteConfig.external.grileFallbackUrl;

  return (
    <>
    <PageShell page={grilePage} variant="grile">
      <section className="relative overflow-hidden bg-smart-cream px-5 py-24 text-smart-ink sm:px-7 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2">
          <Reveal>
            <GlassCard className="h-full border-smart-abyss/10 bg-white/58 p-8 text-smart-ink shadow-[0_20px_58px_rgba(3,17,28,0.12)]">
              <SmartIcon className="size-9 text-smart-teal" name="clipboard" />
              <h2 className="mt-6 font-serif text-4xl font-semibold leading-none">
                Acces rapid la grile
              </h2>
              <p className="mt-4 text-sm leading-7 text-smart-ink/68">
                Deschide platforma SmartMed, alege materia și continuă pregătirea
                cu seturi de grile potrivite obiectivului tău.
              </p>
              <div className="mt-8">
                <PremiumButton href={grileUrl}>Intră în platforma de grile</PremiumButton>
              </div>
            </GlassCard>
          </Reveal>
          <Reveal delay={0.08}>
            <GlassCard className="h-full border-smart-abyss/10 bg-white/58 p-8 text-smart-ink shadow-[0_20px_58px_rgba(3,17,28,0.12)]">
              <SmartIcon className="size-9 text-smart-teal" name="shield" />
              <h2 className="mt-6 font-serif text-4xl font-semibold leading-none">
                Progres construit prin practică
              </h2>
              <p className="mt-4 text-sm leading-7 text-smart-ink/68">
                Folosește fiecare sesiune ca diagnostic: observă tiparele
                greșelilor, revino la noțiunile dificile și măsoară-ți evoluția.
              </p>
              <div className="mt-8">
                <PremiumButton href="/centru-online" variant="cream">
                  Vezi Centrul Online
                </PremiumButton>
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </section>
    </PageShell>
    <div className="relative bg-smart-cream pb-36 sm:pb-48">
      <WaveSeparator fill="teal" variant="relaxed" />
    </div>
    <HorizontalScrollSection
      bottomWave="cream"
      description="Anunțuri oficiale, modificări de calendar, evenimente și actualizări relevante pentru admitere"
      eyebrow="Mereu la curent"
      heading="SMARTMED NEWS"
      items={newsCarousel}
    />
    <FinalCTASection />
    </>
  );
}
