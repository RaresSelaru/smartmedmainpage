import { Reveal } from "@/components/animations/reveal";
import { HeroMediaFrame } from "@/components/home/HeroMediaFrame";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SmartIcon } from "@/components/ui/SmartIcon";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import { heroBenefits } from "@/lib/site-config";

export function HeroSection() {
  return (
    <section className="relative isolate min-h-[840px] overflow-hidden bg-smart-dark px-5 pb-44 pt-32 text-smart-white sm:min-h-[880px] sm:px-7 sm:pb-52 sm:pt-36 lg:px-8">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_82%_18%,rgba(156,206,208,0.20),transparent_38%),radial-gradient(circle_at_12%_28%,rgba(200,168,117,0.10),transparent_30%),linear-gradient(135deg,#03111c_0%,#071b29_48%,#061622_100%)]" />
      <HeroMediaFrame />
      <div className="hero-copy-scrim" />
      <div className="grain-overlay z-[4]" />
      <div className="relative z-10 mx-auto flex max-w-7xl items-center py-8 sm:py-10 lg:min-h-[620px]">
        <div className="w-full min-w-0 max-w-[690px] lg:max-w-[760px]">
          <Reveal>
            <SectionLabel className="max-w-[350px] leading-5 sm:max-w-none">
              Educație medicală la standarde înalte
            </SectionLabel>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-[350px] font-serif text-[42px] font-semibold leading-[0.98] sm:max-w-3xl sm:text-7xl sm:leading-[0.94] lg:max-w-[760px] lg:text-[86px]">
              Intră la Medicină cu{" "}
              <span className="text-smart-aqua">pregătirea potrivită</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-7 max-w-[350px] text-base leading-8 text-smart-white/82 sm:max-w-xl sm:text-lg">
              SmartMed Academy te pregătește pas cu pas pentru admiterea la
              Medicină, cu medici dedicați și metode moderne de învățare.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-9 flex max-w-[350px] flex-col gap-4 sm:max-w-none sm:flex-row">
              <PremiumButton className="w-full sm:w-auto" href="/cont">
                Începe pregătirea
              </PremiumButton>
              <PremiumButton className="w-full sm:w-auto" href="/centru-online" variant="outline">
                Vezi cursurile
              </PremiumButton>
            </div>
          </Reveal>
          <Reveal delay={0.32}>
            <div className="mt-8 flex max-w-[350px] flex-col gap-4 text-sm text-smart-white/82 sm:max-w-none sm:flex-row sm:flex-wrap">
              {heroBenefits.map((benefit) => (
                <div className="flex items-center gap-3" key={benefit.label}>
                  <SmartIcon className="size-5 text-smart-gold-light" name={benefit.icon} />
                  <span>{benefit.label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
      <WaveSeparator fill="cream" />
    </section>
  );
}
