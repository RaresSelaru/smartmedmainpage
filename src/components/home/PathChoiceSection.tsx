import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Grid2X2,
  Landmark,
  Laptop,
  MonitorCheck,
  ShoppingBag,
} from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SmartIcon } from "@/components/ui/SmartIcon";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import {
  type PathChoiceCard,
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

const smartMedCenterChoices = [
  {
    title: "Centru online",
    subtitle: "Flexibilitate totală.\nPerformanță fără limite.",
    href: "/centru-online",
    icon: Laptop,
    tone: "online",
    benefits: [
      "Cursuri live interactive",
      "Acces 24/7 la platformă",
      "Materiale și teste dedicate",
      "Răspunsuri rapide la întrebări",
    ],
  },
  {
    title: "Centru fizic",
    subtitle: "Interacțiune reală.\nMotivație la fiecare pas.",
    href: "/centru-fizic",
    icon: Landmark,
    tone: "physical",
    benefits: [
      "Interacțiune directă cu medicii",
      "Atmosferă de studiu dedicată",
      "Comunitate și motivație",
      "Simulări și feedback constant",
    ],
  },
] as const;

const smartTrainingChoices = [
  {
    title: pathChoiceGroup2[0].title,
    href: pathChoiceGroup2[0].href,
    cta: pathChoiceGroup2[0].cta,
    benefits: pathChoiceGroup2[0].benefits,
    icon: Grid2X2,
    badgeIcon: ClipboardCheck,
    tone: "grile",
  },
  {
    title: pathChoiceGroup2[1].title,
    href: pathChoiceGroup2[1].href,
    cta: pathChoiceGroup2[1].cta,
    benefits: pathChoiceGroup2[1].benefits,
    icon: MonitorCheck,
    badgeIcon: MonitorCheck,
    tone: "simulari",
  },
] as const;

const smartEcosystemChoices = [
  {
    label: pathChoiceGroup3[0].label,
    title: pathChoiceGroup3[0].title,
    href: pathChoiceGroup3[0].href,
    cta: "Explorează articolele",
    description: "Ghiduri clare, strategii de învățare și răspunsuri scrise pentru ritmul tău de pregătire.",
    benefits: pathChoiceGroup3[0].benefits,
    icon: BookOpen,
    tone: "blog",
  },
  {
    label: pathChoiceGroup3[1].label,
    title: pathChoiceGroup3[1].title,
    href: pathChoiceGroup3[1].href,
    cta: "Vezi produsele",
    description: "Materiale premium, caiete și resurse alese pentru studiu aplicat și recapitulări eficiente.",
    benefits: pathChoiceGroup3[1].benefits,
    icon: ShoppingBag,
    tone: "shop",
  },
] as const;

const centerVisualTransform =
  "matrix(1.032596, 0, 0, 1.032147, -136.244243, -38.086202)";

const centerLungImageLayers = {
  online: {
    href: "/assets/generated/smartmed-center-online-laptop.png",
    mask: "url(#smartmed-left-lung-mask)",
    preserveAspectRatio: "xMidYMid slice",
    x: 28,
    y: 24,
    width: 540,
    height: 660,
  },
  physical: {
    href: "/assets/generated/smartmed-center-physical-class.png",
    mask: "url(#smartmed-right-lung-mask)",
    preserveAspectRatio: "xMidYMid slice",
    x: 890,
    y: 24,
    width: 540,
    height: 660,
  },
} as const;

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
    <section
      className="smartmed-center-choice relative isolate overflow-hidden bg-smart-cream px-5 pb-40 pt-12 text-smart-ink sm:px-7 sm:pb-44 sm:pt-16 lg:px-8"
      id="centrul-smartmed"
    >
      <div className="relative z-10 mx-auto max-w-[1620px]">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel tone="cream">Centrul SmartMed</SectionLabel>
          </div>
        </Reveal>

        <div className="mt-7 xl:grid xl:grid-cols-[minmax(170px,0.5fr)_minmax(760px,2.1fr)_minmax(170px,0.5fr)] xl:items-center xl:gap-5 2xl:gap-8">
          <Reveal className="hidden xl:block" delay={0.05}>
            <CenterChoiceCopy align="left" choice={smartMedCenterChoices[0]} />
          </Reveal>

          <Reveal className="relative mx-auto w-full max-w-[1040px] 2xl:max-w-[1140px]" delay={0.02} y={16}>
            <div className="pointer-events-none absolute inset-x-[10%] bottom-[8%] top-[12%] rounded-full bg-smart-gold/12 blur-3xl" />
            <CenterLungsVisual />
          </Reveal>

          <Reveal className="hidden xl:block" delay={0.05}>
            <CenterChoiceCopy align="right" choice={smartMedCenterChoices[1]} />
          </Reveal>
        </div>

        <Reveal delay={0.08}>
          <div className="mx-auto mt-6 max-w-3xl text-center sm:mt-8 xl:-mt-2">
            <h2 className="font-serif text-5xl font-semibold leading-none tracking-[-0.015em] text-smart-ink sm:text-6xl lg:text-7xl">
              Alege drumul tău
            </h2>
            <div className="mt-7 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
              <CenterChoiceButton choice={smartMedCenterChoices[0]} />
              <CenterChoiceButton choice={smartMedCenterChoices[1]} />
            </div>
          </div>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-4xl gap-10 md:grid-cols-2 xl:hidden">
          <Reveal delay={0.04}>
            <CenterChoiceCopy align="left" choice={smartMedCenterChoices[0]} />
          </Reveal>
          <Reveal delay={0.08}>
            <CenterChoiceCopy align="right" choice={smartMedCenterChoices[1]} />
          </Reveal>
        </div>
      </div>

      <WaveSeparator className="translate-y-8 sm:translate-y-10" fill="teal" />
    </section>
  );
}

