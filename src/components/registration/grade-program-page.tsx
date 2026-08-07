import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  FlaskConical,
  GraduationCap,
  HeartHandshake,
  Mail,
  MessageCircle,
  Microscope,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/animations/reveal";
import { OrnamentalDivider } from "@/components/ui/OrnamentalDivider";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { WaveSeparator } from "@/components/ui/WaveSeparator";

import styles from "./grade-program-page.module.css";
import { SupportBenefitsGrid } from "./support-benefits-grid";

export type GradeProgramConfig = {
  admissionYear: string;
  closingCopy?: {
    kicker: string;
    lead: string;
    title: string;
  };
  focusItems: readonly string[];
  focusTitle: string;
  gradeKey: "10" | "11" | "12";
  guide: string;
  lead: string;
  meetingLabel: string;
  programLabel: string;
  title: string;
};

export const gradeTenProgram: GradeProgramConfig = {
  admissionYear: "ADMITERE 2029",
  focusItems: [
    "Parcurgerea structurată a materiei (fără presiunea anului de admitere)",
    "Testări regulate pentru consolidarea bazei",
    "Mentorat constant și ghidare pe termen lung",
    "Strategie de pregătire pentru fiecare an până la admitere",
  ],
  focusTitle: "Până în clasa a 12-a ne vom focusa pe:",
  gradeKey: "10",
  guide: "Lasă-ne să te ghidăm !",
  lead: "Începe strategic din timp cu SmartMed!",
  meetingLabel: "Programează o întâlnire",
  programLabel: "PROGRAM CLASA a X-a",
  title:
    "Începi Clasa a 10-a din septembrie și te pregătești pentru Admiterea din 2029 ?",
};

export const gradeElevenProgram: GradeProgramConfig = {
  admissionYear: "ADMITERE 2028",
  focusItems: [
    "Parcurgerea structurată a materiei (fără presiunea anului de admitere)",
    "Testări regulate pentru consolidarea bazei",
    "Mentorat constant și ghidare pe termen lung",
    "Strategie de pregătire pentru fiecare an până la admitere",
  ],
  focusTitle: "Până în clasa a 12-a ne vom focusa pe:",
  gradeKey: "11",
  guide: "Lasă-ne să te ghidăm !",
  lead: "Începe strategic din timp cu SmartMed!",
  meetingLabel: "Programează o întălnire",
  programLabel: "PROGRAM CLASA a XI-a",
  title:
    "Începi Clasa a 11-a din septembrie și te pregătești pentru Admiterea din 2028 ?",
};

export const gradeTwelveProgram: GradeProgramConfig = {
  admissionYear: "ADMITERE 2027",
  closingCopy: {
    kicker:
      "Rezervă-ți din timp locul în cel mai sigur program de pregătiri pentru admitere",
    lead: "Din septembrie, poți începe pregătirea alături de noi.",
    title: "Asigură-ți succesul cu Pregătirile Intensive SmartMed 2027",
  },
  focusItems: [
    "Parcurgerea structurată a materiei",
    "Testări regulate pentru consolidarea bazei",
    "Mentorat constant și ghidare sub presiune",
    "Strategie de pregătire pentru fiecare lună până la admitere",
  ],
  focusTitle: "Până la finele clasei a 12-a ne vom focusa pe:",
  gradeKey: "12",
  guide: "Lasă-ne să te ghidăm !",
  lead: "Pregateste-te strategic din timp cu MODULELE SPECIALE SMART",
  meetingLabel: "Programează un meeting",
  programLabel: "PROGRAM clasa a XII-a și nu numai",
  title: "Începe pregătirea pentru Admiterea 2027",
};

type PlanTone = "advanced" | "essential" | "performance";

type EnrollmentPlan = {
  choice: string;
  description: string;
  features: readonly string[];
  futurePrice: string;
  ideal: string;
  oldPrice: string;
  price: string;
  sessionCount: string;
  sessionPrice: string;
  slug:
    | "esential-1-materie"
    | "esential-2-materii"
    | "avansat-1-materie"
    | "avansat-2-materii"
    | "performanta-1-materie"
    | "performanta-2-materii";
  title: string;
  tone: PlanTone;
};

const advantages = [
  "Strategie clară pentru anul admiterii",
  "Parcurgerea completă a materiei din timp (începi devreme și construiești baza corect)",
  "Teste susținute săptămânal (primești feedback constant)",
  "Simulări live, pe hârtie și contracronometru)",
] as const;

