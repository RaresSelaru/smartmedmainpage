import Image from "next/image";

import { Reveal } from "@/components/animations/reveal";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import { generatedAssets } from "@/lib/site-config";

export function HeroSection() {
  return (
    <section
      className="relative isolate min-h-[780px] overflow-hidden bg-smart-dark px-5 pb-36 pt-28 text-smart-white sm:min-h-[820px] sm:px-7 sm:pb-44 sm:pt-32 lg:px-8"
      data-home-hero="true"
    >
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_82%_18%,rgba(156,206,208,0.20),transparent_38%),radial-gradient(circle_at_12%_28%,rgba(200,168,117,0.10),transparent_30%),linear-gradient(135deg,#03111c_0%,#071b29_48%,#061622_100%)]" />
      <div className="hero-neural-layer pointer-events-none absolute inset-0 z-[2] hidden lg:block">
        <Image
          alt=""
          className="object-cover object-top [object-position:68%_0%]"
          fill
          loading="eager"
          priority
          sizes="100vw"
          src={generatedAssets.heroNeural}
        />
        <div aria-hidden="true" className="hero-neural-overlay absolute inset-0" />
      </div>
      <div className="hero-copy-scrim" />
      <div className="grain-overlay z-[4]" />
      <div className="relative z-10 mx-auto flex max-w-7xl items-center py-8 sm:py-10 lg:min-h-[510px]">
        <div className="flex w-full min-w-0 max-w-[320px] flex-col items-center gap-0.5 text-center sm:max-w-[540px] sm:gap-1 lg:max-w-[560px]">
          <Reveal>
            <Image
              alt="SmartMed"
              className="mx-auto h-32 w-32 object-contain drop-shadow-[0_22px_54px_rgba(156,206,208,0.20)] sm:h-36 sm:w-36 lg:h-60 lg:w-60"
              height={160}
              priority
              src="/assets/brand/smartmed-logo-mark.svg"
              width={160}
            />
          </Reveal>
          <Reveal delay={0.08}>
            <div className="-mt-0.5 inline-flex w-max max-w-full -translate-x-3 flex-col items-center gap-0.5 text-center sm:-mt-1 sm:-translate-x-5 sm:gap-1 lg:-translate-x-6">
              <h1 className="flex flex-col items-center gap-0.5 font-serif text-[36px] font-semibold leading-[0.92] tracking-normal text-smart-white sm:gap-1 sm:text-[50px] sm:leading-[0.9] lg:text-[66px]">
                <span className="whitespace-nowrap">Intră la</span>
                <div className="flex flex-col items-center gap-0 leading-none">
                  <span className="whitespace-nowrap">Medicină</span>
                  <span className="-mt-1 whitespace-nowrap text-[1em] sm:-mt-1.5">cu</span>
                </div>
              </h1>
              <span className="mt-2 inline-flex whitespace-nowrap px-4 py-1 font-serif text-[36px] font-bold leading-none text-smart-gold drop-shadow-[0_2px_14px_rgba(3,17,28,0.28)] sm:mt-2.5 sm:px-6 sm:py-1.5 sm:text-[50px] lg:text-[86px]">
                SMARTMED
              </span>
              <Image
                alt="Medicină academică"
                className="mt-3.5 h-[28px] w-auto object-contain object-center sm:mt-3 sm:h-[38px] lg:h-[100px]"
                height={360}
                src="/assets/brand/hero-medicina-academica.svg"
                unoptimized
                width={2400}
              />
            </div>
          </Reveal>
        </div>
      </div>
      <WaveSeparator fill="cream" />
    </section>
  );
}
