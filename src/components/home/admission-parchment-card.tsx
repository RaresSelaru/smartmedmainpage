import Link from "next/link";

import type { AppRoute } from "@/lib/routes";

import styles from "./admission-parchment-card.module.css";

export type AdmissionParchmentCardProps = {
  grade: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: AppRoute;
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
        <Link className={styles.cta} href={href}>
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}