type CenterChoice = (typeof smartMedCenterChoices)[number];
type SmartTrainingChoice = (typeof smartTrainingChoices)[number];
type SmartEcosystemChoice = (typeof smartEcosystemChoices)[number];

function CenterLungsVisual() {
  return (
    <svg
      aria-label="Centru online și centru fizic conectate prin Centrul SmartMed"
      className="smartmed-lungs-visual relative z-10 mx-auto h-auto w-full"
      focusable="false"
      role="img"
      viewBox="0 0 1440 720"
    >
      <defs>
        <mask
          height="1040"
          id="smartmed-left-lung-mask"
          maskUnits="userSpaceOnUse"
          width="1800"
          x="-180"
          y="-120"
        >
          <image
            height="941"
            href="/assets/generated/smartmed-center-left-lung-mask.png"
            preserveAspectRatio="xMidYMid meet"
            transform={centerVisualTransform}
            width="1672"
            x="0"
            y="0"
          />
        </mask>
        <mask
          height="1040"
          id="smartmed-right-lung-mask"
          maskUnits="userSpaceOnUse"
          width="1800"
          x="-180"
          y="-120"
        >
          <image
            height="941"
            href="/assets/generated/smartmed-center-right-lung-mask.png"
            preserveAspectRatio="xMidYMid meet"
            transform={centerVisualTransform}
            width="1672"
            x="0"
            y="0"
          />
        </mask>
        <filter
          colorInterpolationFilters="sRGB"
          height="150%"
          id="smartmed-lung-outer-glow"
          width="150%"
          x="-25%"
          y="-25%"
        >
          <feMorphology
            in="SourceAlpha"
            operator="dilate"
            radius="13"
            result="haloGrow"
          />
          <feGaussianBlur in="haloGrow" result="haloBlur" stdDeviation="18" />
          <feFlood floodColor="#8fcfd6" floodOpacity="0.98" result="haloColor" />
          <feComposite in="haloColor" in2="haloBlur" operator="in" result="halo" />
          <feMorphology
            in="SourceAlpha"
            operator="dilate"
            radius="4"
            result="rimGrow"
          />
          <feGaussianBlur in="rimGrow" result="rimBlur" stdDeviation="5" />
          <feFlood floodColor="#e8ffff" floodOpacity="0.72" result="rimColor" />
          <feComposite in="rimColor" in2="rimBlur" operator="in" result="rim" />
          <feMerge result="mergedGlow">
            <feMergeNode in="halo" />
            <feMergeNode in="rim" />
          </feMerge>
          <feComposite
            in="mergedGlow"
            in2="SourceAlpha"
            operator="out"
            result="outerGlow"
          />
          <feMerge>
            <feMergeNode in="outerGlow" />
          </feMerge>
        </filter>
      </defs>

      <g aria-hidden="true" focusable="false">
        <image
          className="smartmed-lung-mask-glow smartmed-lung-online-glow"
          filter="url(#smartmed-lung-outer-glow)"
          height="941"
          href="/assets/generated/smartmed-center-left-lung-mask.png"
          preserveAspectRatio="xMidYMid meet"
          transform={centerVisualTransform}
          width="1672"
          x="0"
          y="0"
        />
        <image
          className="smartmed-lung-mask-glow smartmed-lung-physical-glow"
          filter="url(#smartmed-lung-outer-glow)"
          height="941"
          href="/assets/generated/smartmed-center-right-lung-mask.png"
          preserveAspectRatio="xMidYMid meet"
          transform={centerVisualTransform}
          width="1672"
          x="0"
          y="0"
        />
      </g>

      <g mask={centerLungImageLayers.online.mask}>
        <g className="smartmed-lung-photo smartmed-lung-online-photo">
          <image
            height={centerLungImageLayers.online.height}
            href={centerLungImageLayers.online.href}
            preserveAspectRatio={centerLungImageLayers.online.preserveAspectRatio}
            width={centerLungImageLayers.online.width}
            x={centerLungImageLayers.online.x}
            y={centerLungImageLayers.online.y}
          />
        </g>
      </g>
      <g mask={centerLungImageLayers.physical.mask}>
        <g className="smartmed-lung-photo smartmed-lung-physical-photo">
          <image
            height={centerLungImageLayers.physical.height}
            href={centerLungImageLayers.physical.href}
            preserveAspectRatio={centerLungImageLayers.physical.preserveAspectRatio}
            width={centerLungImageLayers.physical.width}
            x={centerLungImageLayers.physical.x}
            y={centerLungImageLayers.physical.y}
          />
        </g>
      </g>

      <image
        aria-hidden="true"
        className="smartmed-lung-overlay"
        height="941"
        href="/assets/generated/smartmed-center-frame-overlay.png"
        preserveAspectRatio="xMidYMid meet"
        transform={centerVisualTransform}
        width="1672"
        x="0"
        y="0"
      />

      <g aria-hidden="true" focusable="false" transform={centerVisualTransform}>
        <path
          className="smartmed-choice-online-trigger smartmed-lung-hit-area"
          d="M154 671C118 545 145 372 214 244C290 102 450 20 542 74C603 110 608 242 640 309C681 396 632 526 555 568C488 604 371 612 270 666C215 695 174 704 154 671Z"
        />
        <path
          className="smartmed-choice-physical-trigger smartmed-lung-hit-area"
          d="M1491 671C1522 547 1485 368 1417 238C1337 85 1180 21 1086 75C1022 112 1021 252 990 324C952 411 995 532 1072 568C1165 612 1305 609 1404 668C1454 698 1482 700 1491 671Z"
        />
      </g>
    </svg>
  );
}

