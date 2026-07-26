"use client";

import Image from "next/image";
import {
  BookOpen,
  Brain,
  Globe2,
  Landmark,
  Network,
  PersonStanding,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

import styles from "./atlas-pergamente-section.module.css";

type CopyBlock =
  | {
      type: "paragraph";
      text: string;
      emphasis?: boolean;
    }
  | {
      type: "list";
      items: readonly string[];
    };

type Chapter = {
  number: string;
  title: string;
  compactTitle?: boolean;
  imageLabel: string;
  imageHint: string;
  icons: readonly LucideIcon[];
  copy: readonly CopyBlock[];
};

const chapters: readonly Chapter[] = [
  {
    number: "01",
    title: "Înțelegere profundă",
    imageLabel: "Cărți medicale și anatomie",
    imageHint: "Spațiu pregătit pentru imaginea finală",
    icons: [BookOpen, Brain],
    copy: [
      {
        type: "paragraph",
        emphasis: true,
        text: "La SMARTMED Academy credem că succesul la admiterea la Medicină nu depinde doar de numărul de ore petrecute învățând, ci mai ales de modul în care este construită și înțeleasă informația.",
      },
      {
        type: "paragraph",
        text: "Manualele de biologie, chimie și fizică reprezintă punctul de plecare, însă ele conțin numeroase concepte dense, informații prezentate fragmentat și conexiuni care rămân adesea ascunse elevilor.",
      },
      {
        type: "paragraph",
        text: "Din acest motiv, mulți candidați ajung să memoreze mecanic fără să înțeleagă logica din spatele fenomenelor și fără să poată rezolva eficient grilele dificile.",
      },
      {
        type: "paragraph",
        text: "Pentru a elimina aceste obstacole, am creat Modulele Speciale SMARTMED, un sistem original de organizare și aprofundare a materiei, dezvoltat special pentru pregătirea examenului de admitere la Medicină.",
      },
      {
        type: "paragraph",
        text: "Aceste module transformă informația din manuale într-un sistem logic, coerent și ușor de înțeles, oferind elevilor instrumentele necesare pentru a gândi ca viitori studenți la medicină, nu doar pentru a reproduce definiții.",
      },
    ],
  },
  {
    number: "02",
    title: "Înțelegerea conceptelor, nu memorarea lor",
    compactTitle: true,
    imageLabel: "Statuie academică",
    imageHint: "Spațiu pregătit pentru imaginea finală",
    icons: [PersonStanding],
    copy: [
      {
        type: "paragraph",
        emphasis: true,
        text: "Fiecare capitol este reconstruit astfel încât elevul să înțeleagă mecanismele biologice, chimice și fizice din spatele fiecărei noțiuni.",
      },
      {
        type: "paragraph",
        text: "Conceptele esențiale sunt analizate în profunzime, explicate pas cu pas și integrate într-o logică ușor de urmărit. Sunt eliminate ambiguitățile, sunt explicate excepțiile și sunt evidențiate capcanele care pot genera confuzii la examen.",
      },
      {
        type: "paragraph",
        text: "În loc să memoreze sute de informații disparate, cursanții înțeleg:",
      },
      {
        type: "list",
        items: [
          "de ce apare un fenomen;",
          "cum funcționează un mecanism;",
          "care este relația dintre cauză și efect;",
          "când și cum se aplică fiecare noțiune.",
        ],
      },
      {
        type: "paragraph",
        emphasis: true,
        text: "Rezultatul este o învățare solidă, stabilă și de lungă durată, care permite rezolvarea inclusiv a grilelor complexe sau formulate diferit față de cele întâlnite anterior.",
      },
    ],
  },
  {
    number: "03",
    title: "Legături inteligente",
    imageLabel: "Cărți și pergamente",
    imageHint: "Spațiu pregătit pentru imaginea finală",
    icons: [ScrollText, Network],
    copy: [
      {
        type: "paragraph",
        emphasis: true,
        text: "Corelații între capitole pentru o viziune completă. La examen, informațiile nu apar izolat.",
      },
      {
        type: "paragraph",
        text: "O întrebare poate combina noțiuni din mai multe capitole, iar succesul depinde de capacitatea candidatului de a realiza conexiuni rapide și corecte. Modulele SMARTMED dezvoltă această abilitate prin realizarea unor corelații inteligente între capitole și discipline.",
      },
      {
        type: "paragraph",
        text: "Elevii descoperă relațiile dintre:",
      },
      {
        type: "list",
        items: [
          "anatomie și fiziologie;",
          "biologie celulară și genetică;",
          "biochimie și metabolism;",
          "chimie organică și procese biologice;",
          "fizică și aplicațiile sale medicale.",
        ],
      },
      {
        type: "paragraph",
        text: "Materia încetează să mai fie percepută ca o colecție de capitole independente și devine o rețea logică de cunoștințe.",
      },
      {
        type: "paragraph",
        emphasis: true,
        text: "Această perspectivă globală facilitează memorarea, accelerează rezolvarea grilelor și permite identificarea rapidă a răspunsurilor corecte chiar și în cazul întrebărilor complexe.",
      },
    ],
  },
  {
    number: "04",
    title: "Strategii de succes",
    imageLabel: "Strategie și performanță",
    imageHint: "Spațiu pregătit pentru imaginea finală",
    icons: [Globe2, BookOpen],
    copy: [
      {
        type: "paragraph",
        emphasis: true,
        text: "Metode inteligente pentru performanță maximă la examen.",
      },
      {
        type: "paragraph",
        text: "A cunoaște materia este esențial. A ști să o utilizezi eficient în timpul examenului face însă diferența dintre un rezultat bun și unul excepțional.",
      },
      {
        type: "paragraph",
        text: "Modulele Speciale includ tehnici dezvoltate special pentru examenul de admitere:",
      },
      {
        type: "list",
        items: [
          "metode rapide de analiză a grilelor;",
          "identificarea capcanelor frecvent utilizate de comisiile de admitere;",
          "tehnici de eliminare a variantelor greșite;",
          "exerciții de logică și raționament;",
          "algoritmi de rezolvare pentru problemele dificile;",
          "metode de consolidare și recapitulare inteligentă.",
        ],
      },
      {
        type: "paragraph",
        emphasis: true,
        text: "Fiecare strategie este exersată în contexte similare examenului real, astfel încât elevii să dobândească siguranță, rapiditate și încredere.",
      },
    ],
  },
  {
    number: "05",
    title: "De ce fac diferența modulele speciale SmartMed?",
    compactTitle: true,
    imageLabel: "Academia SmartMed",
    imageHint: "Spațiu pregătit pentru imaginea finală",
    icons: [Landmark],
    copy: [
      {
        type: "paragraph",
        emphasis: true,
        text: "Pentru că nu adaugă doar informație. Ele schimbă modul în care elevii gândesc materia.",
      },
      {
        type: "paragraph",
        text: "În locul memorării pasive apare înțelegerea activă. În locul capitolelor separate apare o imagine de ansamblu. În locul nesiguranței apare o strategie clară de rezolvare.",
      },
      {
        type: "paragraph",
        text: "Acest sistem îi ajută pe cursanți:",
      },
      {
        type: "list",
        items: [
          "să învețe mai eficient,",
          "să rețină informațiile pe termen lung,",
          "să identifice rapid conexiunile dintre concepte",
          "și să abordeze examenul cu încredere și claritate.",
        ],
      },
      {
        type: "paragraph",
        text: "Modulele Speciale SMARTMED Academy nu sunt simple lecții suplimentare.",
      },
      {
        type: "paragraph",
        emphasis: true,
        text: "Sunt un sistem inovator de învățare care transformă materia din manuale într-un avantaj competitiv și oferă elevilor instrumentele necesare pentru a obține performanță la examenul de admitere la Medicină.",
      },
    ],
  },
];

const sharedImageSizes =
  "(max-width: 768px) 100vw, (max-width: 1200px) 58vw, 44vw";

function ParchmentPanel({ chapter }: { chapter: Chapter }) {
  return (
    <div className={styles.parchment}>
      <Image
        alt=""
        aria-hidden="true"
        className={styles.parchmentArtwork}
        fill
        loading={chapter.number === "01" ? "eager" : "lazy"}
        sizes={sharedImageSizes}
        src="/images/special-modules/pergament-module-speciale-blank.png"
      />
      <div className={styles.parchmentCopy}>
        {chapter.copy.map((block, blockIndex) => {
          if (block.type === "list") {
            return (
              <ul className={styles.parchmentList} key={`${chapter.number}-list-${blockIndex}`}>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          }

          return (
            <p
              className={block.emphasis ? styles.parchmentEmphasis : undefined}
              key={`${chapter.number}-paragraph-${blockIndex}`}
            >
              {block.text}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function ImagePlaceholder({ chapter }: { chapter: Chapter }) {
  return (
    <figure className={styles.visualFrame} data-image-slot={chapter.number}>
      <span aria-hidden="true" className={styles.visualCornerTopLeft} />
      <span aria-hidden="true" className={styles.visualCornerTopRight} />
      <span aria-hidden="true" className={styles.visualCornerBottomLeft} />
      <span aria-hidden="true" className={styles.visualCornerBottomRight} />
      <div aria-hidden="true" className={styles.visualIcons}>
        {chapter.icons.map((Icon, iconIndex) => (
          <Icon key={`${chapter.number}-icon-${iconIndex}`} strokeWidth={0.85} />
        ))}
      </div>
      <figcaption className={styles.visualCaption}>
        <span>{chapter.imageLabel}</span>
        <small>{chapter.imageHint}</small>
      </figcaption>
    </figure>
  );
}

function StoryChapter({ chapter, index }: { chapter: Chapter; index: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const parchmentOffset = useTransform(scrollYProgress, [0, 1], [28, -28]);
  const visualOffset = useTransform(scrollYProgress, [0, 1], [-22, 22]);
  const parchmentY = useSpring(parchmentOffset, { damping: 28, stiffness: 120, mass: 0.45 });
  const visualY = useSpring(visualOffset, { damping: 30, stiffness: 115, mass: 0.5 });
  const isEven = index % 2 === 1;
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <article
      aria-labelledby={`special-module-chapter-${chapter.number}`}
      className={`${styles.chapter} ${isEven ? styles.chapterEven : styles.chapterOdd}`}
      ref={sectionRef}
    >
      <div className={styles.chapterInner}>
        <motion.header
          className={styles.chapterHeading}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -42 }}
          transition={transition}
          viewport={{ amount: 0.35, once: true }}
          whileInView={{ opacity: 1, x: 0 }}
        >
          <span className={styles.numberMedallion}>{chapter.number}</span>
          <span aria-hidden="true" className={styles.headingRule} />
          <p>Principiu SmartMed</p>
          <h2
            className={chapter.compactTitle ? styles.chapterTitleCompact : undefined}
            id={`special-module-chapter-${chapter.number}`}
          >
            {chapter.title}
          </h2>
        </motion.header>

        <motion.div
          className={styles.parchmentSlot}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 58, rotate: isEven ? 0.7 : -0.7 }}
          style={reduceMotion ? undefined : { y: parchmentY }}
          transition={{ ...transition, delay: reduceMotion ? 0 : 0.08 }}
          viewport={{ amount: 0.24, once: true }}
          whileInView={{ opacity: 1, rotate: 0 }}
        >
          <ParchmentPanel chapter={chapter} />
        </motion.div>

        <motion.div
          className={styles.visualSlot}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: isEven ? -54 : 54, scale: 0.97 }}
          style={reduceMotion ? undefined : { y: visualY }}
          transition={{ ...transition, delay: reduceMotion ? 0 : 0.16 }}
          viewport={{ amount: 0.3, once: true }}
          whileInView={{ opacity: 1, scale: 1, x: 0 }}
        >
          <ImagePlaceholder chapter={chapter} />
        </motion.div>
      </div>
    </article>
  );
}

export function AtlasPergamenteSection() {
  return (
    <section
      aria-label="Principiile Modulelor Speciale SmartMed"
      className={`${styles.story} bg-smart-cream`}
      id="atlas-modulelor-speciale"
    >
      {chapters.map((chapter, index) => (
        <StoryChapter chapter={chapter} index={index} key={chapter.number} />
      ))}
    </section>
  );
}
