import Image from "next/image";
import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";

import { Reveal } from "@/components/animations/reveal";

import styles from "./PreparationSystemSection.module.css";

const preparationSteps = [
  {
    title: "Înveți cu medici",
    description:
      "Cursuri complete și structurate, susținute de medici cu experiență în predare și în examen",
    image: "/images/offer-steps/doctor.png",
  },
  {
    title: "Exersezi pe grile",
    description:
      "Mii de grile explicate pas cu pas, organizate pe capitole și niveluri, pentru a-ți consolida cunoștințele",
    image: "/images/offer-steps/grile.png",
  },
  {
    title: "Simulări continue",
    keepTitleOnOneLine: true,
    description:
      "Simulări în format fizic care reproduc fidel condițiile de examen adaptate în funcție de centrul universitar",
    image: "/images/offer-steps/simulation-physical.png",
  },
  {
    title: "Feedback constant",
    keepTitleOnOneLine: true,
    description:
      "Analiză personalizată, recomandări, urmărirea progresului tău în platformă și grafice de evoluție",
    image: "/images/offer-steps/progress.png",
  },
] as const;

export const sectionEyebrowClassName =
  "mx-auto max-w-none text-[22px] font-extrabold uppercase tracking-[0.22em] text-smart-gold mr-[-0.22em] sm:tracking-[0.38em] sm:mr-[-0.38em] lg:text-[20px] lg:tracking-[0.50em] lg:mr-[-0.5em]";

function StepConnector({ index }: { index: number }) {
  const markerId = `preparation-path-arrow-${index}`;

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-[calc(50%+4.7rem)] top-[44px] z-0 hidden h-20 w-[calc(100%+2.2rem-9.4rem)] text-[#cda766] lg:left-[calc(50%+4.25rem)] lg:top-[40px] lg:block lg:w-[calc(100%+2.2rem-8.5rem)]"
      fill="none"
      preserveAspectRatio="none"
      viewBox="0 0 320 80"
    >
      <defs>
        <marker
          id={markerId}
          markerHeight="7"
          markerWidth="8"
          orient="auto"
          refX="7"
          refY="3.5"
          viewBox="0 0 8 7"
        >
          <path d="M0 0.8L7 3.5L0 6.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      <path
        d="M0 40 C 72 10, 140 70, 212 40 S 280 16, 314 40"
        markerEnd={`url(#${markerId})`}
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.15"
      />
    </svg>
  );
}