const protocolSteps = [
  {
    icon: Stethoscope,
    text: "Evaluăm nivelul de pregătire",
  },
  {
    icon: Target,
    text: "Identificăm dificultățile specifice",
  },
  {
    icon: ClipboardCheck,
    text: "Aplicăm intervenții educaționale personalizate",
  },
  {
    icon: Activity,
    text: "Monitorizăm răspunsul la intervenție prin evaluări periodice",
  },
  {
    icon: TrendingUp,
    text: "Optimizăm strategia de învățare în funcție de rezultate",
  },
] as const;

const meetingSteps = [
  "Analizam punctele tale forte și ce te poate tine pe loc",
  "Descoperim ce profil de pregătire ți se potrivește",
  "Recomandăm cel mai potrivit plan",
] as const;

const enrollmentPlans: readonly EnrollmentPlan[] = [
  {
    choice: "Alege 1 materie",
    description:
      "Recomandat celor care vor să parcurgă materia într-un ritm echilibrat, fără presiunea unui program intensiv, dar cu o bază clară și bine structurată",
    features: [
      "4 cursuri live la Centru SM / lună",
      "Materiale de lucru pentru fiecare capitol predat",
      "1 simulare GRATUITĂ lunară pentru verificarea progresului",
      "Acces la 30 grile gratuite / lună pe platforma SM",
      "Sistem performant de analiză a progresului",
      "Feedback personalizat-analiza greșelilor și strategia pe mai departe",
    ],
    futurePrice: "984",
    ideal: "Ideal dacă vrei să consolidezi o disciplină esențială",
    oldPrice: "1080",
    price: "884",
    sessionCount: "4 ședințe /lună",
    sessionPrice: "246",
    slug: "esential-1-materie",
    title: "Abonament Esențial pentru 1 materie",
    tone: "essential",
  },
  {
    choice: "Alege 2 materii",
    description:
      "Recomandat celor care vor să parcurgă materia într-un ritm echilibrat, fără presiunea unui program intensiv, dar cu o bază clară și bine structurată",
    features: [
      "Strategie personalizată pentru 2 materii",
      "8 cursuri live la Centru SM / lună",
      "Materiale de lucru pentru fiecare capitol predat",
      "1 simulare combinată GRATUITĂ lunară pentru verificarea progresului",
      "Acces la 60 grile gratuite / lună pe platforma SM",
      "Integrare între discipline",
      "Sistem performant de analiză a progresului",
      "Feedback personalizat-analiza greșelilor și strategia pe mai departe",
    ],
    futurePrice: "1824",
    ideal: "Ideal dacă vrei șanse reale la admitere",
    oldPrice: "2016",
    price: "1722",
    sessionCount: "8 ședințe/lună",
    sessionPrice: "228",
    slug: "esential-2-materii",
    title: "Abonament Esențial pentru 2 materii",
    tone: "essential",
  },
  {
    choice: "Alege 1 materie",
    description:
      "Pentru cei care vor să parcurgă materia, dar și să verifice săptămânal ce au fixat și ce trebuie reparat",
    features: [
      "4 cursuri live la Centru SM / lună",
      "4 MODULE SPECIALE SM dedicate capitolului ( )",
      "Materiale de lucru pentru fiecare capitol predat",
      "Teme săptămânale din materia parcursă",
      "1 simulare GRATUITĂ lunară pentru verificarea progresului",
      "Acces la 60 grile gratuite / lună pe platforma SM",
      "Sistem performant de analiză a progresului",
      "Feedback personalizat-analiza greșelilor și strategia pe mai departe",
      "Acces la grupul de WhatsApp",
      "Mentorat de grup: întrebari, verificări, recapitulări",
    ],
    futurePrice: "2208",
    ideal: "Ideal dacă vrei să consolidezi o disciplină esențială",
    oldPrice: "2399",
    price: "2112",
    sessionCount: "8 ședințe /lună",
    sessionPrice: "276",
    slug: "avansat-1-materie",
    title: "Abonament Avansat pentru 1 materie",
    tone: "advanced",
  },
  {
    choice: "Alege 2 materii",
    description:
      "Pentru cei care vor să parcurgă materia, dar și să verifice săptămânal ce au fixat și ce trebuie reparat",
    features: [
      "Strategie personalizată pentru 2 materii",
      "8 cursuri live la Centru SM / lună",
      "8 MODULE SPECIALE SM dedicate capitolului predat",
      "Teme săptămânale din materia parcursă",
      "Materiale de lucru pentru fiecare capitol predat",
      "1 simulare combinată GRATUITĂ lunară pentru verificarea progresului",
      "Acces la 120 grile gratuite / lună pe platforma SM",
      "Integrare între discipline",
      "Sistem performant de analiză a progresului",
      "Feedback personalizat-analiza greșelilor și strategia pe mai departe",
      "Acces la grupul de WhatsApp",
      "Mentorat de grup: întrebari, verificări, recapitulări",
      "Acces Gratuit la 1 WORKSHOP PRACTIC la alegere / lună",
    ],
    futurePrice: "3936",
    ideal: "Ideal dacă vrei șanse reale la admitere",
    oldPrice: "4320",
    price: "3840",
    sessionCount: "16 ședințe/ lună",
    sessionPrice: "246",
    slug: "avansat-2-materii",
    title: "Abonament Avansat pentru 2 materii",
    tone: "advanced",
  },
  {
    choice: "Alege 1 materie",
    description:
      "Pentru cei care vor să exceleze la admiterea la medicină și să stăpânească fiecare detaliu din manual",
    features: [
      "*6 MODULE SPECIALE SM live dedicate capitolului ( )",
      "Materiale de lucru pentru fiecare capitol predat",
      "1 simulare lunară pentru verificarea progresului",
      "Acces la 100 grile gratuite / lună pe platforma SM",
      "Sistem performant de analiză a progresului",
      "Feedback personalizat-analiza greșelilor și strategia pe mai departe",
    ],
    futurePrice: "1800",
    ideal: "Ideal dacă vrei să perfecționezi o disciplină esențială",
    oldPrice: "1944",
    price: "1799",
    sessionCount: "6 ședințe/ lună",
    sessionPrice: "300",
    slug: "performanta-1-materie",
    title: "Abonament Performanță pentru 1 materie",
    tone: "performance",
  },
  {
    choice: "Alege 2 materii",
    description:
      "Pentru cei care vor să exceleze la admiterea la medicină și să stăpânească fiecare detaliu din manual",
    features: [
      "Strategie personalizată pentru 2 materii",
      "12 MODULE SPECIALE SM live dedicate capitolului predat",
      "Teme săptămânale din materia parcursă",
      "Materiale de lucru pentru fiecare capitol predat",
      "1 simulare combinată GRATUITĂ lunare pentru verificarea progresului",
      "Acces la 200 grile gratuite / lună pe platforma SM",
      "Integrare între discipline",
      "Sistem performant de analiză a progresului",
      "Feedback personalizat-analiza greșelilor și strategia pe mai departe",
      "Acces la grupul de WhatsApp",
      "Mentorat de grup: întrebari, verificări, recapitulări",
      "Acces Gratuit la 1 WORKSHOP PRACTIC la alegere / lună",
    ],
    futurePrice: "3312",
    ideal: "Ideal dacă vrei șanse reale la BUGET",
    oldPrice: "3600",
    price: "3212",
    sessionCount: "12 ședințe/ lună",
    sessionPrice: "276",
    slug: "performanta-2-materii",
    title: "Abonament Performanță pentru 2 materie",
    tone: "performance",
  },
] as const;

