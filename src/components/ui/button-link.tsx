import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  external?: boolean;
  className?: string;
  ariaLabel?: string;
};

const variants = {
  primary:
    "bg-smart-navy text-white shadow-[0_18px_48px_rgba(13,23,38,0.22)] hover:bg-smart-ink",
  secondary:
    "border border-smart-navy/15 bg-white/70 text-smart-navy shadow-[0_14px_40px_rgba(13,23,38,0.08)] hover:border-smart-gold/60 hover:bg-white",
  ghost:
    "bg-transparent text-smart-navy hover:bg-smart-navy/5 hover:text-smart-ink",
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  external,
  className,
  ariaLabel,
}: ButtonLinkProps) {
  const isExternal = external ?? href.startsWith("http");
  const classes = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-cyan",
    variants[variant],
    className,
  );

  if (isExternal) {
    return (
      <a
        aria-label={ariaLabel}
        className={classes}
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        <span>{children}</span>
        <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
      </a>
    );
  }

  return (
    <Link aria-label={ariaLabel} className={classes} href={href}>
      <span>{children}</span>
      <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
    </Link>
  );
}
