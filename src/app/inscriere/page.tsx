import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, GraduationCap, Sparkles } from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { AdmissionParchmentCard } from "@/components/home/admission-parchment-card";
import parchmentStyles from "@/components/home/admission-parchment-card.module.css";
import { OrnamentalDivider } from "@/components/ui/OrnamentalDivider";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import { parseRegistrationContext } from "@/lib/registration-context";
import { siteConfig } from "@/lib/site-config";

const description =
  "Alege programul SmartMed pentru clasa a X-a, a XI-a sau a XII-a și descoperă planul de pregătire potrivit pentru admiterea la Medicină.";

export const metadata: Metadata = {
  title: "Înscriere la SmartMed",
  description,
  alternates: { canonical: "/inscriere" },
  openGraph: {
    title: "Înscriere la SmartMed | " + siteConfig.name,
    description,
    siteName: siteConfig.fullName,
    type: "website",
  },
};

const gradeChoices = [
  {
    grade: "Clasa a X-a",
    title: "Începi devreme",
    description:
      "Începe din clasa a X-a și construiește fundația pentru performanță. Parcurgem împreună bazele solide ale materiei și formăm obiceiuri corecte de învățare care te vor susține în anii următori.",
    ctaLabel: "Vezi programul",
    href: "/inscriere/clasa-a-10-a",
  },
  {
    grade: "Clasa a XI-a",
    title: "Accelerezi progresul",
    description:
      "În clasa a XI-a aprofundăm și consolidăm cunoștințele, dezvoltăm gândirea analitică și învățăm să organizăm eficient studiul pentru a face pasul spre performanță în mod constant.",
    ctaLabel: "Vezi programul",
    href: "/inscriere/clasa-a-11-a",
  },
  {
    grade: "Clasa a XII-a",
    title: "Te pregătești pentru examen",
    description:
      "În clasa a XII-a ne concentrăm 100% pe obiectivul final. Îți oferim strategia, exercițiul și încrederea necesare pentru a aborda examenul cu claritate, calm și rezultate care te reprezintă.",
    ctaLabel: "Vezi programul",
    href: "/inscriere/clasa-a-12-a",
  },
] as const;

type EnrollmentLandingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EnrollmentLandingPage({
  searchParams,
}: EnrollmentLandingPageProps) {
  const resolvedSearchParams = await searchParams;
  const registrationContext = parseRegistrationContext(resolvedSearchParams);

  if (registrationContext.flow === "simulare") {
    redirect(
      "/evenimente?flow=simulare" +
        (registrationContext.source
          ? "&source=" + encodeURIComponent(registrationContext.source)
          : ""),
    );
  }

  const trackedGradeChoices = gradeChoices.map((choice) => ({
    ...choice,
    href: registrationContext.source
      ? choice.href + "?source=" + encodeURIComponent(registrationContext.source)
      : choice.href,
  }));

  return (
    <>
      <section
        className="relative isolate min-h-[720px] overflow-hidden bg-smart-dark px-5 pb-44 pt-32 text-smart-white sm:min-h-[760px] sm:px-7 sm:pt-36 lg:min-h-[780px] lg:px-8 lg:pb-[var(--smart-desktop-hero-bottom)] lg:pt-[var(--smart-desktop-hero-top)]"
        data-registration-selector="true"
      >
        <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_78%_24%,rgba(156,206,208,0.22),transparent_34%),radial-gradient(circle_at_14%_28%,rgba(200,168,117,0.14),transparent_28%),linear-gradient(125deg,#03111c_0%,#071b29_55%,#0b303a_100%)]" />
        <div className="absolute inset-y-0 right-[-8%] -z-10 w-[72%] max-w-[42rem] opacity-20 sm:right-[-2%] sm:w-[58%] sm:opacity-30 lg:right-[4%] lg:w-[44%] lg:opacity-45">
          <Image
            alt=""
            className="object-contain object-bottom"
            fill
            loading="eager"
            sizes="(max-width: 1023px) 70vw, 672px"
            src="/assets/generated/smartmed-account-statue.png"
          />
        </div>
        <div className="grain-overlay" />

        <div className="relative z-10 mx-auto flex min-h-[450px] max-w-[var(--smart-content-max)] items-center py-10 lg:min-h-[560px]">
          <Reveal>
            <div className="max-w-3xl">
              <SectionLabel>Înscriere SmartMed</SectionLabel>
              <h1 className="mt-5 max-w-3xl font-serif text-[48px] font-semibold leading-[0.92] tracking-[-0.04em] sm:text-[60px] lg:text-[68px]">
                Alege clasa.
                <span className="mt-2 block text-smart-aqua">
                  Noi construim traseul.
                </span>
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-smart-white/70 sm:text-lg">
                Fiecare an are alt ritm, altă miză și alt punct de plecare.
                Selectează clasa în care intri și descoperă programul, nivelurile
                de sprijin și cele șase planuri SmartMed.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="group inline-flex min-h-[60px] items-center justify-center gap-3 rounded-xl border border-smart-gold-light/55 bg-[linear-gradient(180deg,#efd39b_0%,#d4aa68_100%)] px-7 text-sm font-extrabold text-smart-abyss shadow-[0_18px_42px_rgba(213,173,107,0.24),inset_0_1px_0_rgba(255,255,255,0.58)] transition duration-300 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold sm:text-base"
                  href="#alege-clasa"
                >
                  <GraduationCap aria-hidden="true" className="size-5" />
                  Alege clasa
                  <ArrowRight
                    aria-hidden="true"
                    className="size-5 transition-transform group-hover:translate-x-1"
                  />
                </Link>
                <Link
                  className="inline-flex min-h-[60px] items-center justify-center gap-3 rounded-xl border border-smart-aqua/35 bg-white/5 px-7 text-sm font-bold text-smart-aqua backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/9 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua sm:text-base"
                  href="/evenimente"
                >
                  <CalendarDays aria-hidden="true" className="size-5" />
                  Simulări și webinarii
                </Link>
              </div>
            </div>
          </Reveal>
        </div>

        <WaveSeparator fill="cream" />
      </section>

      <section
        className="relative scroll-mt-24 overflow-hidden bg-smart-cream px-5 pb-24 pt-20 text-smart-ink sm:px-7 sm:pb-28 sm:pt-24 lg:px-8 lg:py-[var(--smart-desktop-section-space)]"
        id="alege-clasa"
      >
        <div className="pointer-events-none absolute -left-48 top-24 size-[420px] rounded-full bg-smart-aqua/16 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 bottom-20 size-[360px] rounded-full border border-smart-gold/12" />

        <div className="relative z-10 mx-auto max-w-[var(--smart-content-max)]">
          <Reveal>
            <div className="mx-auto max-w-4xl text-center">
              <SectionLabel tone="cream">Programul tău începe aici</SectionLabel>
              <h2 className="mt-5 font-serif text-[44px] font-semibold leading-[0.95] tracking-[-0.035em] sm:text-[58px] lg:text-[64px]">
                În ce clasă intri din septembrie?
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-smart-ink/62 sm:text-base">
                Alege etapa în care ești acum și descoperă programul construit
                pentru ritmul, obiectivele și anul admiterii tale.
              </p>
            </div>
          </Reveal>

          <OrnamentalDivider className="my-12 sm:my-14" />

          <div className={parchmentStyles.grid}>
            {trackedGradeChoices.map((choice) => (
              <AdmissionParchmentCard {...choice} key={choice.grade} />
            ))}
          </div>

          <Reveal>
            <div className="mx-auto mt-14 flex max-w-4xl flex-col items-center justify-between gap-6 rounded-[2rem] border border-smart-teal/18 bg-white/32 px-6 py-7 text-center shadow-[0_24px_64px_rgba(31,111,120,0.07)] sm:px-9 lg:flex-row lg:text-left">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-smart-teal text-smart-white shadow-[0_14px_34px_rgba(31,111,120,0.18)]">
                <Sparkles aria-hidden="true" className="size-6" />
              </span>
              <div className="flex-1">
                <h2 className="font-serif text-3xl font-semibold sm:text-4xl">
                  Nu știi încă ce program ți se potrivește?
                </h2>
                <p className="mt-2 text-sm leading-7 text-smart-ink/60">
                  O întâlnire de orientare clarifică nivelul, obiectivul și
                  următorul pas.
                </p>
              </div>
              <Link
                className="inline-flex min-h-13 shrink-0 items-center gap-2 rounded-xl bg-smart-dark px-6 text-sm font-extrabold text-smart-gold-light transition hover:-translate-y-0.5 hover:bg-smart-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
                href="/evaluare"
              >
                Programează o întâlnire
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
