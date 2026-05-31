"use client";

import Image from "next/image";
import { useState } from "react";

import { Reveal } from "@/components/animations/reveal";
import { cn } from "@/lib/utils";

type StatueSpot = {
  id: string;
  name: string;
  hotspot: { left: string; top: string; width: string; height: string };
  align: "left" | "right";
  title: string;
  subtitle: string;
  subtitle2: string;
  body: string;
};

const PLACEHOLDER_BODY =
  "Text placeholder. Aici va veni descrierea statuii — câteva rânduri introductive vizibile, " +
  "iar restul conținutului rămâne ascuns până la apăsarea pe „Vezi mai mult”. " +
  "Înlocuiește acest text cu informația reală despre personaj.";

const STATUES: StatueSpot[] = [
  {
    id: "asklepios",
    name: "Ἀσκληπιός",
    hotspot: { left: "8.5%", top: "73.5%", width: "20%", height: "8.5%" },
    align: "left",
    title: "ASCLEPIOS",
    subtitle: "Ἀσκληπιός",
    subtitle2: "zeul medicinii în lumea greco-romană",
    body: PLACEHOLDER_BODY,
  },
  {
    id: "hippokrates",
    name: "Ἱπποκράτης",
    hotspot: { left: "71%", top: "74.5%", width: "21%", height: "8.5%" },
    align: "right",
    title: "HIPPOCRATES",
    subtitle: "Ἱπποκράτης",
    subtitle2: "părintele medicinii",
    body: PLACEHOLDER_BODY,
  },
];

export function BlogPrincipalHero() {
  return (
    <section className="relative isolate z-30 bg-smart-abyss pb-4 pt-32 text-smart-white sm:pb-6 sm:pt-36">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_12%,rgba(156,206,208,0.18),transparent_32%),linear-gradient(135deg,#03111c_0%,#061622_48%,#082030_100%)]" />
      <div className="grain-overlay" />
      <div className="smart-container relative z-10">
        <Reveal>
          {/* overflow vizibil ca să nu taie casetele care se deschid sub nume;
              colțurile rotunjite sunt aplicate pe fiecare jumătate de imagine */}
          <div className="relative rounded-[30px] border border-white/14 bg-smart-deep shadow-[0_32px_92px_rgba(0,0,0,0.34)]">
            <div className="flex flex-col items-center md:flex-row">
              <div className="w-full overflow-hidden rounded-tl-[30px] rounded-tr-[30px] bg-smart-cream md:w-1/2 md:rounded-bl-[30px] md:rounded-tr-none">
                <Image
                  alt="SmartMed Academy Blog"
                  className="my-[-20%] h-auto w-full mix-blend-multiply md:my-[-12%]"
                  height={1080}
                  priority
                  src="/assets/blog/blog-hero-text.jpeg"
                  width={1080}
                />
              </div>
              <div className="relative z-10 -mt-[15%] w-full bg-smart-cream md:z-auto md:mt-0 md:w-1/2">
                {/* Decupajul imaginii + colțurile rotunjite rămân pe acest strat interior */}
                <div className="overflow-hidden rounded-bl-[30px] rounded-br-[30px] md:rounded-bl-none md:rounded-tr-[30px]">
                  <Image
                    alt="Statui medicale"
                    className="h-auto w-full mix-blend-multiply md:my-[-12%]"
                    height={1080}
                    src="/assets/blog/statui.jpeg"
                    width={1080}
                  />
                </div>
                {/* Stratul interactiv, aliniat exact pe boxul imaginii (square),
                    inclusiv decupajul vertical de pe desktop (md:my-[-12%]). */}
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 aspect-square md:-mt-[12%]">
                  {STATUES.map((statue) => (
                    <StatueNameSpot key={statue.id} statue={statue} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function StatueNameSpot({ statue }: { statue: StatueSpot }) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const visible = hovered || pinned;

  return (
    <div
      className="pointer-events-auto absolute"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={statue.hotspot}
    >
      <button
        aria-expanded={visible}
        aria-label={`Detalii despre ${statue.name}`}
        className="size-full cursor-pointer rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-aqua"
        onClick={() => setPinned((value) => !value)}
        type="button"
      />

      {visible ? (
        <div
          className={cn(
            "absolute top-[calc(100%+0.4rem)] z-30 w-[min(86vw,340px)] rounded-2xl border border-smart-abyss/12 bg-[rgba(250,244,232,0.94)] p-4 text-smart-ink shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-md",
            statue.align === "right" ? "right-0" : "left-0",
          )}
        >
          <h4 className="text-center font-serif text-lg font-semibold leading-tight text-smart-ink">
            {statue.title}
          </h4>
          <p className="mt-1 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-smart-teal">
            {statue.subtitle}
          </p>
          <p className="mt-1 text-center text-sm leading-6 text-smart-ink/80">
            {statue.subtitle2}
          </p>
          <p
            className={cn(
              "mt-3 text-sm leading-6 text-smart-ink/80",
              expanded ? null : "line-clamp-3",
            )}
          >
            {statue.body}
          </p>

          {expanded ? (
            <button
              className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-smart-teal transition hover:text-smart-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal"
              onClick={() => {
                setExpanded(false);
                setPinned(false);
              }}
              type="button"
            >
              Vezi mai puțin
            </button>
          ) : (
            <button
              className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-smart-teal transition hover:text-smart-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal"
              onClick={() => {
                setExpanded(true);
                setPinned(true);
              }}
              type="button"
            >
              Vezi mai mult
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
