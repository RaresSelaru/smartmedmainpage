import Link from "next/link";
import { ArrowRight } from "lucide-react";

import styles from "./admission-parchment-card.module.css";

export type AdmissionParchmentCardProps = {
  grade: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
};

export function AdmissionParchmentCard({
  grade,
  title,
  description,
  ctaLabel,
  href,
}: AdmissionParchmentCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.content}>
        <span className={styles.grade}>{grade}</span>
        <div className={styles.copy}>
          <span aria-hidden="true" className={styles.separator} />
          <h3 className={styles.title}>{title}</h3>
          <span aria-hidden="true" className={styles.separator} />
          <p className={styles.description}>{description}</p>
        </div>
        <Link
          aria-label={`${ctaLabel} — ${grade}`}
          className={styles.cta}
          href={href}
        >
          <span>{ctaLabel}</span>
          <ArrowRight aria-hidden="true" className={styles.ctaIcon} strokeWidth={1.9} />
        </Link>
      </div>
    </article>
  );
}
