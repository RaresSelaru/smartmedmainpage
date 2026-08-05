import Link from "next/link";
import {
  ArrowRight,
  Check,
  Laptop,
  MapPin,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { sectionEyebrowClassName } from "@/components/home/PreparationSystemSection";
import { cn } from "@/lib/utils";

import styles from "./SubscriptionPlansSection.module.css";

type Plan = {
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  features: string[];
  icon: LucideIcon;
  tone: "online" | "center" | "modules";
  badge?: string;
};

type SubscriptionPlansContext = {
  clasa?: string | string[];
  source?: string | string[];
};

type SubscriptionPlansSectionProps = {
  context?: SubscriptionPlansContext;
};

const allowedClasses = new Set(["10", "11", "12"]);
const allowedSources = new Set([
  "homepage-admitere",
  "centru-fizic-intro",
  "centru-fizic",
]);

const plans: Plan[] = [
  {
    slug: "online-esential",
    name: "Online Esențial",
    eyebrow: "Baza digitală",
    description:
      "Pentru un ritm flexibil și o pregătire organizată, oriunde te-ai afla.",
    features: [
      "Cursuri online live",
      "Acces la platforma SmartMed",
      "Materiale și progres într-un singur loc",
    ],
    icon: Laptop,
    tone: "online",
  },
  {
    slug: "centru-plus",
    name: "Centru Plus",
    eyebrow: "Pregătire față în față",
    description:
      "Pentru interacțiune directă, ritm de grup și experiența completă a centrului.",
    features: [
      "Meditații la Centrul SmartMed",
      "Module speciale selectate",
      "Feedback direct și ritm de grup",
    ],
    icon: MapPin,
    tone: "center",
    badge: "Recomandat",
  },
  {
    slug: "module-signature",
    name: "Module Signature",
    eyebrow: "Experiențe tematice",
    description:
      "Pentru aprofundare punctuală prin experiențe speciale, fără un program de cursuri.",
    features: [
      "Acces exclusiv la module speciale",
      "Ateliere tematice și experiențe aplicate",
      "Fără cursuri recurente incluse",
    ],
    icon: Sparkles,
    tone: "modules",
  },
];

export function SubscriptionPlansSection({ context }: SubscriptionPlansSectionProps) {
  const safeContext = {
    clasa: getAllowlistedValue(context?.clasa, allowedClasses),
    source: getAllowlistedValue(context?.source, allowedSources),
  };

  return (
    <section
      aria-labelledby="abonamente-title"
      className={cn(
        "relative isolate overflow-hidden px-5 py-24 sm:px-7 lg:px-8 lg:py-[var(--smart-desktop-section-space)]",
        styles.section,
      )}
      id="abonamente"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-smart-gold/55 to-transparent"
      />
      <div className="relative z-10 mx-auto max-w-7xl">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center text-smart-ink">
            <p className={sectionEyebrowClassName}>Abonamente SmartMed</p>
            <h2
              className="mt-4 font-serif text-5xl font-semibold leading-[0.92] tracking-[-0.035em] sm:text-6xl lg:text-[64px]"
              id="abonamente-title"
            >
              Alege cum vrei să începi
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-smart-ink/68 sm:text-lg">
              Întâi alegi experiența potrivită, apoi completăm împreună înscrierea.
              Structura este orientativă și nu presupune nicio plată în acest pas.
            </p>
          </div>
        </Reveal>

        <div
          aria-label="Pașii înscrierii"
          className="mx-auto mt-9 flex w-fit items-center gap-3 rounded-full border border-smart-ink/10 bg-white/45 px-5 py-3 text-xs font-extrabold uppercase tracking-[0.15em] text-smart-ink/62 shadow-[0_12px_34px_rgba(3,17,28,0.07)] sm:gap-5 sm:px-7"
          role="group"
        >
          <span className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-smart-teal text-smart-white">1</span>
            Abonament
          </span>
          <ArrowRight aria-hidden="true" className="size-4 text-smart-gold" />
          <span className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-smart-gold text-smart-ink">2</span>
            Înscriere
          </span>
        </div>

        <div className="mt-12 grid items-stretch gap-6 lg:mt-10 lg:grid-cols-3 lg:gap-6">
          {plans.map((plan, index) => (
            <Reveal className="h-full" delay={0.06 * index} key={plan.slug}>
              <PlanCard context={safeContext} plan={plan} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  context,
  plan,
}: {
  context: { clasa?: string; source?: string };
  plan: Plan;
}) {
  const Icon = plan.icon;
  const headingId = `plan-${plan.slug}`;
  const href = buildPlanHref(plan.slug, context);

  return (
    <article
      aria-labelledby={headingId}
      className={cn("p-6 sm:p-8 lg:p-7", styles.card, styles[plan.tone])}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={cn(
            "flex size-14 items-center justify-center rounded-2xl border shadow-[0_12px_30px_rgba(3,17,28,0.08)]",
            styles.iconBadge,
          )}
        >
          <Icon aria-hidden="true" className="size-6" strokeWidth={1.8} />
        </span>
        {plan.badge ? (
          <span className="rounded-full border border-smart-gold/52 bg-smart-gold/13 px-4 py-2 text-[0.66rem] font-extrabold uppercase tracking-[0.18em] text-[#8c642e]">
            {plan.badge}
          </span>
        ) : (
          <span className="pt-2 text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-smart-ink/35">
            Selecție flexibilă
          </span>
        )}
      </div>

      <p
        className={cn(
          "mt-8 text-[0.69rem] font-extrabold uppercase tracking-[0.22em] lg:mt-7",
          styles.accentText,
        )}
      >
        {plan.eyebrow}
      </p>
      <h3
        className="mt-3 font-serif text-4xl font-semibold leading-none tracking-[-0.025em] text-smart-ink sm:text-[2.65rem] lg:text-[38px]"
        id={headingId}
      >
        {plan.name}
      </h3>
      <p className="mt-5 min-h-[5.25rem] text-[0.95rem] leading-7 text-smart-ink/65">
        {plan.description}
      </p>

      <div className="my-7 h-px bg-gradient-to-r from-smart-ink/13 via-smart-ink/7 to-transparent lg:my-6" />
      <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-smart-ink/52">
        Include
      </p>
      <ul className="mt-5 grid gap-4 text-sm font-semibold leading-6 text-smart-ink/76">
        {plan.features.map((feature) => (
          <li className="flex gap-3" key={feature}>
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                styles.checkBadge,
              )}
            >
              <Check aria-hidden="true" className="size-3.5" strokeWidth={2.4} />
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-9 lg:pt-8">
        <Link
          aria-label={`Alege abonamentul ${plan.name}`}
          className={styles.planLink}
          href={href}
        >
          <span>Alege {plan.name}</span>
          <ArrowRight aria-hidden="true" className="size-5" />
        </Link>
        <p className="mt-4 text-center text-[0.67rem] font-bold uppercase tracking-[0.14em] text-smart-ink/38">
          Continui fără plată
        </p>
      </div>
    </article>
  );
}

function getAllowlistedValue(
  value: string | string[] | undefined,
  allowlist: ReadonlySet<string>,
) {
  if (typeof value !== "string" || !allowlist.has(value)) return undefined;
  return value;
}

function buildPlanHref(
  plan: string,
  context: { clasa?: string; source?: string },
) {
  const params = new URLSearchParams({ plan });

  if (context.clasa) params.set("clasa", context.clasa);
  if (context.source) params.set("source", context.source);

  return `/inscriere/centru?${params.toString()}`;
}
