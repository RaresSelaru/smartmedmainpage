"use client";

import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

import styles from "./animated-admission-year.module.css";

const STATIC_YEAR_DIGITS = ["2", "0", "2"] as const;
const ROLLING_DIGITS = ["9", "7", "8", "9"] as const;

type AnimatedAdmissionYearProps = {
  className?: string;
};

export function AnimatedAdmissionYear({ className }: AnimatedAdmissionYearProps) {
  const reduceMotion = useReducedMotion();

  return (
    <p aria-label="Admiterea 2029" className={cn(className)}>
      <span
        aria-hidden="true"
        className="inline-flex flex-wrap items-center justify-center gap-x-[0.35em] gap-y-3"
      >
        <span>Admiterea</span>
        <span className={styles.frame} style={{ ["--odometer-size" as string]: "0.56em" }}>
          {STATIC_YEAR_DIGITS.map((digit, index) => (
            <span className={styles.cell} key={`${digit}-${index}`}>
              <span className={styles.item}>
                <span className={cn(styles.glyph, styles.ink)}>{digit}</span>
              </span>
            </span>
          ))}
          <span className={styles.cell}>
            {reduceMotion ? (
              <span className={styles.item}>
                <span className={cn(styles.glyph, styles.gold)}>9</span>
              </span>
            ) : (
              <span className={styles.column}>
                {ROLLING_DIGITS.map((digit, index) => (
                  <span className={styles.item} key={`${digit}-${index}`}>
                    <span className={cn(styles.glyph, styles.gold)}>{digit}</span>
                  </span>
                ))}
              </span>
            )}
          </span>
        </span>
      </span>
    </p>
  );
}
