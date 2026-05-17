import Image from "next/image";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SmartIcon } from "@/components/ui/SmartIcon";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import {
  type PathChoiceCard,
  pathChoiceGroup1,
  pathChoiceGroup2,
  pathChoiceGroup3,
} from "@/lib/site-config";
import { cn } from "@/lib/utils";

type PathChoiceGroupProps = {
  cards: ReadonlyArray<PathChoiceCard>;
  layout: "2" | "4";
  eyebrow?: string;
  heading?: string;
  description?: string;
  showBadge?: boolean;
  withSeparator?: boolean;
  spacing?: "default" | "tight";
};

export function PathChoiceGroup({
  cards,
  layout,
  eyebrow,
  heading,
  description,
  showBadge = false,
  withSeparator = true,
  spacing = "default",
}: PathChoiceGroupProps) {
  const hasHeader = Boolean(eyebrow || heading || description);

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden bg-smart-cream px-5 text-smart-ink sm:px-7 lg:px-8",
        spacing === "tight" ? "pb-32 pt-12" : "pb-40 pt-16",
      )}
    >
      <div className="relative z-10 mx-auto max-w-7xl">
        {hasHeader ? (
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              {eyebrow ? <SectionLabel tone="cream">{eyebrow}</SectionLabel> : null}
              {heading ? (
                <h2 className="mt-3 font-serif text-5xl font-semibold leading-none tracking-[-0.025em] sm:text-6xl">
                  {heading}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-3 text-sm leading-7 text-smart-ink/62">
                  {description}
                </p>
              ) : null}
            </div>
          </Reveal>
        ) : null}

        <div
          className={cn(
            "relative grid gap-6",
            hasHeader ? "mt-12" : "mt-2",
            layout === "2" ? "lg:grid-cols-2" : "lg:grid-cols-2",
          )}
        >
          {cards.map((card, index) => (
            <Reveal delay={index * 0.06} key={card.href}>
              <Link
                className="group relative block min-h-[430px] overflow-hidden rounded-[30px] shadow-[0_26px_75px_rgba(3,17,28,0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
                href={card.href}
              >
                <Image
                  alt=""
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  src={card.image}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-smart-abyss/86 via-smart-abyss/58 to-smart-abyss/16" />
                <div className="absolute inset-0 bg-gradient-to-t from-smart-abyss/68 via-transparent to-transparent" />
                <div className="relative z-10 flex min-h-[430px] max-w-md flex-col justify-between p-7 sm:p-9">
                  <div>
                    <span className="inline-flex rounded-full bg-smart-aqua/80 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-smart-white">
                      {card.label}
                    </span>
                    <h3 className="mt-6 max-w-xs font-serif text-5xl font-semibold leading-[0.9] text-smart-white sm:text-6xl">
                      {card.title}
                    </h3>
                    <ul className="mt-6 grid gap-2 text-sm text-smart-white/86">
                      {card.benefits.map((benefit) => (
                        <li className="flex items-center gap-2" key={benefit}>
                          <SmartIcon className="size-4 text-smart-gold-light" name="check" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <span className="mt-8 inline-flex w-fit items-center gap-3 rounded-full bg-smart-aqua/82 px-6 py-3 text-sm font-semibold text-smart-white transition group-hover:bg-smart-aqua group-hover:brightness-110">
                    {card.cta}
                    <SmartIcon className="size-4" name="arrow-up-right" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}

          {showBadge && layout === "2" ? (
            <Reveal delay={0.18}>
              <div className="relative z-20 mx-auto -my-2 flex size-28 flex-col items-center justify-center rounded-full border border-smart-gold/55 bg-smart-abyss text-center text-smart-cream shadow-[0_22px_65px_rgba(3,17,28,0.32)] lg:absolute lg:left-1/2 lg:top-1/2 lg:-my-0 lg:-translate-x-1/2 lg:-translate-y-1/2">
                <GraduationCap aria-hidden="true" className="size-7 text-smart-gold-light" strokeWidth={1.5} />
                <span className="mt-2 px-4 text-[10px] font-bold uppercase leading-4 tracking-[0.12em]">
                  Excelență în educație medicală
                </span>
              </div>
            </Reveal>
          ) : null}
        </div>
      </div>
      {withSeparator ? <WaveSeparator fill="teal" /> : null}
    </section>
  );
}

export function PathChoiceSection() {
  return (
    <PathChoiceGroup
      cards={pathChoiceGroup1}
      eyebrow="Alege formatul care ți se potrivește"
      heading="Alege drumul tău"
      description="Investește în viitorul tău, alege formatul care îți susține ritmul."
      layout="2"
      showBadge
    />
  );
}

export function PathChoiceSectionGroup2() {
  return (
    <PathChoiceGroup
      cards={pathChoiceGroup2}
      eyebrow="Antrenament aplicat"
      heading="Exersează cu sens"
      description="Grile structurate și simulări realiste, calibrate pentru pregătirea ta de admitere."
      layout="2"
    />
  );
}

export function PathChoiceSectionGroup3() {
  return (
    <PathChoiceGroup
      cards={pathChoiceGroup3}
      eyebrow="Citește, învață, comandă"
      heading="Ecosistemul SmartMed"
      description="Articole care clarifică și materiale care te susțin pe parcurs."
      layout="2"
      withSeparator={false}
    />
  );
}
