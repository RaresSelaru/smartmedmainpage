import Image from "next/image";

import { Reveal } from "@/components/animations/reveal";
import { AnimatedAdmissionYear } from "@/components/home/animated-admission-year";
import {
  PreparationSystemSection,
  sectionEyebrowClassName,
} from "@/components/home/PreparationSystemSection";

const admissionClassPlans = [
  {
    roman: "X",
    label: "a X-a",
    caption: "Începi devreme",
    romanClassName: "text-[2.55rem] sm:text-[3.05rem] md:text-[2.65rem] lg:text-[3.05rem]",
  },
  {
    roman: "XI",
    label: "a XI-a",
    caption: "Accelerezi progresul",
    romanClassName: "text-[2.42rem] sm:text-[2.9rem] md:text-[2.52rem] lg:text-[2.9rem]",
  },
  {
    roman: "XII",
    label: "a XII-a",
    caption: "Te pregătești pentru examen",
    romanClassName: "text-[2.12rem] sm:text-[2.48rem] md:text-[2.24rem] lg:text-[2.48rem]",
  },
] as const;

export function AcademicCreationSection() {
  return (
    <section
      aria-labelledby="academic-creation-heading"
      className="relative isolate overflow-hidden bg-smart-cream px-5 pb-20 pt-16 text-smart-ink sm:px-7 sm:pb-24 sm:pt-20 lg:px-8"
    >
      <div className="pointer-events-none absolute inset-0 opacity-55 [background-image:radial-gradient(circle_at_18%_18%,rgba(31,111,120,0.09),transparent_28%),radial-gradient(circle_at_84%_24%,rgba(200,168,117,0.14),transparent_30%)]" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <PreparationSystemSection />

        <Reveal>
          <div className="mx-auto mt-10 max-w-5xl text-center sm:mt-14">
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

        <Reveal delay={0.08}>
          <div className="relative left-1/2 mt-14 w-screen -translate-x-1/2 sm:mt-16 lg:mt-20">
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

        <Reveal delay={0.14}>
          <div className="mx-auto mt-8 max-w-6xl text-center sm:mt-10">
            <AnimatedAdmissionYear className="font-serif text-[86px] font-semibold italic leading-none tracking-[0.04em] text-smart-ink sm:text-8xl lg:text-[8rem]" />
            <div
              aria-hidden="true"
              className="mx-auto mt-8 flex w-full max-w-4xl items-center justify-center gap-4 text-smart-gold sm:mt-9 sm:gap-5"
            >
              <span className="h-px flex-1 bg-smart-gold/58" />
              <span className="size-3 rotate-45 rounded-[2px] bg-smart-gold/78" />
              <span className="h-px flex-1 bg-smart-gold/58" />
            </div>
            <p className="mt-7 text-base font-extrabold uppercase tracking-[0.32em] text-smart-ink sm:text-lg sm:tracking-[0.5em] lg:text-xl">
              ALEGE MOMENTUL POTRIVIT SĂ ÎNCEPI
            </p>

            <div className="mx-auto mt-10 grid max-w-[64rem] gap-8 md:grid-cols-3 md:gap-5 lg:mt-12 lg:gap-6">
              {admissionClassPlans.map(({ roman, label, caption, romanClassName }) => (
                <div className="text-center" key={label}>
                  <div className="mx-auto flex w-full max-w-[15rem] items-center justify-between gap-3 rounded-full border border-smart-gold/62 bg-[linear-gradient(180deg,#fffaf2_0%,#f5ecdd_100%)] py-2.5 pl-5 pr-2.5 shadow-[0_16px_38px_rgba(61,42,18,0.11),inset_0_1px_0_rgba(255,255,255,0.9)] sm:max-w-[15.25rem] md:max-w-[15rem] lg:max-w-[15.25rem]">
                    <span className="font-serif text-[2.35rem] font-semibold leading-none tracking-[-0.025em] text-smart-ink sm:text-[2.75rem] md:text-[2.35rem] lg:text-[2.75rem]">
                      Clasa
                    </span>
                    <span
                      aria-label={`clasa ${label}`}
                      className="relative flex size-20 shrink-0 items-center justify-center rounded-full border-[5px] border-smart-gold bg-smart-ink text-smart-gold-light shadow-[0_10px_24px_rgba(3,17,28,0.18),inset_0_0_0_2px_rgba(255,255,255,0.12),inset_0_0_28px_rgba(200,168,117,0.22)] sm:size-24 md:size-[5.25rem] lg:size-24"
                    >
                      <span aria-hidden="true" className="absolute left-[13%] top-1/2 -translate-y-[42%] font-serif text-[0.78rem] font-semibold italic leading-none sm:text-[0.95rem] md:text-[0.82rem] lg:text-[0.95rem]">
                        a
                      </span>
                      <span
                        aria-hidden="true"
                        className={`font-serif font-semibold leading-none tracking-[-0.055em] ${romanClassName}`}
                      >
                        {roman}
                      </span>
                      <span aria-hidden="true" className="absolute right-[8%] top-1/2 -translate-y-[42%] font-serif text-[0.78rem] font-semibold italic leading-none sm:text-[0.95rem] md:text-[0.82rem] lg:text-[0.95rem]">
                        -a
                      </span>
                    </span>
                  </div>
                  <p className="mt-5 font-serif text-[2rem] font-semibold leading-[0.95] tracking-normal text-smart-ink sm:text-[2.25rem]">
                    {caption}
                  </p>
                </div>
              ))}
            </div>

            <p className="relative left-1/2 mt-10 w-[calc(100vw-2.5rem)] -translate-x-1/2 text-center sm:mt-12 sm:w-[calc(100vw-3.5rem)] lg:w-[calc(100vw-4rem)]">
              <span className={`${sectionEyebrowClassName} inline-block whitespace-normal`}>
                PLANURI DE PREGĂTIRE PENTRU CLASA A X-A, A XI-A ȘI A XII-A
              </span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
