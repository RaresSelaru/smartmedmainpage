import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type MarketingChoiceButtonProps = {
  ariaLabel?: string;
  className?: string;
  href: string;
  icon: LucideIcon;
  label: string;
  tone?: "teal" | "gold";
};

export function MarketingChoiceButton({
  ariaLabel,
  className,
  href,
  icon: Icon,
  label,
  tone = "teal",
}: MarketingChoiceButtonProps) {
  return (
    <Link
      aria-label={ariaLabel}
      className={cn(
        "group inline-grid min-h-[72px] w-full max-w-[340px] grid-cols-[2.65rem_minmax(0,1fr)_1.75rem] items-center gap-3 rounded-full border px-5 text-[1.02rem] font-extrabold leading-none transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 active:scale-[0.99] sm:w-[340px] sm:px-6 sm:text-[1.08rem] lg:min-h-[66px] lg:w-[316px] lg:max-w-[316px] lg:grid-cols-[2.4rem_minmax(0,1fr)_1.5rem] lg:px-5 lg:text-base",
        tone === "gold"
          ? "border-smart-gold-light/70 bg-gradient-to-r from-[#f3dba6] to-[#c99b57] text-smart-abyss shadow-[0_18px_44px_rgba(155,108,42,0.26)] hover:brightness-105 focus-visible:outline-smart-gold"
          : "border-smart-aqua/60 bg-gradient-to-r from-smart-aqua to-smart-teal-soft text-smart-white shadow-[0_18px_44px_rgba(46,127,136,0.32)] hover:brightness-110 focus-visible:outline-smart-aqua",
        className,
      )}
      href={href}
    >
      <span
        className={cn(
          "flex size-[42px] items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.34)] transition duration-300 lg:size-[38px]",
          tone === "gold"
            ? "border-smart-abyss/15 bg-white/20 text-smart-abyss group-hover:bg-white/28"
            : "border-white/30 bg-white/12 text-smart-white group-hover:bg-white/18",
        )}
      >
        <Icon aria-hidden="true" className="size-6 lg:size-[22px]" strokeWidth={1.65} />
      </span>
      <span className="min-w-0 text-left text-balance">{label}</span>
      <ArrowRight
        aria-hidden="true"
        className="size-6 shrink-0 transition duration-300 group-hover:translate-x-1 lg:size-5"
        strokeWidth={1.8}
      />
    </Link>
  );
}
