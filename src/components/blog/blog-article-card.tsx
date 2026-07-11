"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { useState } from "react";

import { formatBlogDate } from "@/lib/blog";
import { cn } from "@/lib/utils";

import styles from "./blog-article-card.module.css";

export type BlogArticleCardProps = {
  className?: string;
  href: string;
  imageAlt?: string;
  imageSrc?: string | null;
  publishedAt: string;
  tags?: readonly string[];
  title: string;
};

const MAX_VISIBLE_TAGS = 2;

export function BlogArticleCard({
  className,
  href,
  imageAlt = "",
  imageSrc,
  publishedAt,
  tags = [],
  title,
}: BlogArticleCardProps) {
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const normalizedTags = tags.filter((tag) => tag.trim().length > 0);
  const visibleTags = normalizedTags.slice(0, MAX_VISIBLE_TAGS);
  const remainingTagCount = Math.max(normalizedTags.length - MAX_VISIBLE_TAGS, 0);
  const hasImage = Boolean(imageSrc && failedImageSrc !== imageSrc);

  return (
    <article className={cn(styles.card, className)}>
      <Link
        aria-label={`Citește articolul: ${title}`}
        className={styles.link}
        href={href}
      >
        <div className={styles.media}>
          {hasImage && imageSrc ? (
            <Image
              alt={imageAlt}
              className={styles.image}
              fill
              onError={() => setFailedImageSrc(imageSrc)}
              sizes="(max-width: 639px) 80vw, (max-width: 1023px) 40vw, (max-width: 1535px) 27vw, 350px"
              src={imageSrc}
            />
          ) : (
            <div aria-hidden="true" className={styles.imageFallback}>
              <span className={styles.fallbackMonogram}>SM</span>
              <span className={styles.fallbackLabel}>Imagine în curând</span>
            </div>
          )}
        </div>

        <div className={styles.content}>
          <h3 className={styles.title}>{title}</h3>

          <div
            aria-label={normalizedTags.length ? `Categorii: ${normalizedTags.join(", ")}` : undefined}
            className={styles.tags}
          >
            {visibleTags.map((tag, index) => (
              <span className={styles.tag} key={`${tag}-${index}`} title={tag}>
                {tag}
              </span>
            ))}
            {remainingTagCount > 0 ? (
              <span
                aria-label={
                  remainingTagCount === 1
                    ? "O categorie suplimentară"
                    : `${remainingTagCount} categorii suplimentare`
                }
                className={cn(styles.tag, styles.moreTag)}
              >
                +{remainingTagCount}
              </span>
            ) : null}
          </div>

          <div className={styles.meta}>
            <CalendarDays aria-hidden="true" className={styles.calendarIcon} strokeWidth={1.7} />
            <time dateTime={publishedAt}>{formatBlogDate(publishedAt)}</time>
          </div>
        </div>
      </Link>
    </article>
  );
}
