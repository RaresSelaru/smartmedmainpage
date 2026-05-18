import Image from "next/image";

import { Reveal } from "@/components/animations/reveal";

export function AcademicCreationSection() {
  return (
    <section
      aria-labelledby="academic-creation-heading"
      className="relative isolate overflow-hidden bg-smart-cream px-5 pb-20 pt-16 text-smart-ink sm:px-7 sm:pb-24 sm:pt-20 lg:px-8"
    >
      <div className="pointer-events-none absolute inset-0 opacity-55 [background-image:radial-gradient(circle_at_18%_18%,rgba(31,111,120,0.09),transparent_28%),radial-gradient(circle_at_84%_24%,rgba(200,168,117,0.14),transparent_30%)]" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <Reveal>
          <div className="mx-auto max-w-5xl text-center">
            <p className="relative left-1/2 w-[calc(100vw-2.5rem)] -translate-x-1/2 text-center sm:w-[calc(100vw-3.5rem)] lg:w-[calc(100vw-4rem)]">
              <span className="inline-block whitespace-nowrap text-xs font-bold uppercase tracking-[0.22em] text-smart-gold mr-[-0.22em] sm:text-[18px] sm:tracking-[0.38em] sm:mr-[-0.38em] lg:tracking-[0.50em] lg:mr-[-0.5em]">
                O admitere reușită la buget începe cu o pregătire potrivită la
              </span>
            </p>
            <h2
              className="mt-4 inline-flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-[42px] leading-none text-smart-ink sm:text-6xl lg:text-7xl"
              id="academic-creation-heading"
            >
              <span className="inline-block font-serif font-bold italic tracking-[0.02em]">
                SMARTMED
              </span>
              <span className="font-[family-name:var(--font-script)] font-normal tracking-[0.08em] sm:text-[46px] lg:text-[46px]">
                Academy
              </span>
            </h2>
            <p className="relative left-1/2 mt-5 w-[calc(100vw-2.5rem)] max-w-[1300px] -translate-x-1/2 font-[family-name:var(--font-script)] text-[30px] leading-[1.08] text-smart-teal sm:text-[30px] lg:text-[36px]">
              &ldquo;Succesul nu vine din ceea ce faci din când în când, ci din ceea ce faci în mod constant.
              Într-o zi îți vei mulțumi ție însuți pentru că nu ai renunțat&rdquo;
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="relative left-1/2 mt-10 w-screen -translate-x-1/2 sm:mt-12">
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
          <div className="mx-auto mt-8 max-w-4xl text-center sm:mt-10">
            <p className="font-serif text-[86px] font-semibold italic leading-none tracking-[0.04em] text-smart-ink sm:text-8xl lg:text-[8rem]">
              Admiterea 2027
            </p>
            <p className="mt-4 text-base font-extrabold uppercase tracking-[0.24em] text-smart-teal sm:text-2xl">
              Pregătire cu medici
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
