"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  animate,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { Reveal } from "@/components/animations/reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SmartIcon } from "@/components/ui/SmartIcon";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import type { CarouselItem } from "@/lib/site-config";
import { cn } from "@/lib/utils";

type HorizontalScrollSectionProps = {
  eyebrow: string;
  heading: string;
  description: string;
  items: ReadonlyArray<CarouselItem>;
  speedPxPerSecond?: number;
  cardWidth?: number;
  bottomWave?: "cream" | "teal";
};

const accentToCardBg: Record<CarouselItem["accent"], string> = {
  aqua: "bg-[linear-gradient(135deg,rgba(156,206,208,0.22)_0%,rgba(46,127,136,0.12)_55%,rgba(3,17,28,0.55)_100%)]",
  gold: "bg-[linear-gradient(135deg,rgba(215,190,138,0.22)_0%,rgba(200,168,117,0.14)_55%,rgba(3,17,28,0.55)_100%)]",
  teal: "bg-[linear-gradient(135deg,rgba(46,127,136,0.32)_0%,rgba(31,111,120,0.18)_55%,rgba(3,17,28,0.55)_100%)]",
  cream: "bg-[linear-gradient(135deg,rgba(244,235,221,0.22)_0%,rgba(244,235,221,0.10)_55%,rgba(3,17,28,0.55)_100%)]",
};

const accentToIconWrap: Record<CarouselItem["accent"], string> = {
  aqua: "bg-smart-aqua/16 text-smart-aqua border-smart-aqua/35",
  gold: "bg-smart-gold/14 text-smart-gold-light border-smart-gold/40",
  teal: "bg-smart-teal-soft/22 text-smart-aqua border-smart-aqua/30",
  cream: "bg-smart-cream/14 text-smart-cream border-smart-cream/30",
};