const specialModules = [
  {
    href: "/module-speciale/lectiile-smart",
    image: "/images/special-modules/cards/lectiile-smart.png",
    title: "Lecții SMART",
  },
  {
    href: "/module-speciale/radiografia-smart",
    image: "/images/special-modules/cards/radiografia-smart.png",
    title: "Radiografia SMART",
  },
  {
    href: "/module-speciale/diferentialul-smart",
    image: "/images/special-modules/cards/diferentialul-smart.png",
    title: "Diferențialul SMART",
  },
  {
    href: "/module-speciale/laboratorul-smart",
    image: "/images/special-modules/cards/laboratorul-smart.png",
    title: "Laboratorul SMART",
  },
  {
    href: "/module-speciale/sutura-smart",
    image: "/images/special-modules/cards/sutura-smart.png",
    title: "Sutura SMART",
  },
  {
    href: "/module-speciale/disectia-smart",
    image: "/images/special-modules/cards/disectia-smart.png",
    title: "Disecția SMART",
  },
  {
    href: "/module-speciale/imagistica-smart",
    image: "/images/special-modules/cards/imagistica-smart.png",
    title: "Imagistica SMART",
  },
  {
    href: "/module-speciale/problema-smart",
    image: "/images/special-modules/cards/problema-smart.png",
    title: "Problema SMART",
  },
] as const;

