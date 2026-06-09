"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Reveal } from "@/components/animations/reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SmartIcon } from "@/components/ui/SmartIcon";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import type { CarouselItem } from "@/lib/site-config";
import { cn } from "@/lib/utils";

type SpecialModulesSectionProps = {
  eyebrow: string;
  heading: string;
  description: string;
  items: ReadonlyArray<CarouselItem>;
};

const benefits = [
  {
    icon: "heart-pulse",
    title: "Gândire clară",
    description: "Structurăm conceptele esențiale pentru înțelegere profundă.",
  },
  {
    icon: "sparkles",
    title: "Legături inteligente",
    description: "Conectăm informația între capitole, pentru o viziune completă.",
  },
  {
    icon: "timer",
    title: "Strategii de succes",
    description: "Tehnici și exerciții care fac diferența la examen.",
  },
] as const;

const accentToImageGlow: Record<CarouselItem["accent"], string> = {
  aqua: "from-smart-aqua/26 via-smart-cream/76 to-smart-cream-deep/92",
  gold: "from-smart-gold/24 via-smart-cream/80 to-smart-cream-deep/92",
  teal: "from-smart-teal/22 via-smart-cream/78 to-smart-cream-deep/92",
  cream: "from-smart-cream via-smart-cream/88 to-smart-cream-deep/92",
};

