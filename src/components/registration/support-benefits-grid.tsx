"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Target,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import styles from "./grade-program-page.module.css";

type SupportBenefit = {
  footer?: {
    label: string;
    text: string;
  };
  icon: LucideIcon;
  image: string;
  imagePosition?: string;
  points: readonly string[];
  slug: string;
  subtitle: string;
  title: string;
};

const supportBenefits: readonly SupportBenefit[] = [
  {
    icon: Users,
    image: "/assets/registration/support-details/mentorat.png",
    points: [
      "1 Mentor/grupă-student la Medicină",
      "Grup de WhatsApp pentru întrebări rapide din materia de admitere, grilele din broșurile de teste, simulări sau admiteri anterioare",
      "Plan de studiu personalizat și ajustat lunar",
      "Suport emoțional și motivațional",
    ],
    slug: "mentorat",
    subtitle: "Ai mentor dedicat până la examen",
    title: "Mentorat până la examen",
  },
  {
    icon: BookOpen,
    image: "/assets/registration/support-details/grilesmart.png",
    points: [
      "Acces complet la platforma SmartMed",
      "+ 85000 de grile organizate pe capitole și dificultate",
      "Flashcards interactive pentru memorare și dificultate",
      "Atlas AI- asistent inteligent pentru explicații pe baza materiei de admitere",
    ],
    slug: "grilesmart",
    subtitle: "Grile, flachcarduri, asistent AI",
    title: "Acces GrileSmart",
  },
  {
    footer: {
      label: "Frecvența:",
      text: "O dată/de două ori pe săptămână pentru fiecare materie în funcție de abonamentul ales",
    },
    icon: GraduationCap,
    image: "/assets/registration/support-details/cursuri-fizic.png",
    points: [
      "O sesiune live de 2 ore cu un medic profesor",
      "Interacțiune directă -poți pune întrebări",
      "Ascultare activă",
      "Suport de curs PDF",
    ],
    slug: "cursuri-fizic",
    subtitle: "Pregătire și performanță",
    title: "Cursuri FIZIC la Centru",
  },
  {
    footer: {
      label: "Actualizare:",
      text: "Datele se actualizează în timp real după fiecare test",
    },
    icon: Target,
    image: "/assets/registration/support-details/pregatire-personalizata.png",
    points: [
      "Dashboard personalizat cu progresul tău pe baza testelor susținute live",
      "Analiză detaliată - vezi exact unde și cum greșești la grile",
      "Grafice de evoluție săptămânală și lunară",
      "Comparație anonimă cu ceilalți studenți",
      "Predicție scor admitere bazat pe performanță",
    ],
    slug: "pregatire-personalizata",
    subtitle: "Vezi exact unde și de ce pierzi puncte la teste",
    title: "Pregătirea ta personalizată",
  },
  {
    icon: ClipboardCheck,
    image: "/assets/generated/smartmed-center-physical-class.png",
    imagePosition: "center 48%",
    points: [
      "Acces complet la platforma SmartMed",
      "+ 85000 de grile organizate pe capitole și dificultate",
      "Flashcards interactive pentru memorare și dificultate",
      "Atlas AI- asistent inteligent pentru explicații pe baza materiei de admitere",
    ],
    slug: "testare-nivel",
    subtitle: "Test rapid pentru alegerea nivelului potrivit",
    title: "Testare de nivel GRATUITĂ",
  },
  {
    icon: Clock3,
    image: "/assets/registration/support-details/simulare-reala.png",
    points: [
      "Testare în sistem real, susținută pe foaie cu îmbulinare de borderou, ca la admitere",
      "Grile făcute de la 0 de către profesori care te pregătesc pentru admitere",
      "Clasament în timp real între colegi",
      "Analiza detaliată a tiparelor de greșeli",
      "Statistici comparative pe tipuri de grile",
    ],
    slug: "simulare-reala",
    subtitle:
      "Recapitulare și testare susținute pe suport de hârtie și contracronometru",
    title: "Simulare REALĂ",
  },
];

export function SupportBenefitsGrid() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeBenefit =
    supportBenefits.find((benefit) => benefit.slug === activeSlug) ?? null;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (activeBenefit && !dialog.open) {
      dialog.showModal();
      window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    } else if (!activeBenefit && dialog.open) {
      dialog.close();
    }
  }, [activeBenefit]);

  useEffect(() => {
    if (!activeBenefit) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeBenefit]);

  function closeDialog() {
    setActiveSlug(null);
  }

  return (
    <>
      <div className={styles.supportGrid} data-support-benefits-grid="true">
        {supportBenefits.map(({ icon: Icon, ...benefit }) => (
          <button
            aria-haspopup="dialog"
            className={styles.supportCard}
            data-support-card={benefit.slug}
            key={benefit.slug}
            onClick={() => setActiveSlug(benefit.slug)}
            type="button"
          >
            <span className={styles.supportCardMedia}>
              <Image
                alt=""
                className="object-cover"
                fill
                sizes="(max-width: 767px) calc(100vw - 2rem), (max-width: 1023px) 50vw, 420px"
                src={benefit.image}
                style={{ objectPosition: benefit.imagePosition ?? "center top" }}
              />
              <span className={styles.supportCardScrim} />
              <span className={styles.supportCardDetailBadge}>Detalii</span>
              <span className={styles.supportCardIcon}>
                <Icon aria-hidden="true" />
              </span>
            </span>
            <span className={styles.supportCardBody}>
              <strong>{benefit.title}</strong>
              <span className={styles.supportCardAction}>
                Vezi detalii
                <ArrowUpRight aria-hidden="true" />
              </span>
            </span>
          </button>
        ))}
      </div>

      <dialog
        aria-labelledby={activeBenefit ? "support-dialog-title" : undefined}
        className={styles.supportDialog}
        data-support-dialog="true"
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeDialog();
          }
        }}
        onClose={() => setActiveSlug(null)}
        ref={dialogRef}
      >
        {activeBenefit ? (
          <div className={styles.supportDialogShell}>
            <div className={styles.supportDialogVisual}>
              <Image
                alt=""
                className="object-cover"
                fill
                sizes="(max-width: 767px) calc(100vw - 2rem), 760px"
                src={activeBenefit.image}
                style={{
                  objectPosition: activeBenefit.imagePosition ?? "center top",
                }}
              />
              <span aria-hidden="true" />
            </div>

            <div className={styles.supportDialogContent}>
              <button
                aria-label="Închide detaliile"
                className={styles.supportDialogClose}
                onClick={closeDialog}
                ref={closeButtonRef}
                type="button"
              >
                <X aria-hidden="true" />
              </button>

              <p className={styles.supportDialogEyebrow}>Detaliile sprijinului</p>
              <h3 id="support-dialog-title">{activeBenefit.title}</h3>
              <p className={styles.supportDialogSubtitle}>
                {activeBenefit.subtitle}
              </p>

              <div className={styles.supportDialogIncludes}>
                <strong>Ce include:</strong>
                <ul>
                  {activeBenefit.points.map((point) => (
                    <li key={point}>
                      <CheckCircle2 aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {activeBenefit.footer ? (
                <div className={styles.supportDialogFooter}>
                  <strong>{activeBenefit.footer.label}</strong>
                  <p>{activeBenefit.footer.text}</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