const testLevels = ["Începător", "Intermediar", "Avansat", "Performanța"] as const;

const bonuses: ReadonlyArray<{ icon: LucideIcon; label: string }> = [
  { icon: FileText, label: "Plan Personalizat de studiu" },
  { icon: Clock3, label: "Suport psihologic pentru gestionarea timpului" },
  {
    icon: HeartHandshake,
    label: "Suport psihologic pentru gestionarea stresului examenului",
  },
  { icon: BarChart3, label: "Raport lunar de progres" },
  {
    icon: Mail,
    label:
      "Informare săptămânală prin email a părintelui despre progresul elevului",
  },
  { icon: MessageCircle, label: "Recomandări personalizate de sprijin" },
  { icon: Bell, label: "Alertă automata dacă nivelul scade" },
  { icon: ClipboardCheck, label: "Testarea nivelului" },
];

function planHref(
  config: GradeProgramConfig,
  slug: EnrollmentPlan["slug"],
  source: string | null,
) {
  return (
    "/inscriere/centru?plan=" +
    slug +
    "&clasa=" +
    config.gradeKey +
    "&source=" +
    encodeURIComponent(source ?? "inscriere-clasa-" + config.gradeKey)
  );
}

export function GradeProgramPage({
  config,
  source = null,
}: {
  config: GradeProgramConfig;
  source?: string | null;
}) {
  return (
    <>
      <ProgramHero config={config} />
      <AdvantageSection />
      <ProtocolSection />
      <SupportSection />
      <RoadmapAndProgressSection />
      <TeamSection />
      <PlansSection config={config} source={source} />
      <SpecialModulesSection />
      <LevelTestSection />
      <BonusesSection />
    </>
  );
}

