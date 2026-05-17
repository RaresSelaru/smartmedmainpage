import Image from "next/image";

import { Reveal } from "@/components/animations/reveal";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import { generatedAssets } from "@/lib/site-config";

export function HeroSection() {
  return (
    <section className="relative isolate min-h-[780px] overflow-hidden bg-smart-dark px-5 pb-36 pt-28 text-smart-white sm:min-h-[820px] sm:px-7 sm:pb-44 sm:pt-32 lg:px-8">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_82%_18%,rgba(156,206,208,0.20),transparent_38%),radial-gradient(circle_at_12%_28%,rgba(200,168,117,0.10),transparent_30%),linear-gradient(135deg,#03111c_0%,#071b29_48%,#061622_100%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[2] hidden w-[62%] lg:block">
        <div className="absolute bottom-24 right-[-12rem] top-24 w-[min(72vw,1180px)] opacity-90 [mask-image:linear-gradient(90deg,transparent_0%,rgba(0,0,0,0.58)_16%,black_34%,black_82%,transparent_100%)]">
          <Image
            alt=""
            className="object-cover object-center"
            fill
            loading="eager"
            sizes="(min-width: 1024px) 62vw"
            src={generatedAssets.heroNeural}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_32%,rgba(156,206,208,0.24),transparent_34%),radial-gradient(circle_at_76%_58%,rgba(200,168,117,0.16),transparent_28%),linear-gradient(90deg,rgba(3,17,28,0.62)_0%,rgba(6,22,34,0.24)_42%,transparent_74%)]" />
        </div>
      </div>
      <div className="hero-copy-scrim" />
      <div className="grain-overlay z-[4]" />
      <div className="relative z-10 mx-auto flex max-w-7xl items-center py-8 sm:py-10 lg:min-h-[510px]">
        <div className="w-full min-w-0 max-w-[350px] text-center sm:max-w-[620px] lg:max-w-[640px]">
          <Reveal>
            <Image
              alt="SmartMed"
              className="mx-auto h-20 w-20 object-contain drop-shadow-[0_22px_54px_rgba(156,206,208,0.20)] sm:h-24 sm:w-24"
              height={160}
              priority
              src="/assets/brand/smartmed-logo-mark.svg"
              width={160}
            />
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mx-auto mt-5 max-w-[350px] font-serif text-[42px] font-semibold leading-[0.96] tracking-normal text-smart-white sm:max-w-[620px] sm:text-[68px] sm:leading-[0.94] lg:text-[78px]">
              <span className="block">Intră la</span>
              <span className="block">Medicină</span>
              <span className="mt-5 block text-[0.80em] leading-none">cu</span>
              <span className="mt-4 inline-flex bg-smart-cream px-5 py-1 text-smart-dark shadow-[0_18px_58px_rgba(3,17,28,0.22)] sm:px-8 sm:py-2">
                SMARTMED
              </span>
            </h1>
          </Reveal>
          <p className="mx-auto mt-6 max-w-[350px] font-[family-name:var(--font-script)] text-[34px] font-normal leading-none tracking-normal text-smart-aqua sm:max-w-[620px] sm:text-[46px] sm:whitespace-nowrap lg:text-[54px]">
            Educație medicală la standarde înalte
          </p>
        </div>
      </div>
      <WaveSeparator fill="cream" />
    </section>
  );
}