export function PreparationSystemSection() {
  return (
    <section
      aria-labelledby="preparation-system-heading"
      className="relative overflow-hidden pt-2 text-smart-ink"
    >
      <Reveal>
        <div className="mx-auto max-w-5xl text-center">
          <p className={sectionEyebrowClassName}>MAI MULT DECÂT MEDITAȚII</p>
          <h2
            className="mx-auto mt-5 max-w-[340px] font-serif text-[34px] font-semibold leading-[1.02] tracking-normal text-smart-ink sm:max-w-5xl sm:text-6xl sm:leading-[0.96] lg:mt-4 lg:text-[64px]"
            id="preparation-system-heading"
          >
            Un sistem complet de pregătire,
            <br />
            nu doar meditații
          </h2>
          <p className="mx-auto mt-5 max-w-[340px] text-base leading-8 text-smart-ink/68 sm:max-w-[960px] sm:text-lg">
            <span className="lg:whitespace-nowrap">
              SmartMed Academy îți oferă o strategie completă, gândită pas cu pas pentru a te ajuta să
              reușești la Medicină
            </span>
          </p>
          <p className={`${sectionEyebrowClassName} mt-6 lg:mt-5`}>DETALIILE FAC DIFERENȚA</p>
        </div>
      </Reveal>

      <div className="relative mx-auto mt-14 max-w-7xl sm:mt-16 lg:mt-14">
        <div className="relative z-10 grid gap-12 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-14 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-12">
          {preparationSteps.map((step, index) => {
            const { title, description, image } = step;
            const keepTitleOnOneLine =
              "keepTitleOnOneLine" in step && step.keepTitleOnOneLine === true;

            return (
            <Reveal delay={0.06 + index * 0.04} key={title}>
              <div className="relative flex min-h-full flex-col items-center text-center">
                {index < preparationSteps.length - 1 ? <StepConnector index={index} /> : null}
                <div className="relative">
                  <span className="absolute left-1 top-1 z-20 flex size-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,#dfc17e_0%,#bd9558_100%)] text-base font-extrabold text-white shadow-[0_10px_22px_rgba(153,111,43,0.24)] sm:left-0 sm:top-0">
                    {index + 1}
                  </span>
                  <span className="relative z-10 flex size-[142px] items-center justify-center rounded-full border-[2px] border-smart-gold/60 bg-[#fbf3e3]/78 shadow-[0_14px_34px_rgba(130,95,42,0.10),inset_0_1px_0_rgba(255,255,255,0.84)] sm:size-[150px] lg:size-[136px]">
                    <Image
                      alt=""
                      aria-hidden="true"
                      className="size-[88%] object-contain"
                      height={512}
                      src={image}
                      width={512}
                    />
                  </span>
                </div>
                <h3
                  className={`mt-6 font-serif text-[2rem] font-semibold leading-[0.95] text-smart-ink sm:text-[2.25rem] lg:mt-5 lg:text-[2rem] ${keepTitleOnOneLine ? "max-w-none whitespace-nowrap" : "max-w-[250px]"}`}
                >
                  {title}
                </h3>
                <p className="mt-4 max-w-[280px] text-sm leading-7 text-smart-ink/70">
                  {description}
                </p>
              </div>
            </Reveal>
            );
          })}
        </div>
      </div>

      <Reveal delay={0.24}>
        <div className="relative mx-auto mt-14 max-w-7xl overflow-hidden rounded-[34px] border border-smart-aqua/35 bg-[linear-gradient(118deg,#216f79_0%,#287e88_56%,#338b95_100%)] px-6 py-9 text-smart-white shadow-[0_24px_64px_rgba(31,111,120,0.25)] sm:mt-16 sm:px-11 sm:py-11 lg:mt-14 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-10 lg:py-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-28 size-72 rounded-full border border-smart-aqua/25 bg-smart-aqua/12"
          />
          <div className="relative max-w-3xl text-center lg:text-left">
            <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-smart-gold-light">
              Următorul pas
            </p>
            <h3 className="mt-3 font-serif text-[2.1rem] font-semibold leading-[0.98] sm:text-5xl lg:text-[44px]">
              Transformă planul într-un ritm care te duce la Medicină
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-smart-white/72 sm:text-base lg:mx-0">
              Spune-ne unde ești acum, iar echipa SmartMed îți recomandă traseul de pregătire potrivit pentru tine.
            </p>
          </div>
          <Link
            className={`${styles.enrollmentButton} group relative mx-auto mt-8 inline-flex min-h-16 w-full max-w-[380px] shrink-0 items-center justify-center gap-4 rounded-full border border-smart-gold-light/65 bg-[linear-gradient(180deg,#f3daa3_0%,#d8ae69_100%)] px-9 text-base font-extrabold text-smart-abyss shadow-[0_18px_42px_rgba(213,173,107,0.30),inset_0_1px_0_rgba(255,255,255,0.68)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(213,173,107,0.42),inset_0_1px_0_rgba(255,255,255,0.76)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold lg:mx-0 lg:mt-0 lg:w-auto lg:min-w-[320px]`}
            href="/#abonamente"
          >
            <GraduationCap aria-hidden="true" className="size-6" strokeWidth={1.8} />
            Înscrie-te la centru
            <ArrowRight
              aria-hidden="true"
              className="size-6 transition-transform duration-300 group-hover:translate-x-1"
              strokeWidth={1.8}
            />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
