import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Check,
  CircleGauge,
  ClipboardCheck,
  Compass,
  MapPin,
  MessageCircleMore,
  Navigation,
  RefreshCcw,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { WaveSeparator } from "@/components/ui/WaveSeparator";

import { CentruFizicFaq } from "./centru-fizic-faq";
import { CentruFizicScheduler } from "./centru-fizic-scheduler";
import styles from "./centru-fizic-page.module.css";

const experiencePillars = [
  {
    numeral: "I",
    title: "Explicație vie",
    description:
      "Conceptele sunt legate logic și construite împreună, nu predate ca liste de memorat.",
    icon: BookOpenText,
  },
  {
    numeral: "II",
    title: "Grupe cu ritm",
    description:
      "Un cadru suficient de apropiat pentru întrebări și suficient de riguros pentru progres.",
    icon: UsersRound,
  },
  {
    numeral: "III",
    title: "Aplicare imediată",
    description:
      "Grilele, exercițiile și corectarea intră firesc în firul fiecărei întâlniri.",
    icon: ClipboardCheck,
  },
  {
    numeral: "IV",
    title: "Continuitate",
    description:
      "Pregătirea din sală rămâne conectată cu materialele și parcursul tău SmartMed.",
    icon: RefreshCcw,
  },
] as const;

const preparationRhythm = [
  {
    step: "01",
    title: "Înțelegi",
    description: "Pornim de la mecanism și reconstruim materia într-o ordine care are sens.",
    image: "/images/offer-steps/doctor.png",
  },
  {
    step: "02",
    title: "Aplici",
    description: "Transformăm explicația în grile, exerciții și decizii argumentate.",
    image: "/images/offer-steps/grile.png",
  },
  {
    step: "03",
    title: "Verifici",
    description: "Măsurăm clar ce este stabil și unde mai trebuie intervenit.",
    image: "/images/offer-steps/simulation-physical.png",
  },
  {
    step: "04",
    title: "Consolidezi",
    description: "Revii strategic, corectezi lacunele și transformi progresul în rutină.",
    image: "/images/offer-steps/progress.png",
  },
] as const;

const enrollmentSteps = [
  {
    numeral: "α",
    title: "Ne spui obiectivul",
    description: "Admiterea vizată, punctul de pornire și ritmul în care poți lucra.",
  },
  {
    numeral: "β",
    title: "Avem o discuție",
    description: "Clarificăm nevoile tale și felul în care centrul te poate susține.",
  },
  {
    numeral: "γ",
    title: "Stabilim grupa",
    description: "Alegem varianta de program și cadrul potrivit nivelului tău.",
  },
  {
    numeral: "δ",
    title: "Începi pregătirea",
    description: "Primești reperele de lucru și intri într-un parcurs coerent.",
  },
] as const;

