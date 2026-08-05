"use client";

import Image from "next/image";
import {
  motion,
  type MotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
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
  denseCopy?: boolean;
  copy: readonly CopyBlock[];
};

const chapters: readonly Chapter[] = [
  {
    number: "01",
    title: "Baze solide",
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
    denseCopy: true,
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
    denseCopy: true,
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
    denseCopy: true,
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
  "(max-width: 560px) calc(100vw - 1.1rem), (max-width: 832px) calc(100vw - 1.6rem), (max-width: 1440px) 62vw, (max-width: 1920px) 52vw, 1280px";

const transitionStarts = [0.105, 0.355, 0.605, 0.855] as const;
const transitionEnds = [0.185, 0.435, 0.685, 0.935] as const;

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
        src="/images/special-modules/parchment-scroll.png"
      />
      <div
        className={`${styles.parchmentCopy} ${
          chapter.number === "01" ? styles.parchmentCopyScript : ""
        } ${chapter.denseCopy ? styles.parchmentCopyDense : ""}`}
        data-atlas-copy="true"
        data-atlas-copy-density={chapter.denseCopy ? "dense" : "standard"}
      >
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

function SidePanel({ side }: { side: "left" | "right" }) {
  return (
    <div
      aria-hidden="true"
      className={`${styles.sidePanel} ${
        side === "left" ? styles.sidePanelLeft : styles.sidePanelRight
      }`}
      data-atlas-panel={side}
    >
      <Image
        alt=""
        className={styles.sidePanelArtwork}
        height={2000}
        sizes="(max-width: 560px) 3.75rem, (max-width: 832px) 5.25rem, (max-width: 1120px) 7rem, (max-width: 1440px) 16vw, 18rem"
        src="/images/special-modules/parchment-side-panel.png"
        width={1080}
      />
    </div>
  );
}

type StoryChapterProps = {
  chapter: Chapter;
  index: number;
  progress: MotionValue<number>;
  reduceMotion: boolean;
};

function StoryChapter({ chapter, index, progress, reduceMotion }: StoryChapterProps) {
  const isFirst = index === 0;
  const isLast = index === chapters.length - 1;
  const entryStart = isFirst ? 0 : transitionStarts[index - 1];
  const entryEnd = isFirst ? 0 : transitionEnds[index - 1];
  const entryFadeStart = entryStart + (entryEnd - entryStart) * 0.42;
  const exitStart = isLast ? 1 : transitionStarts[index];
  const exitEnd = isLast ? 1 : transitionEnds[index];
  const exitFadeEnd = exitStart + (exitEnd - exitStart) * 0.58;

  const sceneRange = isFirst
    ? [0, transitionStarts[0], transitionEnds[0], 1]
    : isLast
      ? [0, transitionStarts[index - 1], transitionEnds[index - 1], 1]
      : [
          0,
          transitionStarts[index - 1],
          transitionEnds[index - 1],
          transitionStarts[index],
          transitionEnds[index],
          1,
        ];
  const sceneY = useTransform(
    progress,
    sceneRange,
    isFirst
      ? [0, 0, -26, -26]
      : isLast
        ? [34, 34, 0, 0]
        : [34, 34, 0, 0, -26, -26],
  );
  const opacityRange = isFirst
    ? [0, transitionStarts[0], exitFadeEnd, 1]
    : isLast
      ? [0, entryFadeStart, entryEnd, 1]
      : [0, entryFadeStart, entryEnd, transitionStarts[index], exitFadeEnd, 1];
  const opacity = useTransform(
    progress,
    opacityRange,
    isFirst
      ? [1, 1, 0, 0]
      : isLast
        ? [0, 0, 1, 1]
        : [0, 0, 1, 1, 0, 0],
  );
  const scale = useTransform(
    progress,
    sceneRange,
    isFirst
      ? [1, 1, 0.996, 0.996]
      : isLast
        ? [0.995, 0.995, 1, 1]
        : [0.995, 0.995, 1, 1, 0.996, 0.996],
  );
  const rotateX = useTransform(
    progress,
    sceneRange,
    isFirst
      ? [0, 0, -0.65, -0.65]
      : isLast
        ? [1.2, 1.2, 0, 0]
        : [1.2, 1.2, 0, 0, -0.65, -0.65],
  );
  const headingY = useTransform(
    progress,
    sceneRange,
    isFirst
      ? [0, 0, -12, -12]
      : isLast
        ? [18, 18, 0, 0]
        : [18, 18, 0, 0, -12, -12],
  );
  const parchmentY = useTransform(
    progress,
    sceneRange,
    isFirst
      ? [0, 0, -20, -20]
      : isLast
        ? [26, 26, 0, 0]
        : [26, 26, 0, 0, -20, -20],
  );
  const parchmentScale = useTransform(
    progress,
    sceneRange,
    isFirst
      ? [1, 1, 0.996, 0.996]
      : isLast
        ? [0.985, 0.985, 1, 1]
        : [0.985, 0.985, 1, 1, 0.996, 0.996],
  );
  const sideOpacity = useTransform(
    progress,
    sceneRange,
    isFirst
      ? [1, 1, 0.34, 0.34]
      : isLast
        ? [0.24, 0.24, 1, 1]
        : [0.24, 0.24, 1, 1, 0.34, 0.34],
  );
  const leftPanelX = useTransform(
    progress,
    sceneRange,
    isFirst
      ? [0, 0, -24, -24]
      : isLast
        ? [-38, -38, 0, 0]
        : [-38, -38, 0, 0, -24, -24],
  );
  const rightPanelX = useTransform(
    progress,
    sceneRange,
    isFirst
      ? [0, 0, 24, 24]
      : isLast
        ? [38, 38, 0, 0]
        : [38, 38, 0, 0, 24, 24],
  );
  const sheenRange = isFirst
    ? [0, 1]
    : [0, entryStart, (entryStart + entryEnd) / 2, entryEnd, 1];
  const sheenOpacity = useTransform(
    progress,
    sheenRange,
    isFirst ? [0, 0] : [0, 0, 0.58, 0, 0],
  );
  const sheenX = useTransform(
    progress,
    sheenRange,
    isFirst ? ["-70%", "-70%"] : ["-70%", "-70%", "0%", "70%", "70%"],
  );

  return (
    <article
      aria-labelledby={`special-module-chapter-${chapter.number}`}
      className={styles.chapter}
      data-atlas-slide={chapter.number}
    >
      <motion.div
        className={styles.chapterInner}
        data-atlas-scene="true"
        style={reduceMotion ? undefined : { opacity, rotateX, scale, y: sceneY }}
      >
        <motion.header
          className={styles.chapterHeading}
          data-atlas-heading="true"
          style={reduceMotion ? undefined : { y: headingY }}
        >
          <span className={styles.numberMedallion} data-atlas-number="true">
            {chapter.number}
          </span>
          <div className={styles.titleLockup}>
            <p data-atlas-principle="true">Principiu SmartMed</p>
            <h2
              className={chapter.compactTitle ? styles.chapterTitleCompact : undefined}
              id={`special-module-chapter-${chapter.number}`}
            >
              {chapter.title}
            </h2>
          </div>
        </motion.header>

        <div className={styles.composition}>
          <div
            aria-hidden="true"
            className={`${styles.sidePanelSlot} ${styles.sidePanelSlotLeft}`}
          >
            <motion.div
              className={styles.sidePanelMotion}
              style={reduceMotion ? undefined : { opacity: sideOpacity, x: leftPanelX }}
            >
              <SidePanel side="left" />
            </motion.div>
          </div>
          <motion.div
            className={styles.parchmentSlot}
            data-atlas-parchment="true"
            style={reduceMotion ? undefined : { scale: parchmentScale, y: parchmentY }}
          >
            <ParchmentPanel chapter={chapter} />
            <motion.div
              aria-hidden="true"
              className={styles.parchmentSheen}
              style={reduceMotion ? undefined : { opacity: sheenOpacity, x: sheenX }}
            />
          </motion.div>
          <div
            aria-hidden="true"
            className={`${styles.sidePanelSlot} ${styles.sidePanelSlotRight}`}
          >
            <motion.div
              className={styles.sidePanelMotion}
              style={reduceMotion ? undefined : { opacity: sideOpacity, x: rightPanelX }}
            >
              <SidePanel side="right" />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </article>
  );
}

export function AtlasPergamenteSection() {
  const storyRef = useRef<HTMLElement>(null);
  const reduceMotion = Boolean(useReducedMotion());
  const { scrollYProgress } = useScroll({
    target: storyRef,
    offset: ["start start", "end end"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    damping: 17,
    mass: 0.25,
    stiffness: 180,
    restDelta: 0.0005,
    restSpeed: 0.0005,
  });
  const glowOpacity = useTransform(
    smoothProgress,
    [0, 0.105, 0.145, 0.185, 0.355, 0.395, 0.435, 0.605, 0.645, 0.685, 0.855, 0.895, 0.935, 1],
    [0.72, 0.72, 1, 0.8, 0.8, 1, 0.82, 0.82, 1, 0.84, 0.84, 1, 0.78, 0.78],
  );

  return (
    <section
      aria-label="Principiile Modulelor Speciale SmartMed"
      className={`${styles.story} bg-smart-cream`}
      id="atlas-modulelor-speciale"
      ref={storyRef}
    >
      <div className={styles.stickyStage} data-atlas-stage="true">
        <motion.div
          aria-hidden="true"
          className={styles.stageGlow}
          style={reduceMotion ? undefined : { opacity: glowOpacity }}
        />
        <div
          className={styles.track}
          data-atlas-axis="vertical"
          data-atlas-lock="native"
          data-atlas-track="true"
        >
          {chapters.map((chapter, index) => (
            <StoryChapter
              chapter={chapter}
              index={index}
              key={chapter.number}
              progress={smoothProgress}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