function CenterChoiceCopy({
  choice,
  align,
}: {
  choice: CenterChoice;
  align: "left" | "right";
}) {
  const Icon = choice.icon;
  const isOnline = choice.tone === "online";

  return (
    <div
      className={cn(
        "smartmed-choice-copy mx-auto max-w-[17rem] text-center text-smart-ink 2xl:max-w-[19rem]",
        align === "right" ? "xl:ml-auto" : "xl:mr-auto",
        isOnline
          ? "smartmed-choice-online-copy smartmed-choice-online-trigger"
          : "smartmed-choice-physical-copy smartmed-choice-physical-trigger",
      )}
    >
      <span
        className={cn(
          "mx-auto flex size-14 items-center justify-center rounded-full border bg-smart-cream/70 shadow-[0_14px_36px_rgba(79,55,22,0.10)]",
          isOnline
            ? "border-smart-teal/22 text-smart-teal"
            : "border-smart-gold/44 text-smart-gold",
        )}
      >
        <Icon aria-hidden="true" className="size-7" strokeWidth={1.55} />
      </span>
      <h3
        className={cn(
          "smartmed-choice-title mt-5 font-serif text-4xl font-semibold leading-none text-smart-ink sm:text-5xl",
          isOnline ? "smartmed-choice-online-title" : "smartmed-choice-physical-title",
        )}
      >
        {choice.title}
      </h3>
      <div
        className={cn(
          "mx-auto mt-5 h-px w-16",
          isOnline ? "bg-smart-teal/45" : "bg-smart-gold/64",
        )}
      />
      <p className="mx-auto mt-5 whitespace-pre-line text-base leading-7 text-smart-ink/72 sm:text-lg">
        {choice.subtitle}
      </p>
      <ul className="mt-7 grid gap-3 text-left text-sm leading-6 text-smart-ink/76 sm:text-base">
        {choice.benefits.map((benefit) => (
          <li className="flex gap-3" key={benefit}>
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                isOnline
                  ? "border-smart-teal/32 bg-smart-teal/8 text-smart-teal"
                  : "border-smart-gold/48 bg-smart-gold/10 text-smart-gold",
              )}
            >
              <SmartIcon className="size-3.5" name="check" />
            </span>
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CenterChoiceButton({ choice }: { choice: CenterChoice }) {
  const Icon = choice.icon;
  const isOnline = choice.tone === "online";

  return (
    <Link
      className={cn(
        "smartmed-choice-button group inline-grid h-[68px] w-full max-w-[300px] grid-cols-[2rem_1fr_1.75rem] items-center gap-5 rounded-full border border-[#decaa8] bg-[#fbf5ea] px-7 font-serif text-[1.5rem] font-semibold leading-none text-smart-ink shadow-[0_15px_32px_rgba(80,58,26,0.12),inset_0_1px_0_rgba(255,255,255,0.78)] transition-[transform,border-color,box-shadow,background-color] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] hover:-translate-y-px hover:border-[#d6bc8c] hover:bg-[#fff8ee] hover:shadow-[0_18px_40px_rgba(80,58,26,0.15),inset_0_1px_0_rgba(255,255,255,0.88)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold sm:w-[300px]",
        isOnline ? "smartmed-choice-online-trigger" : "smartmed-choice-physical-trigger",
      )}
      href={choice.href}
    >
      <Icon
        aria-hidden="true"
        className="size-8 shrink-0 text-smart-gold"
        strokeWidth={1.55}
      />
      <span className="min-w-0 whitespace-nowrap text-left">{choice.title}</span>
      <ArrowRight
        aria-hidden="true"
        className="size-7 shrink-0 text-smart-gold transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:translate-x-0.5"
        strokeWidth={1.7}
      />
    </Link>
  );
}

function SmartTrainingSection() {
  const grileChoice = smartTrainingChoices[0];
  const simulationChoice = smartTrainingChoices[1];

  return (
    <section className="smart-training-section relative isolate overflow-hidden bg-smart-cream px-5 pb-36 pt-24 text-smart-ink sm:px-7 sm:pb-40 sm:pt-28 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(200,168,117,0.14),transparent_66%)]" />
      <div className="relative z-10 mx-auto max-w-[1620px]">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel tone="cream">Antrenament aplicat</SectionLabel>
            <h2 className="mt-3 font-serif text-5xl font-semibold leading-none tracking-[-0.015em] text-smart-ink sm:text-6xl lg:text-7xl">
              Exersează cu sens
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-smart-ink/66 sm:text-lg">
              Grile structurate și simulări realiste, calibrate pentru pregătirea ta de admitere.
            </p>
          </div>
        </Reveal>

        <div className="mt-9 xl:grid xl:grid-cols-[minmax(190px,0.58fr)_minmax(560px,1.45fr)_minmax(190px,0.58fr)] xl:items-center xl:gap-6 2xl:gap-10">
          <Reveal className="hidden xl:block" delay={0.05}>
            <TrainingChoiceCopy align="left" choice={grileChoice} />
          </Reveal>

          <Reveal className="relative mx-auto w-full max-w-[620px]" delay={0.02} y={16}>
            <BrainTrainingVisual leftHref={grileChoice.href} rightHref={simulationChoice.href} />
          </Reveal>

          <Reveal className="hidden xl:block" delay={0.05}>
            <TrainingChoiceCopy align="right" choice={simulationChoice} />
          </Reveal>
        </div>

        <div className="mx-auto mt-8 grid max-w-4xl gap-10 md:grid-cols-2 xl:hidden">
          <Reveal delay={0.04}>
            <TrainingChoiceCopy align="left" choice={grileChoice} />
          </Reveal>
          <Reveal delay={0.08}>
            <TrainingChoiceCopy align="right" choice={simulationChoice} />
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6 xl:mt-4">
            <TrainingChoiceButton choice={grileChoice} />
            <TrainingChoiceButton choice={simulationChoice} />
          </div>
        </Reveal>
      </div>

      <WaveSeparator className="translate-y-8 sm:translate-y-10" fill="teal" />
    </section>
  );
}

function BrainTrainingVisual({
  leftHref,
  rightHref,
}: {
  leftHref: SmartTrainingChoice["href"];
  rightHref: SmartTrainingChoice["href"];
}) {
  const brainSrc = "/assets/generated/smartmed-training-brain-cutout.svg";

  return (
    <div
      aria-label="Grile SmartMed și Simulări Smart reprezentate prin două emisfere cerebrale"
      className="smart-training-brain-visual relative isolate mx-auto aspect-square w-full"
      role="img"
    >
      <span className="smart-training-brain-glow smart-training-brain-glow-left" />
      <span className="smart-training-brain-glow smart-training-brain-glow-right" />
      <Image
        alt=""
        aria-hidden="true"
        className="smart-training-brain-half smart-training-brain-half-left"
        height={1440}
        sizes="(max-width: 768px) 88vw, (max-width: 1280px) 50vw, 620px"
        src={brainSrc}
        width={1440}
      />
      <Image
        alt=""
        aria-hidden="true"
        className="smart-training-brain-half smart-training-brain-half-right"
        height={1440}
        sizes="(max-width: 768px) 88vw, (max-width: 1280px) 50vw, 620px"
        src={brainSrc}
        width={1440}
      />
      <Link
        aria-label="Grile SmartMed"
        className="smart-training-brain-hit smart-training-brain-hit-left smart-training-grile-trigger"
        href={leftHref}
        tabIndex={-1}
      >
        <span className="sr-only">Grile SmartMed</span>
      </Link>
      <Link
        aria-label="Simulări Smart"
        className="smart-training-brain-hit smart-training-brain-hit-right smart-training-simulari-trigger"
        href={rightHref}
        tabIndex={-1}
      >
        <span className="sr-only">Simulări Smart</span>
      </Link>
    </div>
  );
}

function TrainingChoiceCopy({
  choice,
  align,
}: {
  choice: SmartTrainingChoice;
  align: "left" | "right";
}) {
  const BadgeIcon = choice.badgeIcon;
  const isGrile = choice.tone === "grile";

  return (
    <div
      className={cn(
        "smart-training-copy mx-auto max-w-[18rem] text-center text-smart-ink",
        isGrile ? "xl:max-w-[30rem]" : "xl:max-w-[29rem] 2xl:max-w-[31rem]",
        align === "right" ? "xl:ml-auto" : "xl:mr-auto",
        isGrile
          ? "smart-training-grile-copy smart-training-grile-trigger"
          : "smart-training-simulari-copy smart-training-simulari-trigger",
      )}
    >
      <span
        className={cn(
          "mx-auto flex size-16 items-center justify-center rounded-full border bg-smart-cream/72 shadow-[0_16px_38px_rgba(79,55,22,0.10)]",
          isGrile
            ? "border-smart-teal/24 text-smart-teal"
            : "border-smart-gold/44 text-smart-gold",
        )}
      >
        <BadgeIcon aria-hidden="true" className="size-8" strokeWidth={1.45} />
      </span>
      <h3
        className={cn(
          "smart-training-copy-title mt-6 font-serif text-4xl font-semibold leading-none text-smart-ink sm:text-5xl",
          isGrile ? "smart-training-grile-title" : "smart-training-simulari-title",
        )}
      >
        {choice.title}
      </h3>
      <div
        className={cn(
          "mx-auto mt-6 h-px w-16",
          isGrile ? "bg-smart-teal/45" : "bg-smart-gold/64",
        )}
      />
      <ul className="mt-7 grid gap-3 text-left text-sm leading-6 text-smart-ink/76 sm:text-base">
        {choice.benefits.map((benefit) => (
          <li className="flex gap-3" key={benefit}>
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                isGrile
                  ? "border-smart-teal/32 bg-smart-teal/8 text-smart-teal"
                  : "border-smart-gold/48 bg-smart-gold/10 text-smart-gold",
              )}
            >
              <SmartIcon className="size-3.5" name="check" />
            </span>
            <span className="xl:whitespace-nowrap">{benefit}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrainingChoiceButton({ choice }: { choice: SmartTrainingChoice }) {
  const Icon = choice.icon;
  const isGrile = choice.tone === "grile";

  return (
    <Link
      className={cn(
        "smart-training-button group inline-grid h-[68px] w-full max-w-[340px] grid-cols-[2rem_1fr_1.75rem] items-center gap-4 rounded-full border border-[#decaa8] bg-[#fbf5ea] px-7 font-serif text-[1.28rem] font-semibold leading-none text-smart-ink shadow-[0_15px_32px_rgba(80,58,26,0.12),inset_0_1px_0_rgba(255,255,255,0.78)] transition-[transform,border-color,box-shadow,background-color] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] hover:-translate-y-px hover:border-[#d6bc8c] hover:bg-[#fff8ee] hover:shadow-[0_18px_40px_rgba(80,58,26,0.15),inset_0_1px_0_rgba(255,255,255,0.88)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold sm:w-[340px] sm:text-[1.38rem]",
        isGrile
          ? "smart-training-grile-button smart-training-grile-trigger"
          : "smart-training-simulari-button smart-training-simulari-trigger",
      )}
      href={choice.href}
    >
      <Icon
        aria-hidden="true"
        className="size-8 shrink-0 text-smart-gold"
        strokeWidth={1.55}
      />
      <span className="min-w-0 whitespace-nowrap text-left">{choice.cta}</span>
      <ArrowRight
        aria-hidden="true"
        className="size-7 shrink-0 text-smart-gold transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:translate-x-0.5"
        strokeWidth={1.7}
      />
    </Link>
  );
}

function SmartEcosystemSection() {
  const blogChoice = smartEcosystemChoices[0];
  const shopChoice = smartEcosystemChoices[1];

  return (
    <section className="smart-ecosystem-section relative isolate overflow-hidden bg-smart-cream px-5 pb-36 pt-16 text-smart-ink sm:px-7 sm:pb-40 sm:pt-20 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,rgba(200,168,117,0.13),transparent_68%)]" />
      <div className="relative z-10 mx-auto max-w-[1900px]">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel tone="cream">Citește, învață, comandă</SectionLabel>
            <h2 className="mt-3 font-serif text-5xl font-semibold leading-none tracking-[-0.015em] text-smart-ink sm:text-6xl lg:text-7xl">
              Ecosistemul SmartMed
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-smart-ink/66 sm:text-lg">
              Articole care clarifică și materiale care te susțin pe parcurs.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 xl:grid xl:grid-cols-[minmax(250px,0.58fr)_minmax(620px,1.34fr)_minmax(250px,0.58fr)] xl:items-center xl:gap-4 min-[1800px]:grid-cols-[minmax(320px,0.66fr)_minmax(980px,1.8fr)_minmax(320px,0.66fr)] min-[1800px]:gap-6">
          <Reveal className="relative z-20 hidden xl:col-start-1 xl:row-start-1 xl:-mt-28 xl:block min-[1800px]:-mt-32" delay={0.05}>
            <EcosystemChoiceCopy align="left" choice={blogChoice} />
          </Reveal>

          <Reveal
            className="relative z-10 mx-auto mt-6 w-full max-w-[980px] xl:col-start-2 xl:row-start-1 xl:max-w-none"
            delay={0.04}
            y={16}
          >
            <EcosystemEyesVisual blogChoice={blogChoice} shopChoice={shopChoice} />
          </Reveal>

          <Reveal className="relative z-20 hidden xl:col-start-3 xl:row-start-1 xl:-mt-28 xl:block min-[1800px]:-mt-32" delay={0.05}>
            <EcosystemChoiceCopy align="right" choice={shopChoice} />
          </Reveal>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-10 md:grid-cols-2 xl:hidden">
          <Reveal delay={0.04}>
            <EcosystemChoiceCopy align="left" choice={blogChoice} showMobileButton />
          </Reveal>
          <Reveal delay={0.08}>
            <EcosystemChoiceCopy align="right" choice={shopChoice} showMobileButton />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function EcosystemEyesVisual({
  blogChoice,
  shopChoice,
}: {
  blogChoice: SmartEcosystemChoice;
  shopChoice: SmartEcosystemChoice;
}) {
  return (
    <div className="mx-auto w-full">
      <div className="relative mx-auto">
        <div className="pointer-events-none absolute inset-x-[12%] bottom-[4%] h-10 rounded-full bg-smart-ink/8 blur-2xl" />
        <Image
          alt="SmartMed Blog și SmartMed Shop reprezentate prin doi iriși uniți în forma infinitului"
          className="relative z-10 h-auto w-full select-none object-contain"
          height={902}
          priority={false}
          sizes="(max-width: 768px) 92vw, (max-width: 1280px) 940px, (max-width: 1536px) 64vw, 1480px"
          src="/assets/generated/smartmed-eyes-infinity.svg"
          unoptimized
          width={1920}
        />
        <div
          aria-hidden="true"
          className="smart-ecosystem-pupil-icon smart-ecosystem-blog-pupil-icon pointer-events-none absolute left-[23.9%] top-[51.3%] z-20 w-[10.2%]"
        >
          <Image
            alt=""
            className="h-auto w-full select-none object-contain"
            height={1022}
            src="/assets/generated/smartmed-ecosystem-blog-icon.png"
            unoptimized
            width={937}
          />
        </div>
        <div
          aria-hidden="true"
          className="smart-ecosystem-pupil-icon smart-ecosystem-shop-pupil-icon pointer-events-none absolute left-[74.2%] top-[51.9%] z-20 w-[10%]"
        >
          <Image
            alt=""
            className="h-auto w-full select-none object-contain"
            height={981}
            src="/assets/generated/smartmed-ecosystem-shop-icon-clean.png"
            unoptimized
            width={765}
          />
        </div>
      </div>
      <div className="mx-auto mt-20 hidden max-w-[760px] grid-cols-2 gap-5 md:grid">
        <EcosystemChoiceButton choice={blogChoice} />
        <EcosystemChoiceButton choice={shopChoice} />
      </div>
    </div>
  );
}

function EcosystemChoiceCopy({
  choice,
  align,
  showMobileButton = false,
}: {
  choice: SmartEcosystemChoice;
  align: "left" | "right";
  showMobileButton?: boolean;
}) {
  const isBlog = choice.tone === "blog";
  const titleSuffix = choice.title.replace(/^SmartMed\s+/, "");

  return (
    <div
      className={cn(
        "smart-ecosystem-copy mx-auto max-w-[21rem] text-center text-smart-ink xl:max-w-[19.5rem] min-[1800px]:max-w-[21rem]",
        align === "right" ? "xl:mr-auto" : "xl:ml-auto",
        isBlog
          ? "smart-ecosystem-blog-copy smart-ecosystem-blog-trigger"
          : "smart-ecosystem-shop-copy smart-ecosystem-shop-trigger",
      )}
    >
      <p
        className={cn(
          "text-[0.72rem] font-bold uppercase tracking-[0.28em]",
          isBlog ? "text-smart-teal" : "text-smart-gold",
        )}
      >
        {choice.label}
      </p>
      <h3
        className={cn(
          "smart-ecosystem-copy-title mt-4 font-serif text-4xl font-semibold leading-none text-smart-ink sm:text-5xl",
          isBlog ? "smart-ecosystem-blog-title" : "smart-ecosystem-shop-title",
        )}
      >
        <span className="block">SmartMed</span>
        <span className="block">{titleSuffix}</span>
      </h3>
      <div
        className={cn(
          "mx-auto mt-5 h-px w-16",
          isBlog ? "bg-smart-teal/45" : "bg-smart-gold/64",
        )}
      />
      <ul className="mx-auto mt-7 grid w-fit max-w-full gap-3 text-left text-sm leading-6 text-smart-ink/76 sm:text-base">
        {choice.benefits.map((benefit) => (
          <li className="flex gap-3" key={benefit}>
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                isBlog
                  ? "border-smart-teal/32 bg-smart-teal/8 text-smart-teal"
                  : "border-smart-gold/48 bg-smart-gold/10 text-smart-gold",
              )}
            >
              <SmartIcon className="size-3.5" name="check" />
            </span>
            <span className="xl:whitespace-nowrap">{benefit}</span>
          </li>
        ))}
      </ul>
      {showMobileButton ? (
        <div className="mt-7 md:hidden">
          <EcosystemChoiceButton choice={choice} />
        </div>
      ) : null}
    </div>
  );
}

function EcosystemChoiceButton({ choice }: { choice: SmartEcosystemChoice }) {
  const Icon = choice.icon;
  const isBlog = choice.tone === "blog";

  return (
    <Link
      className={cn(
        "smart-ecosystem-button group inline-grid h-[68px] w-full max-w-[340px] grid-cols-[2rem_1fr_1.75rem] items-center gap-4 rounded-full border border-[#decaa8] bg-[#fbf5ea] px-7 font-serif text-[1.28rem] font-semibold leading-none text-smart-ink shadow-[0_15px_32px_rgba(80,58,26,0.12),inset_0_1px_0_rgba(255,255,255,0.78)] transition-[transform,border-color,box-shadow,background-color] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] hover:-translate-y-px hover:border-[#d6bc8c] hover:bg-[#fff8ee] hover:shadow-[0_18px_40px_rgba(80,58,26,0.15),inset_0_1px_0_rgba(255,255,255,0.88)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold sm:w-[340px] sm:text-[1.38rem]",
        isBlog
          ? "smart-ecosystem-blog-button smart-ecosystem-blog-trigger"
          : "smart-ecosystem-shop-button smart-ecosystem-shop-trigger",
      )}
      href={choice.href}
    >
      <Icon
        aria-hidden="true"
        className="size-8 shrink-0 text-smart-gold"
        strokeWidth={1.55}
      />
      <span className="min-w-0 whitespace-nowrap text-left">{choice.cta}</span>
      <ArrowRight
        aria-hidden="true"
        className="size-7 shrink-0 text-smart-gold transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:translate-x-0.5"
        strokeWidth={1.7}
      />
    </Link>
  );
}

export function PathChoiceSectionGroup2() {
  return <SmartTrainingSection />;
}

export function PathChoiceSectionGroup3() {
  return <SmartEcosystemSection />;
}