export function SpecialModulesSection({
  eyebrow,
  heading,
  description,
  items,
}: SpecialModulesSectionProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [progress, setProgress] = useState(0);
  const dotCount = useMemo(() => Math.min(5, Math.max(1, items.length)), [items.length]);
  const activeDot = Math.round(progress * (dotCount - 1));

  const updateRailState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const nextProgress = maxScroll === 0 ? 0 : rail.scrollLeft / maxScroll;

    setCanScrollLeft(rail.scrollLeft > 8);
    setCanScrollRight(rail.scrollLeft < maxScroll - 8);
    setProgress(Math.min(1, Math.max(0, nextProgress)));
  }, []);

  useEffect(() => {
    updateRailState();

    const rail = railRef.current;
    if (!rail) return;

    const observer = new ResizeObserver(updateRailState);
    observer.observe(rail);
    window.addEventListener("resize", updateRailState);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateRailState);
    };
  }, [items.length, updateRailState]);

  function scrollRail(direction: 1 | -1) {
    const rail = railRef.current;
    if (!rail) return;

    const firstCard = rail.querySelector<HTMLElement>("[data-special-module-card]");
    const cardWidth = firstCard?.offsetWidth ?? 296;
    const gap = 24;

    rail.scrollBy({
      left: direction * (cardWidth + gap),
      behavior: "smooth",
    });
  }

  return (
    <section className="relative isolate overflow-hidden bg-smart-teal px-0 pb-44 pt-24 text-smart-white sm:pb-48 sm:pt-28">
      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>{eyebrow}</SectionLabel>
            <h2 className="mt-3 font-serif text-5xl font-semibold leading-none tracking-[-0.015em] sm:text-6xl lg:text-7xl">
              {heading}
            </h2>
            <p className="mt-4 text-base leading-8 text-smart-white/74 sm:text-lg">
              {description}
            </p>
            <div className="mx-auto mt-7 flex w-36 items-center justify-center gap-3 text-smart-gold-light">
              <span className="h-px flex-1 bg-smart-gold-light/48" />
              <SmartIcon className="size-5" name="sparkles" />
              <span className="h-px flex-1 bg-smart-gold-light/48" />
            </div>
          </div>
        </Reveal>
      </div>

      <div className="relative z-10 mx-auto mt-14 max-w-[1600px] px-5 sm:mt-16 sm:px-7 lg:px-10 xl:px-12">
        <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
          <Reveal className="min-w-0 lg:-mt-16 xl:-mt-20">
            <SignatureCard />
          </Reveal>

          <Reveal className="min-w-0" delay={0.08}>
            <div className="relative min-w-0">
              {canScrollLeft ? (
                <div className="pointer-events-none absolute bottom-16 left-0 top-4 z-20 w-16 bg-gradient-to-r from-smart-teal/72 via-smart-teal/22 to-transparent sm:w-20" />
              ) : null}
              {canScrollRight ? (
                <div className="pointer-events-none absolute bottom-16 right-0 top-4 z-20 w-16 bg-gradient-to-l from-smart-teal/72 via-smart-teal/22 to-transparent sm:w-20" />
              ) : null}
              {canScrollLeft ? (
                <ScrollButton
                  ariaLabel="Module precedente"
                  className="-left-3 sm:-left-4"
                  direction="left"
                  onClick={() => scrollRail(-1)}
                />
              ) : null}
              {canScrollRight ? (
                <ScrollButton
                  ariaLabel="Module următoare"
                  className="right-0 sm:right-2"
                  direction="right"
                  onClick={() => scrollRail(1)}
                />
              ) : null}

              <div
                className="-my-6 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth scroll-pl-3 scroll-pr-32 py-6 pb-12 pl-3 pr-32 [scrollbar-width:none] sm:scroll-pl-4 sm:scroll-pr-40 sm:pl-4 sm:pr-40 [&::-webkit-scrollbar]:hidden"
                onScroll={updateRailState}
                ref={railRef}
              >
                {items.map((item, index) => (
                  <SpecialModuleCard item={item} key={item.title} moduleNumber={index + 1} />
                ))}
              </div>

              <div className="flex justify-center gap-3 pt-3" aria-hidden="true">
                {Array.from({ length: dotCount }).map((_, index) => (
                  <span
                    className={cn(
                      "size-2 rounded-full transition-all duration-300",
                      index === activeDot
                        ? "w-6 bg-smart-gold-light"
                        : "bg-smart-white/58",
                    )}
                    key={index}
                  />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <WaveSeparator fill="cream" />
    </section>
  );
}

function SignatureCard() {
  return (
    <Link
      aria-label="Module semnătură SmartMed"
      className="group/signature relative flex min-h-[560px] w-full flex-col overflow-hidden rounded-[28px] border border-smart-gold/38 bg-[linear-gradient(180deg,#fbf7ef_0%,#f3eadb_100%)] px-8 py-9 text-smart-ink shadow-[0_14px_32px_rgba(3,17,28,0.08),inset_0_1px_0_rgba(255,255,255,0.82)] transition duration-500 ease-out hover:-translate-y-1 hover:border-smart-gold/70 hover:shadow-[0_20px_48px_rgba(3,17,28,0.14),0_0_24px_rgba(200,168,117,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold"
      href="/lectii-speciale"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(200,168,117,0.18),transparent_34%),linear-gradient(135deg,rgba(31,111,120,0.04),transparent_42%)]" />
      <div className="relative flex flex-1 flex-col">
        <div className="mx-auto h-28 w-32 transition duration-500 group-hover/signature:scale-[1.035]">
          <Image
            alt=""
            aria-hidden="true"
            className="size-full object-contain"
            height={1024}
            loading="eager"
            src="/images/special-modules/signature-smartmed.png"
            unoptimized
            width={1024}
          />
        </div>

        <div className="mx-auto mt-8 max-w-[16rem] text-center">
          <h3 className="font-serif text-[2.45rem] font-semibold leading-[0.96] tracking-[-0.018em]">
            Module semnătură SmartMed
          </h3>
          <p className="mt-5 text-base leading-7 text-smart-ink/72">
            Transformăm materia din manual în înțelegere, strategie și progres.
          </p>
          <span className="mx-auto mt-6 block h-px w-36 bg-gradient-to-r from-transparent via-smart-gold/72 to-transparent" />
        </div>

        <div className="mt-7 grid gap-5">
          {benefits.map(({ icon, title, description }, index) => (
            <div className="grid grid-cols-[3.25rem_1fr] gap-4" key={title}>
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-full border text-smart-white shadow-[0_12px_28px_rgba(3,17,28,0.12)]",
                  index === 1
                    ? "border-smart-gold/50 bg-smart-gold"
                    : "border-smart-teal/24 bg-smart-teal",
                )}
              >
                <SmartIcon className="size-6" name={icon} />
              </span>
              <span>
                <span className="block text-sm font-extrabold text-smart-ink">
                  {title}
                </span>
                <span className="mt-1 block text-xs leading-5 text-smart-ink/68">
                  {description}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

type SpecialModuleCardProps = {
  item: CarouselItem;
  moduleNumber: number;
};

function SpecialModuleCard({ item, moduleNumber }: SpecialModuleCardProps) {
  return (
    <Link
      aria-label={`${item.title} - ${item.description}`}
      className="group/card relative flex min-h-[500px] w-[286px] shrink-0 snap-start flex-col overflow-hidden rounded-[25px] border border-smart-gold/32 bg-[linear-gradient(180deg,#fbf7ef_0%,#f5ecdc_100%)] text-smart-ink shadow-[0_8px_20px_rgba(3,17,28,0.06),inset_0_1px_0_rgba(255,255,255,0.82)] transition duration-500 ease-out hover:-translate-y-2 hover:border-smart-gold/72 hover:shadow-[0_16px_38px_rgba(3,17,28,0.14),0_0_18px_rgba(156,206,208,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold sm:w-[300px]"
      data-special-module-card="true"
      href={item.href}
    >
      <div className="relative h-[220px] overflow-hidden">
        {item.image ? (
          <Image
            alt=""
            className="object-cover transition duration-700 ease-out group-hover/card:scale-[1.045]"
            fill
            sizes="(min-width: 1024px) 300px, 286px"
            src={item.image}
          />
        ) : (
          <div
            aria-hidden="true"
            className={cn(
              "absolute inset-0 bg-gradient-to-br transition duration-700 ease-out group-hover/card:scale-[1.035]",
              accentToImageGlow[item.accent],
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.78),transparent_28%),radial-gradient(circle_at_78%_28%,rgba(31,111,120,0.14),transparent_34%),linear-gradient(135deg,rgba(200,168,117,0.15)_0%,transparent_42%)]" />
            <div className="absolute inset-x-8 top-9 h-px bg-smart-gold/36" />
          </div>
        )}
      </div>

      <div className="relative flex flex-1 flex-col px-8 pb-8 pt-10 text-center">
        <span className="absolute left-1/2 top-0 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-[#f5ecdc] bg-[linear-gradient(180deg,#dfc17e_0%,#bd9558_100%)] text-base font-extrabold text-white shadow-[0_12px_26px_rgba(153,111,43,0.26)]">
          {moduleNumber}
        </span>
        <h3 className="font-serif text-[2rem] font-semibold leading-[0.96] tracking-[-0.015em] text-smart-ink">
          {item.title}
        </h3>
        <p className="mx-auto mt-5 max-w-[13.5rem] text-sm leading-7 text-smart-ink/72">
          {item.description}
        </p>
      </div>
    </Link>
  );
}

type ScrollButtonProps = {
  ariaLabel: string;
  className: string;
  direction: "left" | "right";
  onClick: () => void;
};

function ScrollButton({ ariaLabel, className, direction, onClick }: ScrollButtonProps) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        "absolute top-[210px] z-30 inline-flex size-14 -translate-y-1/2 items-center justify-center rounded-full border border-smart-aqua/38 bg-smart-abyss/76 text-smart-white shadow-[0_16px_42px_rgba(3,17,28,0.36)] backdrop-blur-md transition duration-300 hover:border-smart-gold/70 hover:bg-smart-abyss hover:text-smart-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" className="size-6" strokeWidth={1.8} />
    </button>
  );
}
