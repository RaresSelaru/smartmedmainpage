import { DestinationCard } from "@/components/cards/destination-card";
import { Reveal } from "@/components/animations/reveal";
import { SectionShell } from "@/components/ui/section-shell";
import { destinationCards } from "@/lib/site-config";

export function DestinationGridSection() {
  return (
    <SectionShell id="planuri">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <p className="text-sm font-semibold uppercase text-smart-gold">
            Alege planul personalizat care ți se potrivește
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-[1.12] text-smart-navy sm:text-5xl">
            Un ecosistem SmartMed, nu doar o pagină de prezentare
          </h2>
          <p className="mt-5 text-base leading-7 text-smart-ink/68">
            Fiecare zonă are propria rută și structură, pregătită pentru conținut,
            conturi, acces premium și dezvoltare graduală.
          </p>
        </Reveal>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {destinationCards.map((card, index) => (
          <Reveal delay={index * 0.035} key={card.href}>
            <DestinationCard card={card} />
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