function ProgramHero({ config }: { config: GradeProgramConfig }) {
  return (
    <section
      className={styles.hero}
      data-registration-grade={config.gradeKey}
      data-registration-hero="true"
    >
      <div aria-hidden="true" className={styles.heroBackdrop} />
      <div aria-hidden="true" className={styles.heroStatue}>
        <Image
          alt=""
          className="object-contain object-bottom"
          fill
          loading="eager"
          sizes="(max-width: 1023px) 70vw, 672px"
          src="/assets/generated/smartmed-account-statue.png"
        />
      </div>
      <div className="grain-overlay" />

      <div className={styles.heroInner}>
        <Reveal>
          <div className={styles.heroCopy}>
            <span
              className={styles.admissionBadge}
              data-registration-admission-badge="true"
            >
              {config.admissionYear}
            </span>
            <p className={styles.programLabel}>{config.programLabel}</p>
            <h1>{config.title}</h1>
            <p className={styles.heroLead} data-registration-hero-lead="true">
              {config.lead}
            </p>

            <div className={styles.focusCard} data-registration-focus-card="true">
              <div className={styles.focusCardHeader}>
                <p>{config.focusTitle}</p>
              </div>
              <ul>
                {config.focusItems.map((item) => (
                  <li key={item}>
                    <CheckCircle2 aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className={styles.heroGuide} data-registration-hero-guide="true">
              {config.guide}
            </p>

            <div
              className={styles.heroActions}
              data-registration-hero-actions="true"
            >
              <Link className={styles.primaryButton} href="#abonamente">
                <GraduationCap aria-hidden="true" className="size-5" />
                Alege planul tău
                <ArrowRight aria-hidden="true" className="size-5" />
              </Link>
              <Link className={styles.secondaryButton} href="/evaluare">
                <CalendarDays aria-hidden="true" className="size-5" />
                {config.meetingLabel}
              </Link>
            </div>

            {config.closingCopy ? (
              <div
                className={styles.heroClosing}
                data-registration-closing-copy="true"
              >
                <p>{config.closingCopy.lead}</p>
                <span>{config.closingCopy.kicker}</span>
                <strong>{config.closingCopy.title}</strong>
              </div>
            ) : null}
          </div>
        </Reveal>
      </div>

      <WaveSeparator fill="cream" />
    </section>
  );
}

function AdvantageSection() {
  return (
    <section className={styles.advantageSection}>
      <div className={styles.content}>
        <Reveal>
          <div className={styles.sectionHeading}>
            <SectionLabel tone="cream">Avantajul SmartMed</SectionLabel>
            <h2>Adevăratul avantaj față de competiția ta se obține prin:</h2>
          </div>
        </Reveal>

        <div className={styles.advantageGrid}>
          {advantages.map((item, index) => (
            <Reveal delay={index * 0.05} key={item}>
              <article className={styles.advantageCard}>
                <span>0{index + 1}</span>
                <Check aria-hidden="true" />
                <p>{item}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
      <WaveSeparator fill="teal" />
    </section>
  );
}

function ProtocolSection() {
  return (
    <section className={styles.protocolSection}>
      <div className={styles.content}>
        <Reveal>
          <div className={styles.centeredHeading}>
            <SectionLabel>Cum funcționează SmartMed ?</SectionLabel>
            <h2>Pregătire gândită după protocolul clinic</h2>
          </div>
        </Reveal>

        <ol className={styles.protocolGrid}>
          {protocolSteps.map(({ icon: Icon, text }, index) => (
            <li key={text}>
              <span className={styles.protocolNumber}>{index + 1}</span>
              <span className={styles.protocolIcon}>
                <Icon aria-hidden="true" />
              </span>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </div>
      <WaveSeparator fill="cream" variant="relaxed" />
    </section>
  );
}

function SupportSection() {
  return (
    <section className={styles.supportSection}>
      <div className={styles.content}>
        <Reveal>
          <div className={styles.sectionHeading}>
            <SectionLabel tone="cream">Sprijin până la examen</SectionLabel>
            <h2>Alege nivelul de sprijin potrivit pentru pregătirea ta !</h2>
          </div>
        </Reveal>

        <SupportBenefitsGrid />

        <Reveal>
          <article className={styles.meetingCard}>
            <div className={styles.meetingVisual}>
              <Image
                alt=""
                className="object-contain"
                fill
                sizes="(max-width: 767px) 70vw, 450px"
                src="/assets/generated/feature-contact.png"
              />
            </div>
            <div className={styles.meetingCopy}>
              <p className={styles.meetingEyebrow}>
                cu profesorul responsabil de program
              </p>
              <h3>Programează o întâlnire</h3>
              <strong>Analiză nivelul tău</strong>
              <ul>
                {meetingSteps.map((item) => (
                  <li key={item}>
                    <CheckCircle2 aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link className={styles.primaryButton} href="/evaluare">
                Programeaza un meeting
                <ArrowRight aria-hidden="true" className="size-5" />
              </Link>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  );
}

function RoadmapAndProgressSection() {
  const calendarDays = [
    null,
    null,
    null,
    null,
    null,
    ...Array.from({ length: 31 }, (_, index) => index + 1),
    null,
    null,
    null,
    null,
    null,
    null,
  ];
  const courseDays = new Set([3, 10, 17, 24, 31]);
  const reviewDays = new Set([6, 13, 20, 27]);

  return (
    <section className={styles.roadmapSection} data-admission-calendar-section="true">
      <div className={styles.content}>
        <div className={styles.roadmapStack}>
          <Reveal>
            <article className={styles.roadmapPanel}>
              <div className={styles.calendarHeading}>
                <div>
                  <SectionLabel>Calendarul admiterii tale</SectionLabel>
                  <h2>Traseul tău structurat până la în clasa a XII-a</h2>
                </div>
                <p>
                  Vezi dintr-o privire ritmul cursurilor, testărilor și
                  recapitulărilor care îți construiesc progresul lună de lună.
                </p>
              </div>

              <div className={styles.calendarFilters} aria-label="Filtre calendar">
                <span>Alege Centru de pregătire</span>
                <span>Alege Materia</span>
              </div>

              <div className={styles.admissionCalendarLayout}>
                <div className={styles.admissionCalendar}>
                  <div className={styles.calendarMonthBar}>
                    <span aria-hidden="true">‹</span>
                    <strong>AUGUST 2026</strong>
                    <span aria-hidden="true">›</span>
                  </div>

                  <div className={styles.calendarWeekdays} aria-hidden="true">
                    {[
                      "LUN",
                      "MAR",
                      "MIE",
                      "JOI",
                      "VIN",
                      "SÂM",
                      "DUM",
                    ].map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>

                  <div className={styles.calendarDays}>
                    {calendarDays.map((day, index) => {
                      const isCourse = day !== null && courseDays.has(day);
                      const isReview = day !== null && reviewDays.has(day);

                      return (
                        <div
                          className={styles.calendarDay}
                          data-calendar-day={day ?? undefined}
                          key={String(day) + "-" + index}
                        >
                          {day ? <span>{day}</span> : null}
                          {isCourse ? (
                            <i
                              aria-label="Curs"
                              className={styles.courseMarker}
                            />
                          ) : null}
                          {isReview ? (
                            <i
                              aria-label="Testare și recapitulare"
                              className={styles.reviewMarker}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className={styles.calendarKey}>
                    <span>
                      <i className={styles.courseMarker} /> Curs
                    </span>
                    <span>
                      <i className={styles.reviewMarker} /> Testare +
                      Recapitulare
                    </span>
                  </div>
                  <p className={styles.calendarNote}>
                    * Se ține cont de sărbătorile legale, iar orarul se
                    adaptează după acestea.
                  </p>
                </div>

                <aside className={styles.calendarEventGuide}>
                  <article>
                    <strong>
                      <i className={styles.courseMarker} /> Curs
                    </strong>
                    <p>
                      Curs LIVE de predare de la 0 cu profesorul și consolidăm
                      baza materiei de admitere.
                    </p>
                  </article>
                  <article>
                    <strong>
                      <i className={styles.reviewMarker} /> Testare +
                      Recapitulare
                    </strong>
                    <ul>
                      <li>Testare LIVE pe baza materiei predate.</li>
                      <li>Recapitulări aplicate alături de profesor.</li>
                      <li>Clarifici cele mai importante aspecte din curs.</li>
                    </ul>
                  </article>
                </aside>
              </div>
            </article>
          </Reveal>

          <Reveal>
            <article className={styles.progressPanel}>
              <div className={styles.progressHeading}>
                <SectionLabel>Pregătire personalizată</SectionLabel>
                <h2>Progresul tău mai clar ca niciodată</h2>
                <p>
                  Monitorizăm, analizăm și optimizăm pregătirea ta pe baza
                  rezultatelor reale.
                </p>
              </div>
              <div className={styles.progressDashboard} aria-hidden="true">
                <div className={styles.progressStat}>
                  <span>82%</span>
                  <i>progres</i>
                </div>
                <div className={styles.progressChart}>
                  {[42, 55, 49, 68, 74, 88].map((height, index) => (
                    <i key={index} style={{ height: String(height) + "%" }} />
                  ))}
                </div>
                <div className={styles.progressMeta}>
                  <span>
                    <CheckCircle2 />
                  </span>
                  <span>
                    <TrendingUp />
                  </span>
                  <span>
                    <BarChart3 />
                  </span>
                </div>
              </div>
            </article>
          </Reveal>
        </div>
      </div>
      <WaveSeparator fill="teal" />
    </section>
  );
}

function TeamSection() {
  const teamCards = [
    {
      icon: Stethoscope,
      label: "Profesor",
      text: "direcția academică",
    },
    {
      icon: Users,
      label: "Mentorii",
      text: "întrebări și verificări",
    },
    {
      icon: Microscope,
      label: "Workshopuri",
      text: "recapitulări aplicate",
    },
  ] as const;

  return (
    <section className={styles.teamSection}>
      <div className={styles.content}>
        <Reveal>
          <div className={styles.teamIntro}>
            <div>
              <SectionLabel>Cine te pregătește pentru admitere?</SectionLabel>
              <h2>Ai alături o echipă care te ține în mișcare</h2>
            </div>
            <p>
              Profesorul coordonează direcția academică, Mentorii completează
              pregătirea prin întrebări, verificări, recapitulări și workshopuri
            </p>
          </div>
        </Reveal>

        <div className={styles.teamGrid}>
          {teamCards.map(({ icon: Icon, label, text }, index) => (
            <Reveal delay={index * 0.06} key={label}>
              <article className={styles.teamCard}>
                <div className={styles.teamPortrait}>
                  <span aria-hidden="true">0{index + 1}</span>
                  <Icon aria-hidden="true" />
                </div>
                <p>{label}</p>
                <span>{text}</span>
              </article>
            </Reveal>
          ))}
        </div>

        <div className={styles.teamAction}>
          <Link className={styles.secondaryButton} href="/despre">
            Descoperă cine este alături de tine
            <ArrowRight aria-hidden="true" className="size-5" />
          </Link>
        </div>
      </div>
      <WaveSeparator fill="cream" />
    </section>
  );
}

function PlansSection({
  config,
  source,
}: {
  config: GradeProgramConfig;
  source: string | null;
}) {
  return (
    <section className={styles.plansSection} id="abonamente">
      <div className={styles.content}>
        <Reveal>
          <div className={styles.plansHeading}>
            <SectionLabel tone="cream">Alege planul tău</SectionLabel>
            <h2>
              Alege PLANUL SMARTMED INTENSIV
              <span>Admitere 2029</span>
            </h2>
            <p>INSCRIE-TE ACUM și beneficiezi de cel mai bun preț!</p>
            <strong>CURSURILE ÎNCEP ÎN SEPTEMBRIE 2026</strong>
          </div>
        </Reveal>

        <div className={styles.planGrid} data-plan-grid="true">
          {enrollmentPlans.map((plan, index) => (
            <Reveal className="h-full" delay={(index % 2) * 0.05} key={plan.slug}>
              <PlanCard config={config} plan={plan} source={source} />
            </Reveal>
          ))}
        </div>
      </div>
      <WaveSeparator fill="teal" />
    </section>
  );
}

function PlanCard({
  config,
  plan,
  source,
}: {
  config: GradeProgramConfig;
  plan: EnrollmentPlan;
  source: string | null;
}) {
  const planClassName = [
    styles.planCard,
    plan.tone === "essential"
      ? styles.essential
      : plan.tone === "advanced"
        ? styles.advanced
        : styles.performance,
  ].join(" ");

  return (
    <article className={planClassName}>
      <div className={styles.planTopline}>
        <span>{plan.tone === "essential" ? "ESENȚIAL" : plan.tone === "advanced" ? "AVANSAT" : "PERFORMANȚĂ"}</span>
        <span>
          ȘEDINȚA <strong>{plan.sessionPrice}</strong>
        </span>
      </div>

      <h3>{plan.title}</h3>
      <p className={styles.planDescription}>{plan.description}</p>
      <p className={styles.planIdeal}>{plan.ideal}</p>

      <div className={styles.planPrice}>
        <div>
          <span className={styles.oldPrice}>{plan.oldPrice}</span>
          <strong>{plan.price}ron /</strong>
          <span>materie / lună</span>
        </div>
        <p>{plan.sessionCount}</p>
      </div>

      <div className={styles.planFeaturePanel}>
        <p>Planul include</p>
        <ul>
          {plan.features.map((feature) => (
            <li key={feature}>
              <Check aria-hidden="true" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.planFooter}>
        <p>
          <strong>Locuri limitate pentru seria 2029</strong>
          Preînscrie-te pentru a-ți rezerva locul la acest preț pe toată durata
          pregătirilor tale, deoarece prețul urmează să crească
          <span>la {plan.futurePrice} ron/materie/lună</span>
        </p>
        <div className={styles.planActions}>
          <Link
            aria-label={`${plan.choice} — ${plan.title}`}
            className={styles.planButton}
            href={planHref(config, plan.slug, source)}
          >
            {plan.choice}
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link
            aria-label={`Programează un meeting — ${plan.title}`}
            className={styles.planMeeting}
            href="/evaluare"
          >
            Programează un meeting
          </Link>
        </div>
      </div>
    </article>
  );
}

function SpecialModulesSection() {
  return (
    <section className={styles.modulesSection}>
      <div className={styles.wideContent}>
        <Reveal>
          <div className={styles.modulesIntro}>
            <div>
              <SectionLabel>Module speciale</SectionLabel>
              <h2>Alegi doar ceea ce ai nevoie</h2>
            </div>
            <div>
              <p>
                Poți alege să participi la MODULELE SPECIALE chiar dacă nu faci
                parte dintre cursanții noștrii sau ai achiziționat un alt tip de
                abonament.
              </p>
              <p>
                Urmărești lunar ce capitole sunt abordate la Centru, studiezi
                modulele aferente și alegi doar ceea ce ai nevoie
              </p>
              <strong>Prețul unui Modul este 324 lei</strong>
            </div>
          </div>
        </Reveal>

        <div className={styles.moduleGrid}>
          {specialModules.map((module) => (
            <Link className={styles.moduleCard} href={module.href} key={module.title}>
              <div>
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="(max-width: 639px) 80vw, (max-width: 1279px) 40vw, 350px"
                  src={module.image}
                />
              </div>
              <span>
                <strong>{module.title}</strong>
                <small>
                  Vezi modulul
                  <ArrowRight aria-hidden="true" />
                </small>
              </span>
            </Link>
          ))}
        </div>
      </div>
      <WaveSeparator fill="cream" />
    </section>
  );
}

function LevelTestSection() {
  return (
    <section className={styles.testSection}>
      <div className={styles.content}>
        <Reveal>
          <div className={styles.testIntro}>
            <span className={styles.testIcon}>
              <FlaskConical aria-hidden="true" />
            </span>
            <div>
              <SectionLabel tone="cream">Test orientativ</SectionLabel>
              <h2>
                Rezolvă testul rapid GRATUIT
                <span>pentru alegerea nivelului potrivit</span>
              </h2>
              <p>Acesta este doar un test orientativ</p>
              <p>
                Sunt 10 întrebări din materia pentru admitere și dacă răspunzi
                corect la cel puțin 6 din acestea îți recomandăm să susții
                testarea oficială de nivel.
              </p>
            </div>
          </div>
        </Reveal>

        <div className={styles.subjectGrid}>
          {["Chimie", "Biologie"].map((subject) => (
            <article className={styles.subjectCard} key={subject}>
              <div className={styles.subjectHeader}>
                <span>
                  {subject === "Chimie" ? (
                    <FlaskConical aria-hidden="true" />
                  ) : (
                    <Microscope aria-hidden="true" />
                  )}
                </span>
                <h3>{subject}</h3>
              </div>
              <div className={styles.levelList}>
                {testLevels.map((level, index) => (
                  <div key={level}>
                    <span>{level}</span>
                    {index === 0 ? (
                      <p>presupune începerea de la 0 a materiei fără testare !</p>
                    ) : (
                      <Link
                        aria-label={`Începe testul de ${subject} — nivel ${level}`}
                        href="/grile"
                      >
                        Începe testul
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <p className={styles.subjectNote}>
          este exclusiv recapitulativ, de fixare a noțiunilor dificile și
          îmbunătățire a timpului de lucru
        </p>

        <OrnamentalDivider className="my-12 sm:my-16" />

        <p className={styles.testAlternative}>Sau</p>

        <Reveal>
          <article className={styles.attentionCard}>
            <span>ATENȚIE!!</span>
            <div>
              <p>
                Dacă nu știi ce tip de abonament ți se potrivește și ai nevoie
                de clarificări suplimentare, mentorii SMARTMED îți stau la
                dispoziție
              </p>
              <p>
                În cazul în care nu vei reuși să ajungi la rezultatul dorit nu
                trebuie să fii dezamăgit, ci să alegi un nivel care să ți se
                potrivească
              </p>
            </div>
            <Link className={styles.secondaryButton} href="/evaluare">
              Programează o întâlnire
              <ArrowRight aria-hidden="true" />
            </Link>
          </article>
        </Reveal>
      </div>
      <WaveSeparator fill="teal" />
    </section>
  );
}

function BonusesSection() {
  return (
    <section className={styles.bonusesSection}>
      <div className={styles.content}>
        <Reveal>
          <div className={styles.centeredHeading}>
            <SectionLabel>Incluse fără costuri suplimentare</SectionLabel>
            <h2>
              Bonusuri incluse în TOATE TIPURILE de abonament, fără costuri
              suplimentare
            </h2>
          </div>
        </Reveal>

        <div className={styles.bonusGrid}>
          {bonuses.map(({ icon: Icon, label }) => (
            <article className={styles.bonusCard} key={label}>
              <span>
                <Icon aria-hidden="true" />
              </span>
              <p>{label}</p>
            </article>
          ))}
        </div>

        <Reveal>
          <div className={styles.finalCta}>
            <span>
              <ShieldCheck aria-hidden="true" />
            </span>
            <div>
              <p>Lasă-ne să te ghidăm !</p>
              <h2>Alege planul care te apropie de Medicină.</h2>
            </div>
            <Link className={styles.primaryButton} href="#abonamente">
              <Sparkles aria-hidden="true" />
              Alege planul tău
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
