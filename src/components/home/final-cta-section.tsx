import { Reveal } from "@/components/animations/reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionShell } from "@/components/ui/section-shell";

export function FinalCtaSection() {
  return (
    <SectionShell className="pb-24" tone="deep">
      <Reveal>
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase text-smart-gold">
            Admiterea 2026
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-[1.12] sm:text-5xl">
            Începe pregătirea pentru Medicină cu un sistem construit să crească
            împreună cu tine
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/68">
            Alege centrul online, intră în platforma de grile sau scrie echipei
            pentru detalii despre pregătirea SmartMed.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink className="bg-white text-smart-navy hover:bg-smart-cream" href="/centru-online">
              Centru Online
            </ButtonLink>
            <ButtonLink
              className="border-white/18 bg-white/8 text-white hover:bg-white/14"
              href="/grile"
              variant="secondary"
            >
              Grile SmartMed
            </ButtonLink>
            <ButtonLink
              className="text-white hover:bg-white/10 hover:text-white"
              href="/contact"
              variant="ghost"
            >
              Contact
            </ButtonLink>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}
