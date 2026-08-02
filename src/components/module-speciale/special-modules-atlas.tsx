"use client";

import type { CSSProperties } from "react";

import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

import styles from "./special-modules-atlas.module.css";

const modules = [
  {
    number: "01",
    title: "Lecțiile SMART",
    href: "/module-speciale/lectiile-smart",
  },
  {
    number: "02",
    title: "Sutura SMART",
    href: "/module-speciale/sutura-smart",
  },
  {
    number: "03",
    title: "Radiografia SMART",
    href: "/module-speciale/radiografia-smart",
  },
  {
    number: "04",
    title: "Disecția SMART",
    href: "/module-speciale/disectia-smart",
  },
  {
    number: "05",
    title: "Diferențialul SMART",
    href: "/module-speciale/diferentialul-smart",
  },
  {
    number: "06",
    title: "Imagistica SMART",
    href: "/module-speciale/imagistica-smart",
  },
  {
    number: "07",
    title: "Laboratorul SMART",
    href: "/module-speciale/laboratorul-smart",
  },
  {
    number: "08",
    title: "Problema SMART",
    href: "/module-speciale/problema-smart",
  },
] as const;

const editorialNotes = [
  {
    eyebrow: "Înțelegere",
    title: "Materia capătă logică",
    side: "left",
  },
  {
    eyebrow: "Strategie",
    title: "Cunoașterea devine avantaj",
    side: "right",
  },
] as const;

const revealEase = [0.16, 1, 0.3, 1] as const;

export function SpecialModulesAtlas() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="special-modules-atlas-title"
      className={`${styles.section} bg-smart-cream`}
      id="modulele-speciale"
    >
      <div aria-hidden="true" className={styles.paperGlow} />

      <motion.header
        className={styles.sectionHeader}
        initial={reduceMotion ? false : { opacity: 0, y: 42 }}
        transition={{ duration: reduceMotion ? 0 : 0.9, ease: revealEase }}
        viewport={{ amount: 0.55, once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <p className={styles.kicker}>Axa performanței SmartMed</p>
        <h2 className={styles.title} id="special-modules-atlas-title">
          Module speciale
        </h2>
        <span aria-hidden="true" className={styles.titleOrnament}>
          <i />
        </span>
        <p className={styles.intro}>
          Opt perspective complementare<br></br>
           O singură structură de gândire construită
          pentru admiterea la Medicină
        </p>
      </motion.header>

      <div className={styles.atlasStage}>
        <motion.figure
          className={styles.atlasFigure}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.985, y: 48 }}
          transition={{ duration: reduceMotion ? 0 : 1.15, ease: revealEase }}
          viewport={{ amount: 0.08, once: true }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
        >
          <span aria-hidden="true" className={styles.atlasHalo} />
          <Image
            alt="Atlas purtând un creier, așezat deasupra unei coloane vertebrale"
            className={styles.atlasImage}
            height={4000}
            sizes="(max-width: 832px) 82vw, (max-width: 1200px) 37vw, 544px"
            src="/images/special-modules/atlas-spine-modules-symmetric.png"
            width={1000}
          />
          <figcaption className={styles.atlasCaption}>
            <span>Înțelegere · Strategie · Performanță</span>
            <small>Structura care susține fiecare rezultat</small>
          </figcaption>
        </motion.figure>

        {editorialNotes.map((note, index) => {
          const isLeft = note.side === "left";

          return (
            <motion.aside
              className={`${styles.editorialNote} ${
                isLeft ? styles.editorialNoteLeft : styles.editorialNoteRight
              }`}
              initial={
                reduceMotion
                  ? false
                  : {
                      opacity: 0,
                      x: isLeft ? -44 : 44,
                      y: 16,
                    }
              }
              key={note.title}
              transition={{
                delay: reduceMotion ? 0 : 0.08 + index * 0.12,
                duration: reduceMotion ? 0 : 0.82,
                ease: revealEase,
              }}
              viewport={{ amount: 0.58, once: true }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
            >
              <div aria-hidden="true" className={styles.neuronArtwork}>
                <Image
                  alt=""
                  className={styles.neuronImage}
                  height={1280}
                  sizes="(max-width: 832px) 112vw, (max-width: 1152px) 31vw, 464px"
                  src="/images/special-modules/neuron-note-holder.png"
                  width={1920}
                />
              </div>
              <div className={styles.neuronCopy}>
                <p>{note.eyebrow}</p>
                <h3>{note.title}</h3>
              </div>
            </motion.aside>
          );
        })}

        {modules.map((module, index) => {
          const isLeft = index % 2 === 0;
          const gridRow = Math.floor(index / 2) + 2;

          return (
            <motion.article
              aria-labelledby={`special-module-${module.number}`}
              className={`${styles.moduleCard} ${
                isLeft ? styles.moduleCardLeft : styles.moduleCardRight
              }`}
              initial={
                reduceMotion
                  ? false
                  : {
                      opacity: 0,
                      x: isLeft ? -48 : 48,
                      y: 30,
                    }
              }
              key={module.href}
              style={{ "--module-row": gridRow } as CSSProperties}
              transition={{
                delay: reduceMotion ? 0 : index % 2 === 0 ? 0 : 0.1,
                duration: reduceMotion ? 0 : 0.78,
                ease: revealEase,
              }}
              viewport={{ amount: 0.42, once: true }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
            >
              <div className={styles.moduleSurface}>
                <span className={styles.moduleNumber}>Modul {module.number}</span>
                <h3 id={`special-module-${module.number}`}>{module.title}</h3>
                <Link
                  aria-label={`Descoperă modulul ${module.title}`}
                  className={styles.moduleLink}
                  href={module.href}
                >
                  <span>Descoperă modulul</span>
                  <ArrowUpRight aria-hidden="true" strokeWidth={1.8} />
                </Link>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
