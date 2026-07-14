import Image from "next/image";
import Link from "next/link";
import { BookOpen, GraduationCap, Search } from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { WaveSeparator } from "@/components/ui/WaveSeparator";

export function BlogPrincipalHero() {
  return (
    <section className="relative isolate z-30 min-h-[760px] overflow-hidden bg-smart-abyss px-5 pb-36 pt-32 text-smart-white sm:min-h-[800px] sm:px-7 sm:pb-44 sm:pt-36 lg:min-h-[820px] lg:px-8">
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 object-cover object-[72%_center] opacity-78 sm:opacity-88 lg:object-center lg:opacity-100"
        fill
        priority
        sizes="100vw"
        src="/images/blog/blog-principal-hero-user-bg.png"
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

      <Image
        alt="Centru acreditat — Exigență, Excelență și Experiență în pregătirea pentru Medicină — SmartMed Academy"
        className="pointer-events-none absolute right-[17%] top-[10.25rem] z-[3] hidden h-auto w-[clamp(220px,15vw,290px)] drop-shadow-[0_14px_34px_rgba(0,0,0,0.34)] xl:block"
        height={1280}
        priority
        sizes="(max-width: 1024px) 230px, 16vw"
        src="/assets/blog/centru-acreditat.png"
        width={1280}
      />

      <div className="relative z-10 mx-auto flex min-h-[500px] w-full max-w-[1580px] items-center py-8 sm:min-h-[520px] sm:py-10 lg:min-h-[545px]">
        <Reveal className="w-full min-w-0">
          <div className="w-full min-w-0 max-w-[700px]">
            <h1 className="inline-flex flex-col items-center font-serif font-semibold leading-[1.1] tracking-normal text-smart-white drop-shadow-[0_14px_36px_rgba(0,0,0,0.36)]">
              <span className="text-center text-[30px] sm:text-[40px] lg:text-[48px] xl:text-[52px]">
                Între un „nu mai pot”
              </span>
              <span className="mt-3 text-center text-[30px] sm:text-[40px] lg:text-[48px] xl:text-[52px] sm:mt-2">
                și un „încă o grilă”
              </span>
              <span className="mt-2 block bg-[linear-gradient(180deg,#f7dfaa_0%,#d7b06e_52%,#b98643_100%)] bg-clip-text text-[50px] font-bold leading-[0.9] text-transparent drop-shadow-[0_10px_28px_rgba(0,0,0,0.26)] sm:text-[82px] lg:text-[100px] xl:text-[108px] 2xl:text-[118px]">
                SMARTMED
              </span>
              <span className="mt-2 block bg-[linear-gradient(180deg,#f7dfaa_0%,#d7b06e_52%,#b98643_100%)] bg-clip-text text-[50px] font-bold leading-[0.9] text-transparent drop-shadow-[0_10px_28px_rgba(0,0,0,0.26)] sm:text-[82px] lg:text-[100px] xl:text-[108px] 2xl:text-[118px]">
                BLOG
              </span>
            </h1>

            <p className="mt-6 max-w-[620px] font-serif text-[20px] font-medium leading-[1.44] text-smart-white/86 drop-shadow-[0_10px_26px_rgba(0,0,0,0.30)] sm:text-[22px] lg:text-[23px]">
              Articole esențiale, ghiduri practice și explicații clare pentru cei
              care vor mai mult decât informație
              <br />
              Navighează cu succes prin hățișul admiterii
            </p>

            <form
              action="/blog"
              className="mt-7 flex h-[52px] w-full max-w-[630px] items-center rounded-[16px] border border-white/16 bg-smart-abyss/38 px-4 shadow-[0_18px_52px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition duration-300 focus-within:border-smart-gold-light/50 focus-within:bg-smart-abyss/54 focus-within:shadow-[0_20px_56px_rgba(200,168,117,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] sm:h-14 sm:px-5"
              method="get"
            >
              <label className="sr-only" htmlFor="blog-search">
                Caută articole, subiecte, strategii
              </label>
              <Search
                aria-hidden="true"
                className="mr-3 size-5 shrink-0 text-smart-white/74 sm:size-[22px]"
                strokeWidth={1.8}
              />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-smart-white outline-none placeholder:text-smart-muted/82 sm:text-base"
                id="blog-search"
                name="cautare"
                placeholder="Caută articole, subiecte, strategii..."
                type="search"
              />
            </form>

            <div className="mt-6 flex w-full max-w-[630px] flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                className="group inline-flex min-h-[54px] items-center justify-center gap-3 rounded-xl border border-smart-gold-light/60 bg-[linear-gradient(180deg,#efd39b_0%,#d4aa68_100%)] px-5 py-3 text-[15px] font-extrabold text-smart-abyss shadow-[0_16px_38px_rgba(213,173,107,0.22),inset_0_1px_0_rgba(255,255,255,0.58)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(213,173,107,0.30),inset_0_1px_0_rgba(255,255,255,0.68)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold sm:min-w-[280px]"
                href="/blog#articole"
              >
                <BookOpen
                  aria-hidden="true"
                  className="size-5 shrink-0 transition duration-300 group-hover:-rotate-3"
                  strokeWidth={1.85}
                />
                <span>Vezi ultimele articole</span>
              </Link>
              <Link
                className="group inline-flex min-h-[54px] items-center justify-center gap-3 rounded-xl border border-smart-gold-light/62 bg-smart-abyss/32 px-5 py-3 text-[15px] font-bold text-smart-gold-light shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-smart-gold/10 hover:text-smart-white hover:shadow-[0_16px_38px_rgba(213,173,107,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold sm:min-w-[294px]"
                href="/blog?categorie=admitere#articole"
              >
                <GraduationCap
                  aria-hidden="true"
                  className="size-5 shrink-0 transition duration-300 group-hover:rotate-3"
                  strokeWidth={1.85}
                />
                <span>Ghid complet pentru admitere</span>
              </Link>
            </div>
          </div>
        </Reveal>
      </div>

      <WaveSeparator fill="cream" />
    </section>
  );
}
