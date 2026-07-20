import Image from "next/image";
import Link from "next/link";
import { BookOpen, GraduationCap } from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { WaveSeparator } from "@/components/ui/WaveSeparator";

export function DisectiaSmartHero() {
  return (
    <section className="relative isolate z-30 min-h-[980px] overflow-hidden bg-smart-abyss px-5 pb-36 pt-32 text-smart-white sm:min-h-[1020px] sm:px-7 sm:pb-44 sm:pt-36 lg:min-h-[1060px] lg:px-8">
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 object-contain object-center opacity-78 sm:opacity-88 lg:opacity-100"
        fill
        priority
        sizes="100vw"
        src="/images/special-modules/disectia-smart/4-disectia-smart-1.png"
      />
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 -z-10 w-[88%] bg-[linear-gradient(90deg,rgba(3,17,28,0.94)_0%,rgba(3,17,28,0.82)_34%,rgba(3,17,28,0.42)_60%,rgba(3,17,28,0.08)_82%,transparent_100%)] sm:w-[76%] lg:w-[56%]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-52 bg-gradient-to-t from-smart-abyss/66 via-smart-abyss/14 to-transparent"
      />
      <div className="grain-overlay z-[1] opacity-[0.08]" />

      <div className="relative z-10 mx-auto flex min-h-[500px] w-full max-w-[1580px] items-center py-8 sm:min-h-[520px] sm:py-10 lg:min-h-[545px]">
        <Reveal className="w-full min-w-0">
          <div className="w-full min-w-0 max-w-[700px]">
            <h1 className="font-serif text-[42px] font-semibold leading-[0.98] tracking-normal text-smart-white drop-shadow-[0_14px_36px_rgba(0,0,0,0.36)] sm:text-[56px] lg:text-[70px] xl:text-[82px] 2xl:text-[90px]">
              <span className="block whitespace-nowrap xl:text-[50px] 2xl:text-[56px]"></span>
              <span className="mt-2 block bg-[linear-gradient(180deg,#f7dfaa_0%,#d7b06e_52%,#b98643_100%)] bg-clip-text text-[50px] font-bold leading-[0.9] text-transparent drop-shadow-[0_10px_28px_rgba(0,0,0,0.26)] sm:text-[82px] lg:text-[100px] xl:text-[108px] 2xl:text-[118px]">
                <span className="inline-block">
                  <span className="block">DISECȚIA</span>
                  <span className="block pl-[1em]">SMART</span>
                  <div
                    aria-hidden="true"
                    className="relative mt-2 h-px w-full bg-gradient-to-r from-transparent via-smart-gold-light/70 to-transparent sm:mt-3"
                  >
                    <span className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-smart-gold-light shadow-[0_0_18px_5px_rgba(215,190,138,0.42)]" />
                  </div>
                </span>
              </span>
            </h1>

            <p className="mt-6 max-w-[620px] font-serif text-[20px] font-medium leading-[1.44] text-smart-white/86 drop-shadow-[0_10px_26px_rgba(0,0,0,0.30)] sm:text-[22px] lg:text-[23px]">
              Descoperă mecanismul fiecărei grile<br></br>
              Construiește gândirea care aduce puncte
            </p>

            <div className="mt-6 flex w-full max-w-[630px] flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                className="group inline-flex min-h-[54px] items-center justify-center gap-3 rounded-xl border border-smart-gold-light/60 bg-[linear-gradient(180deg,#efd39b_0%,#d4aa68_100%)] px-5 py-3 text-[15px] font-extrabold text-smart-abyss shadow-[0_16px_38px_rgba(213,173,107,0.22),inset_0_1px_0_rgba(255,255,255,0.58)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(213,173,107,0.30),inset_0_1px_0_rgba(255,255,255,0.68)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold sm:min-w-[280px]"
                href="#"
              >
                <BookOpen
                  aria-hidden="true"
                  className="size-5 shrink-0 transition duration-300 group-hover:-rotate-3"
                  strokeWidth={1.85}
                />
                <span>Buton placeholder 1</span>
              </Link>
              <Link
                className="group inline-flex min-h-[54px] items-center justify-center gap-3 rounded-xl border border-smart-gold-light/62 bg-smart-abyss/32 px-5 py-3 text-[15px] font-bold text-smart-gold-light shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-smart-gold/10 hover:text-smart-white hover:shadow-[0_16px_38px_rgba(213,173,107,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold sm:min-w-[294px]"
                href="#"
              >
                <GraduationCap
                  aria-hidden="true"
                  className="size-5 shrink-0 transition duration-300 group-hover:rotate-3"
                  strokeWidth={1.85}
                />
                <span>Buton placeholder 2</span>
              </Link>
            </div>
          </div>
        </Reveal>
      </div>

      <WaveSeparator fill="cream" />
    </section>
  );
}
