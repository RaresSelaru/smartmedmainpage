import Image from "next/image";

import { Reveal } from "@/components/animations/reveal";
import {
  AdmissionParchmentCard,
  type AdmissionParchmentCardProps,
} from "@/components/home/admission-parchment-card";
import { AnimatedAdmissionYear } from "@/components/home/animated-admission-year";
import {
  PreparationSystemSection,
  sectionEyebrowClassName,
} from "@/components/home/PreparationSystemSection";
import { OrnamentalDivider } from "@/components/ui/OrnamentalDivider";

import parchmentStyles from "./admission-parchment-card.module.css";

const admissionPlans = [
  {
    grade: "Clasa a X-a",
    title: "Începi devreme",
    description:
      "Începe din clasa a X-a și construiește fundația pentru performanță. Parcurgem împreună bazele solide ale materiei și formăm obiceiuri corecte de învățare care te vor susține în anii următori.",
    ctaLabel: "Înscrie-te",
    href: "/contact",
  },
  {
    grade: "Clasa a XI-a",
    title: "Accelerezi progresul",
    description:
      "În clasa a XI-a aprofundăm și consolidăm cunoștințele, dezvoltăm gândirea analitică și învățăm să organizăm eficient studiul pentru a face pasul spre performanță în mod constant.",
    ctaLabel: "Înscrie-te",
    href: "/contact",
  },
  {
    grade: "Clasa a XII-a",
    title: "Te pregătești pentru examen",
    description:
      "În clasa a XII-a ne concentrăm 100% pe obiectivul final. Îți oferim strategia, exercițiul și încrederea necesare pentru a aborda examenul cu claritate, calm și rezultate care te reprezintă.",
    ctaLabel: "Înscrie-te",
    href: "/contact",
  },
] satisfies ReadonlyArray<AdmissionParchmentCardProps>;

export function AcademicCreationSection() {
  return (
    <section
      aria-labelledby="academic-creation-heading"
      className="relative isolate overflow-hidden bg-smart-cream px-5 pb-14 pt-16 text-smart-ink sm:px-7 sm:pb-16 sm:pt-20 lg:px-8 lg:pb-18"
    >
      <div className="pointer-events-none absolute inset-0 opacity-55 [background-image:radial-gradient(circle_at_18%_18%,rgba(31,111,120,0.09),transparent_28%),radial-gradient(circle_at_84%_24%,rgba(200,168,117,0.14),transparent_30%)]" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <PreparationSystemSection />
        <OrnamentalDivider className="my-14 sm:my-16 lg:my-18" />

        <Reveal>
          <div className="mx-auto max-w-5xl text-center">
            <p className="relative left-1/2 w-[calc(100vw-2.5rem)] -translate-x-1/2 text-center sm:w-[calc(100vw-3.5rem)] lg:w-[calc(100vw-4rem)]">
              <span className={`${sectionEyebrowClassName} inline-block whitespace-nowrap`}>
                O admitere reușită la buget începe cu o pregătire potrivită la
              </span>
            </p>
            <h2
              className="mt-6 inline-flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-[42px] leading-none text-smart-ink sm:mt-8 sm:text-6xl lg:text-7xl"
              id="academic-creation-heading"
            >
              <span className="inline-block font-serif font-bold italic tracking-[0.02em]">
                SMARTMED
              </span>
              <span className="font-[family-name:var(--font-script)] font-normal tracking-[0.08em] sm:text-[46px] lg:text-[46px]">
                Academy
              </span>
            </h2>
            <p className="relative left-1/2 mt-7 w-[calc(100vw-2.5rem)] max-w-[1300px] -translate-x-1/2 font-serif text-[30px] font-semibold italic leading-[1.08] text-smart-ink sm:mt-9 sm:text-[30px] lg:text-[36px]">
              &ldquo;Succesul nu vine din ceea ce faci din când în când, ci din ceea ce faci în mod constant
              <br />
              Într-o zi îți vei mulțumi ție însuți pentru că nu ai renunțat&rdquo;
            </p>
          </div>
        </Reveal>

        <OrnamentalDivider className="my-14 sm:my-16 lg:my-18" />

        <Reveal delay={0.08}>
          <div className="relative left-1/2 w-screen -translate-x-1/2">
            <Image
              alt="SmartMed Academy, succesul prin constanță, admiterea 2027, pregătire cu medici"
              className="h-auto w-full object-contain object-center"
              height={735}
              priority={false}
              sizes="100vw"
              src="/assets/generated/smartmed-academy-creation.svg"
              unoptimized
              width={1425}
            />
          </div>
        </Reveal>

        <OrnamentalDivider className="my-14 sm:my-16 lg:my-18" />

        <Reveal delay={0.14}>
          <div className="mx-auto max-w-6xl text-center">
            <AnimatedAdmissionYear className="font-serif text-[86px] font-semibold italic leading-none tracking-[0.04em] text-smart-ink sm:text-8xl lg:text-[8rem]" />
            <p className="mt-5 text-base font-extrabold uppercase tracking-[0.32em] text-smart-ink sm:mt-6 sm:text-lg sm:tracking-[0.5em] lg:text-xl">
              ALEGE MOMENTUL POTRIVIT SĂ ÎNCEPI
            </p>

            <div className={`${parchmentStyles.grid} mt-10 lg:mt-12`}>
              {admissionPlans.map((plan) => (
                <AdmissionParchmentCard {...plan} key={plan.grade} />
              ))}
            </div>

            <p className="relative left-1/2 mt-10 w-[calc(100vw-2.5rem)] -translate-x-1/2 text-center sm:mt-12 sm:w-[calc(100vw-3.5rem)] lg:w-[calc(100vw-4rem)]">
              <span className={`${sectionEyebrowClassName} inline-block whitespace-normal`}>
                PLANURI DE PREGĂTIRE PENTRU CLASA A X-A, A XI-A ȘI A XII-A
              </span>
            </p>
          </div>
        </Reveal>

        <OrnamentalDivider className="mt-14 sm:mt-16 lg:mt-18" />
      </div>
    </section>
  );
}