export function HorizontalScrollSection({
  eyebrow,
  heading,
  description,
  items,
  speedPxPerSecond = 32,
  cardWidth = 320,
  bottomWave = "cream",
}: HorizontalScrollSectionProps) {
  const x = useMotionValue(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackHalfWidth, setTrackHalfWidth] = useState(0);
  const [paused, setPaused] = useState(false);
  const manualAnimationRef = useRef<ReturnType<typeof animate> | null>(null);
  const reduceMotion = useReducedMotion();

  const duplicated = [...items, ...items];

  useEffect(() => {
    if (!trackRef.current) return;

    const measure = () => {
      if (!trackRef.current) return;
      setTrackHalfWidth(trackRef.current.scrollWidth / 2);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(trackRef.current);

    return () => observer.disconnect();
  }, [items.length]);

  useAnimationFrame((_, delta) => {
    if (paused || trackHalfWidth === 0 || reduceMotion) return;
    if (manualAnimationRef.current) return;

    const distance = (speedPxPerSecond * delta) / 1000;
    const next = x.get() - distance;
    x.set(next <= -trackHalfWidth ? next + trackHalfWidth : next);
  });

  function wrap(value: number) {
    if (trackHalfWidth === 0) return value;
    let result = value;
    while (result <= -trackHalfWidth) result += trackHalfWidth;
    while (result > 0) result -= trackHalfWidth;
    return result;
  }

  function nudge(direction: 1 | -1) {
    if (trackHalfWidth === 0) return;

    manualAnimationRef.current?.stop();

    const current = x.get();
    const target = current - direction * (cardWidth + 24);

    manualAnimationRef.current = animate(x, target, {
      type: "spring",
      stiffness: 120,
      damping: 22,
      onComplete: () => {
        x.set(wrap(x.get()));
        manualAnimationRef.current = null;
      },
    });
  }

  return (
    <section className="relative isolate overflow-hidden bg-smart-teal px-0 pb-44 pt-24 text-smart-white sm:pb-48 sm:pt-28">
      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-7 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>{eyebrow}</SectionLabel>
            <h2 className="mt-3 font-serif text-5xl font-semibold leading-none tracking-[-0.025em] sm:text-6xl">
              {heading}
            </h2>
            <p className="mt-4 text-base leading-8 text-smart-white/74 sm:text-lg">
              {description}
            </p>
          </div>
        </Reveal>
      </div>

      <div
        className="relative z-10 mt-12"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-smart-teal to-transparent sm:w-28" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-smart-teal to-transparent sm:w-28" />

        <div className="overflow-hidden">
          <motion.div
            className="flex items-stretch gap-6 will-change-transform"
            ref={trackRef}
            style={{ x }}
          >
            {duplicated.map((item, index) => (
              <CarouselCard item={item} key={`${item.title}-${index}`} width={cardWidth} />
            ))}
          </motion.div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 items-center justify-between px-3 sm:px-6 lg:px-10">
          <button
            aria-label="Card-uri precedente"
            className="pointer-events-auto inline-flex size-12 items-center justify-center rounded-full border border-white/14 bg-smart-abyss/55 text-smart-white shadow-[0_12px_30px_rgba(3,17,28,0.34)] backdrop-blur-md transition duration-300 hover:-translate-x-0.5 hover:border-smart-aqua/45 hover:bg-smart-abyss/80 hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua sm:size-14"
            onClick={() => nudge(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-5 sm:size-6" strokeWidth={1.8} />
          </button>
          <button
            aria-label="Card-uri următoare"
            className="pointer-events-auto inline-flex size-12 items-center justify-center rounded-full border border-white/14 bg-smart-abyss/55 text-smart-white shadow-[0_12px_30px_rgba(3,17,28,0.34)] backdrop-blur-md transition duration-300 hover:translate-x-0.5 hover:border-smart-aqua/45 hover:bg-smart-abyss/80 hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua sm:size-14"
            onClick={() => nudge(1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="size-5 sm:size-6" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <WaveSeparator fill={bottomWave} />
    </section>
  );
}

type CarouselCardProps = {
  item: CarouselItem;
  width: number;
};

function CarouselCard({ item, width }: CarouselCardProps) {
  return (
    <Link
      aria-label={`${item.title} – ${item.eyebrow}`}
      className={cn(
        "group/card relative flex shrink-0 flex-col overflow-hidden rounded-[28px] border border-white/12 text-left text-smart-white shadow-[0_22px_60px_rgba(3,17,28,0.32)] transition-all duration-500 ease-out hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_30px_80px_rgba(3,17,28,0.42)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua",
        accentToCardBg[item.accent],
      )}
      href={item.href}
      style={{ width }}
    >
      <div className="relative h-44 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(120%_140%_at_24%_22%,rgba(255,255,255,0.18)_0%,transparent_55%),radial-gradient(140%_120%_at_82%_88%,rgba(3,17,28,0.55)_0%,transparent_64%)]" />
        <div className="absolute inset-6 flex items-end">
          <span
            className={cn(
              "inline-flex size-14 items-center justify-center rounded-2xl border backdrop-blur-md transition duration-500 group-hover/card:scale-105",
              accentToIconWrap[item.accent],
            )}
          >
            <SmartIcon className="size-6" name={item.icon} />
          </span>
        </div>
        <div className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/14 bg-smart-abyss/40 text-smart-white/82 transition duration-300 group-hover/card:bg-smart-aqua group-hover/card:text-smart-abyss">
          <SmartIcon className="size-4" name="arrow-up-right" />
        </div>
      </div>
      <div className="relative flex flex-1 flex-col gap-3 bg-smart-abyss/45 px-6 pb-6 pt-5 backdrop-blur-md">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-smart-aqua/82">
          {item.eyebrow}
        </p>
        <h3 className="font-serif text-2xl font-semibold leading-[1.08] tracking-[-0.012em] text-smart-white">
          {item.title}
        </h3>
        <p className="text-sm leading-7 text-smart-white/76">{item.description}</p>
      </div>
    </Link>
  );
}
