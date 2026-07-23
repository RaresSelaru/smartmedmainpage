"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

const EDGE_REVEAL_DISTANCE = 160;
const RAIL_SHADOW_GUTTER = 64;
const RAIL_EDGE_FADE_WIDTH = 80;

function getEdgeStrength(distance: number) {
  const progress = Math.min(1, Math.max(0, distance / EDGE_REVEAL_DISTANCE));
  return progress * progress * (3 - 2 * progress);
}

function getScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function getRailMaskStyle(
  leftStrength: number,
  rightStrength: number,
): CSSProperties {
  const leftEdgeOpacity = 1 - leftStrength;
  const rightEdgeOpacity = 1 - rightStrength;
  const fadeEnd = RAIL_SHADOW_GUTTER + RAIL_EDGE_FADE_WIDTH;
  const maskImage = `linear-gradient(90deg, rgba(0,0,0,${leftEdgeOpacity}) 0, rgba(0,0,0,${leftEdgeOpacity}) ${RAIL_SHADOW_GUTTER}px, black ${fadeEnd}px, black calc(100% - ${fadeEnd}px), rgba(0,0,0,${rightEdgeOpacity}) calc(100% - ${RAIL_SHADOW_GUTTER}px), rgba(0,0,0,${rightEdgeOpacity}) 100%)`;

  return {
    WebkitMaskImage: maskImage,
    maskImage,
  };
}

