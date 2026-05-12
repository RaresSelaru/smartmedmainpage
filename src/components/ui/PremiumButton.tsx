import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PremiumButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "outline" | "cream" | "ghost";
  className?: string;
  ariaLabel?: string;
  type?: "button" | "submit";
};

const variants = {
  primary:
    "bg-gradient-to-r from-smart-aqua to-smart-teal-soft text-smart-white shadow-[0_18px_44px_rgba(46,127,136,0.32)] hover:brightness-110",
  outline:
    "border border-smart-glass-border bg-transparent text-smart-white hover:border-smart-aqua/70 hover:bg-white/8",
  cream:
    "bg-smart-cream text-smart-abyss shadow-[0_18px_44px_rgba(3,17,28,0.14)] hover:bg-smart-white",
  ghost: "bg-transparent text-smart-white hover:bg-white/8",
};

const classes =
  "group inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-7 py-3 text-sm font-semibold tracking-[-0.01em] transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua active:scale-[0.99]";

export function PremiumButton({
  children,
  href,
  variant = "primary",
  className,
  ariaLabel,
  type = "button",
}: PremiumButtonProps) {
  const content = (
    <>
      <span>{children}</span>
      <ArrowRight
        aria-hidden="true"
        className="size-4 transition duration-300 group-hover:translate-x-1"
      />
    </>
  );

  if (href) {
    const isExternal = href.startsWith("http");

    if (isExternal) {
      return (
        <a
          aria-label={ariaLabel}
          className={cn(classes, variants[variant], className)}
          href={href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        aria-label={ariaLabel}
        className={cn(classes, variants[variant], className)}
        href={href}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      aria-label={ariaLabel}
      className={cn(classes, variants[variant], className)}
      type={type}
    >
      {content}
    </button>
  );
}
