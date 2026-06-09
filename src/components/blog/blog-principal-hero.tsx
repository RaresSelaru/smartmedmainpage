"use client";

import Image from "next/image";
import { useState } from "react";

import { Reveal } from "@/components/animations/reveal";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
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
    hotspot: { left: "11%", top: "62%", width: "20%", height: "9%" },
    align: "left",
    title: "ASCLEPIOS",
    subtitle: "Ἀσκληπιός",
    subtitle2: "zeul medicinii în lumea greco-romană",
    body: PLACEHOLDER_BODY,
  },
  {
    id: "hippokrates",
    name: "Ἱπποκράτης",
    hotspot: { left: "77%", top: "62%", width: "19%", height: "9%" },
    align: "right",
    title: "HIPPOCRATES",
    subtitle: "Ἱπποκράτης",
    subtitle2: "părintele medicinii",
    body: PLACEHOLDER_BODY,
  },
];

export function BlogPrincipalHero() {
  return (
    <section className="relative isolate z-30 overflow-x-clip bg-smart-abyss pb-4 pt-32 text-smart-white sm:pb-6 sm:pt-36">
      {/* Fundal bleumarin (navy), ca înainte de gradient */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_12%,rgba(156,206,208,0.18),transparent_32%),linear-gradient(135deg,#03111c_0%,#061622_48%,#082030_100%)]" />
      <div className="grain-overlay" />
      {/* z-40 ca să fie deasupra arcadei (WaveSeparator, z-20) — astfel casetele de hover
          care se deschid peste arcadă vin deasupra ei. */}
      <div className="smart-container relative z-40">
        <Reveal>
          {/* Imaginile/textul direct pe fundal; overflow vizibil ca să nu taie casetele
              care se deschid sub numele statuilor. */}
          <div className="relative">
            <div className="flex flex-col items-center md:flex-row">
              {/* STÂNGA: „BLOG" (text HTML auriu) + subtitlul alb dedesubt */}
              <div className="flex w-full flex-col items-start justify-center px-4 py-10 md:-ml-4 md:w-1/2 md:-translate-x-[76px] md:pl-0">
                {/* Wrapper îngust cât „BLOG", ca subtitlul să fie centrat exact sub el */}
                <div className="flex w-fit flex-col items-center gap-1">
                  <h1 className="font-[family-name:var(--font-script)] text-8xl font-normal leading-none text-smart-gold sm:text-9xl">
                    BLOG
                  </h1>
                  <Image
                    alt="Între un „nu mai pot” și un „încă o grilă” — Navighează cu succes prin hățișul admiterii"
                    className="-mt-2 h-auto w-full"
                    height={480}
                    priority
                    src="/assets/blog/blog-hero-text-white.png"
                    width={1900}
                  />
                </div>
              </div>
              {/* DREAPTA: textul „Centru acreditat” deasupra + statuile transparente.
                  Cele două PNG-uri au conținutul în aceeași bandă centrală; le stivuim și
                  folosim marginea negativă (peste padding-ul transparent) ca textul să stea
                  deasupra statuilor, ca în poza originală. */}
              <div className="flex w-full flex-col items-end md:-mr-4 md:w-1/2 md:-translate-y-[38px] md:translate-x-[76px] md:pr-0">
                {/* Stack împins spre dreapta; statuile mai mari, textul de deasupra mai mic */}
                <div className="w-[96%] max-w-[600px]">
                  <Image
                    alt="Centru acreditat — Exigență, Excelență și Experiență în pregătirea pentru Medicină — SmartMed Academy"
                    className="pointer-events-none mx-auto h-auto w-[60%]"
                    height={1280}
                    sizes="(max-width: 768px) 50vw, 26vw"
                    src="/assets/blog/centru-acreditat.png"
                    width={1280}
                  />
                  <div className="relative -mt-[36%] w-full">
                    <Image
                      alt="Statuile lui Asclepios și Hipocrate"
                      className="h-auto w-full"
                      height={1280}
                      priority
                      sizes="(max-width: 768px) 80vw, 46vw"
                      src="/assets/blog/Statui-transparent.png"
                      width={1280}
                    />
                    {/* Stratul interactiv cu hotspot-urile pe numele statuilor (aliniat pe
                        pătratul imaginii cu statui) */}
                    <div className="pointer-events-none absolute inset-0 z-20">
                      {STATUES.map((statue) => (
                        <StatueNameSpot key={statue.id} statue={statue} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
      {/* Arcada: tranziție curbă spre secțiunea următoare (Categorii, crem) */}
      <WaveSeparator fill="cream" />
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
            // Wrapper-bridge: lipit de hotspot (top-full) cu padding transparent în loc de gap,
            // ca traseul nume→casetă să fie continuu (caseta nu mai dispare la trecere).
            "absolute top-full z-30 w-[min(86vw,340px)] pt-[0.4rem]",
            statue.align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="rounded-2xl border border-smart-abyss/12 bg-[rgba(250,244,232,0.94)] p-4 text-smart-ink shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-md">
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
        </div>
      ) : null}
    </div>
  );
}