export function SpecialModulesSection({
  eyebrow,
  heading,
  description,
  items,
}: SpecialModulesSectionProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [leftEdgeStrength, setLeftEdgeStrength] = useState(0);
  const [rightEdgeStrength, setRightEdgeStrength] = useState(0);
  const [progress, setProgress] = useState(0);
  const dotCount = useMemo(() => Math.min(5, Math.max(1, items.length)), [items.length]);
  const activeDot = Math.round(progress * (dotCount - 1));

  const updateRailState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const scrollOffset = Math.min(maxScroll, Math.max(0, rail.scrollLeft));
    const remainingScroll = Math.max(0, maxScroll - scrollOffset);
    const nextProgress = maxScroll === 0 ? 0 : scrollOffset / maxScroll;

    setCanScrollLeft(scrollOffset > 1);
    setCanScrollRight(remainingScroll > 1);
    setLeftEdgeStrength(getEdgeStrength(scrollOffset));
    setRightEdgeStrength(getEdgeStrength(remainingScroll));
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
    const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap) || 20;

    rail.scrollBy({
      left: direction * (cardWidth + gap),
      behavior: getScrollBehavior(),
    });
  }

  function scrollToDot(index: number) {
    const rail = railRef.current;
    if (!rail) return;

    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const targetProgress = dotCount <= 1 ? 0 : index / (dotCount - 1);

    rail.scrollTo({
      left: maxScroll * targetProgress,
      behavior: getScrollBehavior(),
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

      <div className="relative z-10 mx-auto mt-14 max-w-[1600px] px-5 sm:mt-16 sm:px-7 lg:px-12">
        <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-16 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Reveal className="min-w-0 lg:-mt-8 xl:-mt-9">
            <SignatureCard />
          </Reveal>

          <Reveal className="min-w-0 overflow-visible" delay={0.08}>
            <div className="relative min-w-0 overflow-visible">
              <div className="relative min-w-0 overflow-visible">
                <div
                  className="-mx-16 -mb-14 -mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth scroll-pl-[4.75rem] scroll-pr-36 py-6 pb-24 pl-[4.75rem] pr-36 [scrollbar-width:none] sm:scroll-pl-20 sm:scroll-pr-40 sm:pl-20 sm:pr-40 [&::-webkit-scrollbar]:hidden"
                  id="special-modules-rail"
                  onScroll={updateRailState}
                  ref={railRef}
                  style={getRailMaskStyle(leftEdgeStrength, rightEdgeStrength)}
                >
                  {items.map((item, index) => (
                    <SpecialModuleCard item={item} key={item.title} moduleNumber={index + 1} />
                  ))}
                </div>

                <RailEdgeFade side="left" strength={leftEdgeStrength} />
                <RailEdgeFade side="right" strength={rightEdgeStrength} />
              </div>

              <ScrollButton
                ariaLabel="Module precedente"
                className="left-0 hover:-translate-x-1 sm:left-1 lg:-left-14"
                direction="left"
                disabled={!canScrollLeft}
                onClick={() => scrollRail(-1)}
                strength={leftEdgeStrength}
              />
              <ScrollButton
                ariaLabel="Module următoare"
                className="right-0 hover:translate-x-1 sm:right-1 lg:-right-12"
                direction="right"
                disabled={!canScrollRight}
                onClick={() => scrollRail(1)}
                strength={rightEdgeStrength}
              />

              <div
                aria-label="Navigare module speciale"
                className="pointer-events-auto relative z-30 flex justify-center gap-0 pt-2"
                role="group"
              >
                {Array.from({ length: dotCount }).map((_, index) => (
                  <button
                    aria-controls="special-modules-rail"
                    aria-current={index === activeDot ? "true" : undefined}
                    aria-label={`Mergi la poziția ${index + 1} din ${dotCount}`}
                    className="group/dot inline-flex h-8 w-7 cursor-pointer appearance-none items-center justify-center border-0 bg-transparent p-0 focus-visible:outline-none"
                    key={index}
                    onClick={() => scrollToDot(index)}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-1.5 rounded-full transition-[width,background-color,opacity,transform] duration-300 ease-out group-hover/dot:scale-110 group-focus-visible/dot:scale-125",
                        index === activeDot
                          ? "w-5 bg-smart-gold-light"
                          : "w-1.5 bg-smart-white/55 group-hover/dot:bg-smart-white/78 group-focus-visible/dot:bg-smart-white/90",
                      )}
                    />
                  </button>
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

type RailEdgeFadeProps = {
  side: "left" | "right";
  strength: number;
};

function RailEdgeFade({ side, strength }: RailEdgeFadeProps) {
  const fadeOuterEdge = RAIL_SHADOW_GUTTER + RAIL_EDGE_FADE_WIDTH;
  const leftSoftStop =
    RAIL_SHADOW_GUTTER + Math.round(RAIL_EDGE_FADE_WIDTH * 0.42);
  const rightSoftStop = Math.round(RAIL_EDGE_FADE_WIDTH * 0.58);
  const maskImage =
    side === "left"
      ? `linear-gradient(90deg, transparent 0, black ${RAIL_SHADOW_GUTTER}px, rgba(0,0,0,0.72) ${leftSoftStop}px, transparent ${fadeOuterEdge}px)`
      : `linear-gradient(90deg, transparent 0, rgba(0,0,0,0.72) ${rightSoftStop}px, black ${RAIL_EDGE_FADE_WIDTH}px, transparent ${fadeOuterEdge}px)`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 z-20 bg-[rgba(31,112,121,0.001)] backdrop-blur-[6px] transition-opacity duration-200 ease-out"
      data-special-modules-edge-fade={side}
      style={{
        [side]: -RAIL_SHADOW_GUTTER,
        opacity: strength,
        width: fadeOuterEdge,
        WebkitMaskImage: maskImage,
        maskImage,
      }}
    />
  );
}

function SignatureCard() {
  return (
    <Link
      aria-label="Module semnătură SmartMed"
      className="group/signature relative flex min-h-[560px] w-full flex-col overflow-hidden rounded-[28px] border border-smart-gold/38 bg-[linear-gradient(180deg,#fbf7ef_0%,#f3eadb_100%)] px-8 py-9 text-smart-ink shadow-[0_14px_32px_rgba(3,17,28,0.08),inset_0_1px_0_rgba(255,255,255,0.82)] transition duration-500 ease-out hover:-translate-y-1 hover:border-smart-gold/70 hover:shadow-[0_20px_48px_rgba(3,17,28,0.14),0_0_24px_rgba(200,168,117,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold"
      href="/module-speciale"
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
  const imageSrc = item.imageSrc ?? item.imageUrl ?? item.image;

  return (
    <Link
      aria-label={`${item.title} - ${item.description}`}
      className="group/card relative isolate flex min-h-[590px] w-[286px] shrink-0 snap-start flex-col overflow-hidden rounded-[30px] bg-[#fbf6ec] text-smart-ink shadow-[0_18px_42px_rgba(3,17,28,0.14),0_4px_14px_rgba(3,17,28,0.08),inset_0_1px_0_rgba(255,255,255,0.76)] transition duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_26px_58px_rgba(3,17,28,0.20),0_0_24px_rgba(215,190,138,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold sm:min-h-[620px] sm:w-[300px]"
      data-special-module-card="true"
      href={item.href}
    >
      <div className="relative h-[330px] shrink-0 overflow-hidden bg-[#fbf6ec] sm:h-[358px]">
        {imageSrc ? (
          <Image
            alt={item.imageAlt ?? ""}
            className="transition duration-700 ease-out [backface-visibility:hidden] [transform:translateZ(0)] group-hover/card:scale-[1.045]"
            fill
            sizes="(min-width: 1024px) 300px, 286px"
            src={imageSrc}
            style={{
              objectFit: item.imageFit ?? "cover",
              objectPosition: item.imagePosition ?? "center top",
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 overflow-hidden bg-smart-cream transition duration-700 ease-out [backface-visibility:hidden] [transform:translateZ(0)] group-hover/card:scale-[1.035]"
          >
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br",
                accentToImageGlow[item.accent],
              )}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_16%,rgba(255,255,255,0.72),transparent_30%),radial-gradient(circle_at_78%_24%,rgba(31,111,120,0.13),transparent_36%),radial-gradient(circle_at_52%_72%,rgba(200,168,117,0.20),transparent_36%)]" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-[-3px] z-10 h-[52%] bg-[linear-gradient(180deg,rgba(251,246,236,0)_0%,rgba(251,246,236,0.08)_32%,rgba(251,246,236,0.28)_62%,rgba(251,246,236,0.68)_86%,#fbf6ec_100%)]" />
      </div>

      <div className="relative z-20 -mt-px flex h-[260px] flex-col items-center bg-[#fbf6ec] px-8 pb-6 pt-[62px] text-center sm:h-[262px] sm:px-9 sm:pb-[26px] sm:pt-16">
        <span className="absolute left-1/2 top-0 z-20 flex size-[3.25rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[4px] border-[#fbf6ec] bg-[linear-gradient(180deg,#e2c783_0%,#c69d5f_100%)] text-lg font-extrabold text-white shadow-[0_12px_24px_rgba(153,111,43,0.26),0_2px_6px_rgba(3,17,28,0.10)] sm:size-14">
          {moduleNumber}
        </span>
        <h3 className="font-serif text-[1.9rem] font-semibold leading-[0.96] tracking-[-0.012em] text-smart-ink sm:text-[2rem]">
          {item.title}
        </h3>
        <p className="mx-auto mt-3 max-w-[14.25rem] text-[13.25px] leading-[1.58] text-smart-ink/68 sm:text-[13.5px] sm:leading-[1.62]">
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
  disabled: boolean;
  onClick: () => void;
  strength: number;
};

function ScrollButton({
  ariaLabel,
  className,
  direction,
  disabled,
  onClick,
  strength,
}: ScrollButtonProps) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        "absolute top-[295px] z-50 inline-flex size-12 -translate-y-1/2 items-center justify-center bg-transparent text-smart-cream/90 transition-[opacity,transform,color] duration-300 ease-out hover:text-smart-gold-light focus-visible:text-smart-gold-light focus-visible:outline-none disabled:pointer-events-none sm:top-[310px]",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      style={{ opacity: disabled ? 0 : Math.min(1, strength * 1.45) }}
      type="button"
    >
      <Icon
        aria-hidden="true"
        className="size-11 drop-shadow-[0_3px_7px_rgba(3,17,28,0.34)]"
        strokeWidth={2}
      />
    </button>
  );
}