export function CentruFizicLandingPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <Image
          alt=""
          aria-hidden="true"
          className={styles.heroImage}
          fill
          priority
          sizes="100vw"
          src="/assets/generated/path-fizic.png"
        />
        <div className={styles.heroScrim} />
        <div className={styles.heroGrain} />
        <div className={styles.heroGreekFrame} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>
              <Sparkles aria-hidden="true" />
              SmartMed Academy · pregătire în sală
            </p>

            <h1 className={styles.heroTitle}>
              <span>Centrul fizic</span>
              <strong>SmartMed</strong>
            </h1>

            <div className={styles.heroRule} aria-hidden="true">
              <span />
            </div>

            <p className={styles.heroLead}>
              Pregătire care se simte.
              <br />
              Progres care se vede.
            </p>
            <p className={styles.heroDescription}>
              Un spațiu construit pentru explicații clare, lucru aplicat și feedback direct —
              în ritmul exigent, calm și atent al SmartMed Academy.
            </p>

            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="#programare">
                <CalendarDays aria-hidden="true" />
                Programează o vizită
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link className={styles.secondaryButton} href="#experienta">
                Descoperă experiența
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>

            <div className={styles.heroProofs} aria-label="Reperele centrului fizic">
              <span>
                <UsersRound aria-hidden="true" />
                Grupe atent formate
              </span>
              <span>
                <MessageCircleMore aria-hidden="true" />
                Feedback direct
              </span>
              <span>
                <CircleGauge aria-hidden="true" />
                Ritm susținut
              </span>
            </div>
          </div>
        </div>

        <WaveSeparator className={styles.heroWave} fill="cream" variant="relaxed" />
      </section>

      <section className={styles.introSection}>
        <div className={`${styles.sectionInner} ${styles.introGrid}`}>
          <div className={`${styles.introCopy} ${styles.reveal}`}>
            <SectionHeading
              eyebrow="Centrul SmartMed"
              title={
                <>
                  Mai mult decât
                  <br />
                  o sală de curs
                </>
              }
            />
            <p className={styles.introLead}>
              Este locul în care explicația, exercițiul și feedbackul se întâlnesc în aceeași
              sesiune.
            </p>
            <p>
              Fiecare întâlnire urmărește un obiectiv clar: să transformăm materia dificilă
              într-un proces coerent, repetabil și sigur. Lucrăm cu întrebări reale, ritm
              constant și progres urmărit — într-o atmosferă apropiată, dar exigentă.
            </p>
            <div className={styles.introSignature}>
              <span aria-hidden="true">Σ</span>
              <p>
                <strong>Standard SmartMed</strong>
                Claritate în explicație. Rigoare în aplicare. Continuitate în pregătire.
              </p>
            </div>
          </div>

          <div className={`${styles.editorialMedia} ${styles.reveal}`}>
            <div className={styles.editorialFrame}>
              <Image
                alt="Sală de pregătire SmartMed Academy, amenajată în tonuri teal și auriu"
                className={styles.editorialImage}
                fill
                sizes="(max-width: 900px) 92vw, 52vw"
                src="/assets/generated/smartmed-center-physical-class.png"
              />
              <div className={styles.editorialCaption}>
                <span>01</span>
                <p>
                  Spațiu pentru concentrare,
                  <br />
                  comunitate și progres.
                </p>
              </div>
            </div>
            <span className={styles.editorialOrbit} aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className={styles.experienceSection} id="experienta">
        <div className={styles.darkPattern} aria-hidden="true" />
        <div className={styles.sectionInner}>
          <div className={`${styles.centerHeading} ${styles.reveal}`}>
            <SectionHeading
              dark
              eyebrow="Experiența SmartMed"
              title={
                <>
                  Patru principii.
                  <br />
                  Un singur standard.
                </>
              }
              description="Centrul fizic nu schimbă metoda SmartMed. O face mai prezentă, mai apropiată și mai ușor de pus în practică."
            />
          </div>

          <div className={styles.pillarGrid}>
            {experiencePillars.map((item) => {
              const Icon = item.icon;

              return (
                <article className={`${styles.pillarCard} ${styles.reveal}`} key={item.title}>
                  <div className={styles.pillarTopline}>
                    <span className={styles.pillarNumeral}>{item.numeral}</span>
                    <Icon aria-hidden="true" />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.formatsSection}>
        <div className={styles.sectionInner}>
          <div className={`${styles.splitHeading} ${styles.reveal}`}>
            <SectionHeading
              eyebrow="Cum lucrăm"
              title={
                <>
                  Trei momente,
                  <br />
                  același standard
                </>
              }
            />
            <p>
              Explicația, practica și verificarea nu sunt etape separate. Ele se completează
              și se susțin de la o întâlnire la alta.
            </p>
          </div>

          <div className={styles.formatGrid}>
            <article className={`${styles.formatCard} ${styles.reveal}`}>
              <div className={styles.formatVisual}>
                <Image
                  alt="Imagine de prezentare pentru cursurile ghidate din centrul SmartMed"
                  className={styles.formatPhoto}
                  fill
                  sizes="(max-width: 760px) 92vw, 33vw"
                  src="/assets/generated/smartmed-center-physical-class.png"
                />
                <span className={styles.formatTag}>Explicație</span>
              </div>
              <div className={styles.formatCopy}>
                <span>01</span>
                <h3>Curs ghidat</h3>
                <p>Concepte explicate logic, întrebări lămurite și repere clare pentru lucru.</p>
              </div>
            </article>

            <article className={`${styles.formatCard} ${styles.reveal}`}>
              <div className={styles.formatVisual}>
                <Image
                  alt="Manual medical ilustrat, folosit ca imagine de prezentare pentru atelierele aplicate"
                  className={styles.formatPhoto}
                  fill
                  sizes="(max-width: 760px) 92vw, 33vw"
                  src="/assets/generated/feature-courses.png"
                />
                <span className={styles.formatTag}>Aplicare</span>
              </div>
              <div className={styles.formatCopy}>
                <span>02</span>
                <h3>Atelier aplicat</h3>
                <p>Grile și exerciții lucrate atent, cu accent pe raționament și capcane.</p>
              </div>
            </article>

            <article className={`${styles.formatCard} ${styles.reveal}`}>
              <div className={`${styles.formatVisual} ${styles.formatIllustration}`}>
                <div className={styles.formatHalo} aria-hidden="true" />
                <Image
                  alt="Ilustrație academică pentru simulări și feedback în centrul fizic"
                  className={styles.formatIconImage}
                  height={512}
                  sizes="(max-width: 760px) 64vw, 22vw"
                  src="/images/offer-steps/simulation-physical.png"
                  width={512}
                />
                <span className={styles.formatTag}>Verificare</span>
              </div>
              <div className={styles.formatCopy}>
                <span>03</span>
                <h3>Simulare &amp; feedback</h3>
                <p>Testare în condiții controlate și o direcție concretă pentru etapa următoare.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.rhythmSection}>
        <div className={styles.rhythmGlow} aria-hidden="true" />
        <div className={styles.sectionInner}>
          <div className={`${styles.rhythmHeader} ${styles.reveal}`}>
            <SectionHeading
              dark
              eyebrow="Ritmul pregătirii"
              title="O lecție bună continuă și după ce ai ieșit din sală"
              description="Fiecare întâlnire intră într-un circuit clar, astfel încât progresul să nu depindă de inspirație, ci de un proces pe care îl poți repeta."
            />
          </div>

          <div className={styles.rhythmLine} aria-hidden="true" />
          <div className={styles.rhythmGrid}>
            {preparationRhythm.map((item) => (
              <article className={`${styles.rhythmCard} ${styles.reveal}`} key={item.title}>
                <span className={styles.rhythmStep}>{item.step}</span>
                <div className={styles.rhythmIcon}>
                  <Image
                    alt=""
                    aria-hidden="true"
                    height={512}
                    sizes="96px"
                    src={item.image}
                    width={512}
                  />
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.programSection}>
        <div className={styles.sectionInner}>
          <div className={`${styles.centerHeading} ${styles.reveal}`}>
            <SectionHeading
              eyebrow="Programul centrului"
              title="Pregătire construită în jurul obiectivului tău"
              description="Structura finală se stabilește în funcție de nivel, materia aleasă și calendarul admiterii."
            />
          </div>

          <article className={`${styles.programCard} ${styles.reveal}`}>
            <div className={styles.programMain}>
              <p className={styles.programLabel}>Program de pregătire în sală</p>
              <h3>Un cadru complet, de la prima explicație până la evaluare.</h3>
              <ul>
                <li>
                  <Check aria-hidden="true" />
                  Sesiuni structurate pe obiective și capitole
                </li>
                <li>
                  <Check aria-hidden="true" />
                  Materiale de lucru asociate fiecărei etape
                </li>
                <li>
                  <Check aria-hidden="true" />
                  Feedback după exerciții și evaluări
                </li>
                <li>
                  <Check aria-hidden="true" />
                  Continuitate între pregătirea fizică și resursele SmartMed
                </li>
              </ul>
            </div>
            <aside className={styles.programAside}>
              <span>Structură personalizată</span>
              <p>
                Opțiunile de program, disponibilitatea și detaliile administrative se confirmă
                în discuția de orientare.
              </p>
              <Link className={styles.darkButton} href="/contact">
                Cere detalii despre program
                <ArrowRight aria-hidden="true" />
              </Link>
            </aside>
          </article>

          <div className={`${styles.enrollmentHeading} ${styles.reveal}`}>
            <p>Traseul de înscriere</p>
            <h3>Patru pași simpli până la prima întâlnire</h3>
          </div>

          <div className={styles.enrollmentGrid}>
            {enrollmentSteps.map((item) => (
              <article className={`${styles.enrollmentCard} ${styles.reveal}`} key={item.numeral}>
                <span>{item.numeral}</span>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.schedulerSection} id="programare">
        <div className={styles.schedulerPattern} aria-hidden="true" />
        <div className={styles.sectionInner}>
          <div className={`${styles.schedulerHeading} ${styles.reveal}`}>
            <SectionHeading
              dark
              eyebrow="Vizită de orientare"
              title="Alege momentul potrivit pentru prima discuție"
              description="Calendarul de mai jos este orientativ. Selectează o zi și un interval, apoi continuă către formularul de contact pentru confirmare."
            />
          </div>
          <div className={styles.reveal}>
            <CentruFizicScheduler />
          </div>
        </div>
      </section>

      <section className={styles.locationSection}>
        <div className={`${styles.sectionInner} ${styles.locationGrid}`}>
          <div className={`${styles.locationCopy} ${styles.reveal}`}>
            <SectionHeading
              eyebrow="Locația centrului"
              title={
                <>
                  Un loc pentru
                  <br />
                  concentrare reală
                </>
              }
            />
            <p className={styles.locationLead}>
              Adresa exactă va fi afișată aici imediat ce datele centrului sunt confirmate.
            </p>
            <p>
              La confirmarea vizitei vei primi toate indicațiile necesare pentru acces și
              orientare. Nu afișăm o adresă sau un traseu aproximativ.
            </p>

            <div className={styles.locationFacts}>
              <span>
                <Compass aria-hidden="true" />
                Indicații clare la confirmare
              </span>
              <span>
                <Navigation aria-hidden="true" />
                Traseu actualizat înaintea vizitei
              </span>
            </div>

            <Link className={styles.outlineButton} href="/contact">
              Cere indicațiile exacte
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          <div
            aria-label="Placeholder pentru harta și adresa viitorului centru SmartMed"
            className={`${styles.mapCard} ${styles.reveal}`}
            role="img"
          >
            <div className={styles.mapGrid} aria-hidden="true">
              <span className={styles.roadOne} />
              <span className={styles.roadTwo} />
              <span className={styles.roadThree} />
              <span className={styles.mapWater} />
            </div>
            <div className={styles.mapPin}>
              <span>
                <MapPin aria-hidden="true" />
              </span>
              <div>
                <strong>SmartMed Academy</strong>
                <small>Locație de completat</small>
              </div>
            </div>
            <div className={styles.mapLegend}>
              <span>Hartă centru fizic</span>
              <small>Coordonatele vor fi adăugate aici</small>
            </div>
            <span className={styles.mapCornerOne} aria-hidden="true" />
            <span className={styles.mapCornerTwo} aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.sectionInner}>
          <div className={`${styles.faqHeading} ${styles.reveal}`}>
            <SectionHeading
              eyebrow="Întrebări frecvente"
              title="Claritate înainte de primul pas"
              description="Am adunat răspunsurile esențiale despre grupe, program, vizită și legătura cu pregătirea online."
            />
          </div>
          <div className={styles.reveal}>
            <CentruFizicFaq />
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <Image
          alt=""
          aria-hidden="true"
          className={styles.finalCtaImage}
          fill
          sizes="100vw"
          src="/assets/generated/smartmed-center-physical-class.png"
        />
        <div className={styles.finalCtaOverlay} />
        <div className={`${styles.finalCtaInner} ${styles.reveal}`}>
          <p>SmartMed Academy · Centrul fizic</p>
          <h2>Vino să vezi cum arată pregătirea SmartMed, din interior.</h2>
          <div>
            <Link className={styles.primaryButton} href="#programare">
              <CalendarDays aria-hidden="true" />
              Programează o vizită
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className={styles.secondaryButton} href="/contact">
              Vorbește cu echipa
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  dark = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  dark?: boolean;
}) {
  return (
    <div className={`${styles.sectionHeading} ${dark ? styles.sectionHeadingDark : ""}`}>
      <p className={styles.sectionEyebrow}>
        <span aria-hidden="true" />
        {eyebrow}
        <span aria-hidden="true" />
      </p>
      <h2>{title}</h2>
      {description ? <p className={styles.sectionDescription}>{description}</p> : null}
    </div>
  );
}
