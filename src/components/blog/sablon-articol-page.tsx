import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  Image as ImageIcon,
} from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { BlogArticleCard } from "@/components/blog/blog-article-card";
import { FinalCTASection } from "@/components/home/FinalCTASection";
import { HorizontalScrollSection } from "@/components/home/HorizontalScrollSection";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import { getBlogPosts } from "@/lib/blog";
import { newsCarousel } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const PLACEHOLDER_PARAGRAPH =
  "Text placeholder. Acesta este un paragraf demonstrativ pentru șablonul de articol. " +
  "Înlocuiește-l cu conținutul real — o idee dezvoltată pe câteva rânduri, scrisă natural, " +
  "ca cititorul să parcurgă ușor materialul. Lorem ipsum dolor sit amet, consectetur " +
  "adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

const CATEGORIES = [
  "Categorie placeholder 1",
  "Categorie placeholder 2",
  "Categorie placeholder 3",
];


export function SablonArticolPageContent() {
  const recommended = getBlogPosts().slice(0, 3); // cele mai recente 3

  return (
    <>
      {/* 1. Header navy: titlu + elemente la stânga, imagine mai mică în dreapta */}
      <header className="relative isolate overflow-hidden bg-smart-abyss pb-36 pt-32 text-smart-white sm:pb-44 sm:pt-36">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(156,206,208,0.18),transparent_34%),linear-gradient(135deg,#03111c,#061622_58%,#082030)]" />
        <div className="grain-overlay" />
        <div className="smart-container relative z-10">
          <Reveal>
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-4 py-2 text-sm font-semibold text-smart-white/78 transition hover:border-smart-aqua/50 hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua"
              href="/blog#articole"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Înapoi la blog
            </Link>
          </Reveal>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.45fr_0.85fr] lg:items-center">
            <Reveal>
              <div>
                <h1 className="max-w-3xl font-serif text-5xl font-semibold leading-[0.98] tracking-[-0.025em] sm:text-6xl">
                  Titlu placeholder al articolului care poate ocupa două rânduri
                </h1>
                <div className="mt-6 flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => (
                    <span
                      className="inline-block rounded-full border border-smart-gold/28 bg-smart-gold/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-smart-gold-light"
                      key={category}
                    >
                      {category}
                    </span>
                  ))}
                </div>
                <div className="mt-7 flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-[0.12em] text-smart-white/58">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays aria-hidden="true" className="size-4 text-smart-aqua" />
                    6 iunie 2026
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock3 aria-hidden="true" className="size-4 text-smart-aqua" />
                    8 min
                  </span>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <PlaceholderImage
                className="aspect-[4/3] w-full rounded-[28px] border-white/20 bg-white/8 text-smart-white/55 shadow-[0_30px_88px_rgba(0,0,0,0.34)]"
                label="Imagine principală placeholder"
              />
            </Reveal>
          </div>
        </div>

        {/* Arcada: tranziție curbă spre corpul articolului (crem) */}
        <WaveSeparator fill="cream" />
      </header>

      {/* 2. Corpul articolului pe fundal cream: zona principală (note în stânga
          + text în centru, pe segmente) și reclama sticky în dreapta. */}
      <section className="bg-smart-cream py-20 text-smart-ink">
        <div className="smart-container">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
            {/* ZONA PRINCIPALĂ: stivă de segmente */}
            <div className="space-y-10">
              <Segment note="Paradigmă placeholder unu: o propoziție scurtă care rezumă ideea grupului de paragrafe din dreapta.">
                <p>{PLACEHOLDER_PARAGRAPH}</p>
                <p>{PLACEHOLDER_PARAGRAPH}</p>
              </Segment>

              {/* Imagine inline — fără notă în stânga */}
              <Segment>
                <PlaceholderImage
                  className="aspect-[1.7] w-full rounded-[24px]"
                  label="Imagine inline placeholder"
                />
              </Segment>

              <Segment note="Paradigmă placeholder doi: ideea-cheie a următoarelor paragrafe, formulată într-o frază scurtă.">
                <p>{PLACEHOLDER_PARAGRAPH}</p>
                <p>{PLACEHOLDER_PARAGRAPH}</p>
                <p>{PLACEHOLDER_PARAGRAPH}</p>
              </Segment>

              {/* Listă — fără notă în stânga */}
              <Segment>
                <ul>
                  <li>Element de listă placeholder numărul unu.</li>
                  <li>Element de listă placeholder numărul doi.</li>
                  <li>Element de listă placeholder numărul trei.</li>
                </ul>
              </Segment>

              {/* Casetă CTA la mijlocul articolului — fără notă în stânga */}
              <Segment>
                <aside className="rounded-[28px] border border-smart-teal/25 bg-smart-teal/8 p-7">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-smart-teal">
                    Call to action placeholder
                  </p>
                  <h3 className="mt-3 font-serif text-3xl font-semibold leading-tight text-smart-ink">
                    Titlu placeholder pentru îndemnul la acțiune
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-smart-ink/72">
                    Text placeholder care explică pe scurt ce câștigă cititorul dacă apasă
                    butonul de mai jos.
                  </p>
                  <Link
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-smart-teal px-5 py-3 text-sm font-bold uppercase tracking-[0.13em] text-smart-white transition hover:bg-smart-teal-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
                    href="#"
                  >
                    Buton placeholder
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </aside>
              </Segment>

              <Segment note="Paradigmă placeholder trei: o idee scurtă care încadrează partea finală a articolului.">
                <p>{PLACEHOLDER_PARAGRAPH}</p>
                <p>{PLACEHOLDER_PARAGRAPH}</p>
              </Segment>

              {/* Blockquote — fără notă în stânga */}
              <Segment>
                <blockquote>
                  „Blockquote placeholder — un citat evidențiat în corpul articolului,
                  care subliniază o idee importantă.”
                </blockquote>
              </Segment>

              <Segment note="Paradigmă placeholder patru: concluzia esențială, într-o singură frază.">
                <p>{PLACEHOLDER_PARAGRAPH}</p>
                <p>{PLACEHOLDER_PARAGRAPH}</p>
              </Segment>
            </div>

            {/* DREAPTA: reclamă sticky care se plimbă la scroll */}
            <Reveal className="hidden lg:block">
              <div className="sticky top-28">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-smart-ink/45">
                  Publicitate
                </p>
                <PlaceholderImage
                  className="aspect-[3/4] w-full rounded-[24px]"
                  label="Reclamă placeholder"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 3. Poate te-ar interesa și... — articole recomandate (stil blog-principal) */}
      <section className="bg-smart-cream pb-24 text-smart-ink">
        <div className="smart-container">
          <Reveal>
            <div className="flex items-center gap-5">
              <h2 className="font-serif text-4xl font-semibold italic leading-none tracking-[0.02em] sm:text-5xl">
                Poate te-ar interesa și...
              </h2>
              <span className="hidden h-px min-w-24 flex-1 bg-gradient-to-r from-smart-gold/58 via-smart-ink/14 to-transparent md:block" />
            </div>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-x-7 gap-y-12 sm:grid-cols-2 xl:grid-cols-3 xl:gap-x-8">
            {recommended.map((post, index) => (
              <Reveal
                className="relative mx-auto w-full max-w-[440px] hover:z-30"
                delay={Math.min(index * 0.04, 0.18)}
                key={post.slug}
              >
                <BlogArticleCard
                  href={`/blog/${post.slug}`}
                  imageAlt={post.coverAlt}
                  imageSrc={post.coverImage}
                  publishedAt={post.date}
                  tags={post.tags}
                  title={post.title}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4. SmartMed News, ca în blog-principal */}
      <div className="relative bg-smart-cream pb-36 sm:pb-48">
        <WaveSeparator fill="teal" variant="relaxed" />
      </div>
      <HorizontalScrollSection
        bottomWave="cream"
        description="Anunțuri oficiale, modificări de calendar, evenimente și actualizări relevante pentru admiterea 2026."
        eyebrow="Mereu la curent"
        heading="SmartMed News"
        items={newsCarousel}
      />
      <FinalCTASection />
    </>
  );
}

function Segment({ note, children }: { note?: string; children: ReactNode }) {
  return (
    <Reveal className="grid gap-4 lg:grid-cols-[240px_minmax(0,720px)] lg:gap-10">
      <div className="hidden lg:block">
        {note ? (
          <p className="border-l-2 border-smart-gold/50 pl-4 text-base font-semibold leading-7 text-smart-ink/85">
            {note}
          </p>
        ) : null}
      </div>
      <div className="prose-smart">{children}</div>
    </Reveal>
  );
}

function PlaceholderImage({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 border border-dashed border-smart-ink/20 bg-smart-ink/5 p-6 text-center text-smart-ink/45",
        className,
      )}
    >
      <ImageIcon aria-hidden="true" className="size-8" />
      <span className="text-xs font-bold uppercase tracking-[0.16em]">{label}</span>
    </div>
  );
}
