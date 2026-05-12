import { Reveal } from "@/components/animations/reveal";
import { GlassCard } from "@/components/ui/GlassCard";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SmartIcon } from "@/components/ui/SmartIcon";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import { onlineCenterModules, roleRoadmap } from "@/lib/site-config";
import type { IconName } from "@/lib/site-config";

const progressPreview = [
  { label: "Biologie celulară", value: "68%" },
  { label: "Anatomie", value: "42%" },
  { label: "Chimie organică", value: "57%" },
] as const;

const dashboardStats = [
  { label: "Lecții", value: "24", icon: "book-open" },
  { label: "Progres", value: "56%", icon: "timer" },
  { label: "Acces", value: "roluri", icon: "shield" },
] satisfies Array<{ label: string; value: string; icon: IconName }>;

export function OnlineCenterPage() {
  return (
    <>
      <section className="relative isolate min-h-[760px] overflow-hidden bg-smart-dark px-5 pb-44 pt-32 text-smart-white sm:px-7 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_20%,rgba(156,206,208,0.28),transparent_32%),linear-gradient(135deg,#03111c,#071b29_62%,#061622)]" />
        <div className="grain-overlay" />
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <SectionLabel>Centru digital</SectionLabel>
            <h1 className="mt-5 font-serif text-6xl font-semibold leading-[0.94] tracking-[-0.035em] sm:text-7xl lg:text-8xl">
              Centru SmartMed <span className="text-smart-aqua">Online</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-smart-muted sm:text-lg">
              Fundație pentru cursuri online, module, progres, abonamente și acces
              diferențiat. Momentan este o structură premium, pregătită pentru
              integrarea autentificării și a plăților.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <PremiumButton href="/cont">Intră în cont</PremiumButton>
              <PremiumButton href="/grile" variant="outline">
                Exersează grile
              </PremiumButton>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <GlassCard className="p-6">
              <div className="flex items-center justify-between gap-4 border-b border-white/12 pb-5">
                <div>
                  <p className="font-serif text-3xl font-semibold">Dashboard preview</p>
                  <p className="mt-1 text-sm text-smart-muted">
                    Progres, module și acces premium într-un singur loc.
                  </p>
                </div>
                <span className="rounded-full border border-smart-aqua/35 bg-smart-aqua/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-smart-aqua">
                  Premium ready
                </span>
              </div>
              <div className="mt-7 grid gap-5">
                {progressPreview.map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-smart-white">{item.label}</span>
                      <span className="text-smart-muted">{item.value}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-smart-aqua to-smart-gold-light" style={{ width: item.value }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                {dashboardStats.map((item) => (
                  <div className="rounded-[22px] border border-white/12 bg-white/6 p-4" key={item.label}>
                    <SmartIcon className="text-smart-aqua" name={item.icon} />
                    <p className="mt-3 text-xs text-smart-muted">{item.label}</p>
                    <p className="mt-1 font-serif text-3xl font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </Reveal>
        </div>
        <WaveSeparator fill="cream" />
      </section>

      <section className="relative overflow-hidden bg-smart-cream px-5 py-20 text-smart-ink sm:px-7 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          {onlineCenterModules.map((module, index) => (
            <Reveal delay={index * 0.06} key={module.title}>
              <GlassCard className="h-full border-smart-abyss/10 bg-white/55 p-7 text-smart-ink shadow-[0_20px_58px_rgba(3,17,28,0.12)]">
                <span className="flex size-12 items-center justify-center rounded-full border border-smart-gold/40 bg-smart-cream-deep text-smart-teal">
                  <SmartIcon name={module.icon} />
                </span>
                <h2 className="mt-6 font-serif text-3xl font-semibold leading-none">
                  {module.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-smart-ink/68">
                  {module.description}
                </p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
        <WaveSeparator fill="teal" />
      </section>

      <section className="relative overflow-hidden bg-smart-teal px-5 pb-44 pt-24 text-smart-white sm:px-7 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(156,206,208,0.22),transparent_30%),linear-gradient(135deg,#1f6f78,#0d4351_72%)]" />
        <div className="grain-overlay" />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <SectionLabel>Acces diferențiat</SectionLabel>
            <h2 className="mt-4 font-serif text-5xl font-semibold leading-none sm:text-6xl">
              Rolurile sunt gândite de acum
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-smart-white/72">
              Logica reală vine când adăugăm auth, dar UI-ul este pregătit pentru
              guest, user, premium și admin.
            </p>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2">
            {roleRoadmap.map((item, index) => (
              <Reveal delay={index * 0.05} key={item.role}>
                <GlassCard className="h-full p-6">
                  <SmartIcon className="text-smart-aqua" name="shield" />
                  <h3 className="mt-4 font-serif text-3xl font-semibold">{item.role}</h3>
                  <p className="mt-3 text-sm leading-7 text-smart-white/72">
                    {item.access}
                  </p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </div>
        <WaveSeparator fill="cream" />
      </section>

      <section className="bg-smart-cream px-5 py-20 text-center text-smart-ink sm:px-7 lg:px-8">
        <Reveal>
          <SectionLabel tone="cream">SmartMed Premium</SectionLabel>
          <h2 className="mx-auto mt-4 max-w-4xl font-serif text-5xl font-semibold leading-none sm:text-6xl">
            Cursuri, progres, abonamente și materiale într-o experiență fluidă
          </h2>
          <div className="mt-8 flex justify-center">
            <PremiumButton href="/contact">Cere detalii</PremiumButton>
          </div>
        </Reveal>
      </section>
    </>
  );
}
