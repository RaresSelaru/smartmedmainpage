import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { getFeaturedSearchResults, searchSite, type SearchResult } from "@/lib/search";
import { siteConfig } from "@/lib/site-config";

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
    cautare?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Căutare SmartMed",
  description:
    "Căutare globală în paginile, articolele și resursele SmartMed Academy.",
  openGraph: {
    title: `Căutare | ${siteConfig.name}`,
    description:
      "Căutare globală în paginile, articolele și resursele SmartMed Academy.",
    siteName: siteConfig.fullName,
    type: "website",
  },
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = (params?.q ?? params?.cautare ?? "").trim();
  const results = query ? searchSite(query) : getFeaturedSearchResults();

  return (
    <>
      <section className="relative isolate overflow-hidden bg-smart-dark px-5 pb-24 pt-32 text-smart-white sm:px-7 sm:pt-36 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(156,206,208,0.28),transparent_34%),radial-gradient(circle_at_18%_12%,rgba(200,168,117,0.13),transparent_28%),linear-gradient(135deg,#03111c_0%,#071b29_54%,#061622_100%)]" />
        <div className="absolute right-[-10rem] top-8 h-[28rem] w-[28rem] rounded-full border border-smart-aqua/14" />
        <div className="grain-overlay" />
        <div className="smart-container relative z-10">
          <Reveal>
            <SectionLabel>Căutare globală</SectionLabel>
            <div className="mt-5 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <h1 className="font-serif text-5xl font-semibold leading-none sm:text-7xl lg:text-8xl">
                  Găsește rapid în SmartMed
                </h1>
                <p className="mt-6 max-w-xl text-base leading-8 text-smart-muted sm:text-lg">
                  Paginile, articolele și resursele relevante apar într-un singur loc.
                </p>
              </div>
              <form
                action="/cautare"
                className="flex min-h-16 items-center rounded-full border border-white/14 bg-white/[0.07] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.20)] backdrop-blur-xl focus-within:border-smart-aqua/58 focus-within:bg-white/[0.10]"
              >
                <label className="sr-only" htmlFor="global-search">
                  Caută în SmartMed
                </label>
                <input
                  className="min-w-0 flex-1 bg-transparent px-5 text-base text-smart-white outline-none placeholder:text-smart-muted"
                  defaultValue={query}
                  id="global-search"
                  name="q"
                  placeholder="Caută în SmartMed"
                  type="search"
                />
                <button
                  aria-label="Caută"
                  className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-smart-aqua text-smart-abyss transition duration-300 hover:bg-smart-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua"
                  type="submit"
                >
                  <Search aria-hidden="true" className="size-5" strokeWidth={1.85} />
                </button>
              </form>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-smart-cream px-5 py-20 text-smart-ink sm:px-7 lg:px-8">
        <div className="absolute right-[-14rem] top-10 h-[30rem] w-[30rem] rounded-full bg-smart-aqua/14 blur-3xl" />
        <div className="smart-container relative z-10">
          <Reveal>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.26em] text-smart-teal">
                  {query ? "Rezultate" : "Recomandări"}
                </p>
                <h2 className="mt-3 font-serif text-4xl font-semibold leading-none sm:text-5xl">
                  {query ? `Pentru “${query}”` : "Începe de aici"}
                </h2>
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-smart-ink/50">
                {results.length} {results.length === 1 ? "rezultat" : "rezultate"}
              </p>
            </div>
          </Reveal>

          {results.length ? (
            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              {results.map((result, index) => (
                <SearchResultCard index={index} key={result.id} result={result} />
              ))}
            </div>
          ) : (
            <Reveal>
              <div className="mt-12 rounded-[30px] border border-smart-abyss/10 bg-white/62 p-8 shadow-[0_20px_58px_rgba(3,17,28,0.10)]">
                <h3 className="font-serif text-4xl font-semibold">Nu am găsit rezultate</h3>
                <p className="mt-3 max-w-xl text-sm leading-7 text-smart-ink/62">
                  Încearcă un termen mai scurt sau caută după numele unei secțiuni: grile,
                  simulări, shop, contact, blog.
                </p>
              </div>
            </Reveal>
          )}
        </div>
      </section>
    </>
  );
}

function SearchResultCard({ index, result }: { index: number; result: SearchResult }) {
  return (
    <Reveal delay={Math.min(index * 0.035, 0.18)}>
      <Link
        className="group block h-full rounded-[26px] border border-smart-abyss/10 bg-white/62 p-6 shadow-[0_20px_58px_rgba(3,17,28,0.10)] transition duration-300 hover:-translate-y-1 hover:border-smart-teal/30 hover:bg-white/78 hover:shadow-[0_28px_70px_rgba(3,17,28,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
        href={result.href}
      >
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-smart-teal">
            {result.type}
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-smart-ink/42">
            {result.eyebrow}
          </span>
        </div>
        <h3 className="mt-5 font-serif text-3xl font-semibold leading-none text-smart-ink transition duration-300 group-hover:text-smart-teal sm:text-4xl">
          {result.title}
        </h3>
        <p className="mt-4 text-sm leading-7 text-smart-ink/64">{result.description}</p>
        <span className="mt-6 inline-flex items-center gap-3 text-sm font-bold text-smart-teal transition duration-300 group-hover:text-smart-ink">
          Deschide rezultatul
          <ArrowRight aria-hidden="true" className="size-4 transition group-hover:translate-x-1" />
        </span>
      </Link>
    </Reveal>
  );
}
