import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionLabelProps = {
  children: ReactNode;
  className?: string;
  tone?: "dark" | "cream";
};

export function SectionLabel({
  children,
  className,
  tone = "dark",
}: SectionLabelProps) {
  return (
    <p
      className={cn(
        "text-xs font-bold uppercase tracking-[0.28em]",
        tone === "dark" ? "text-smart-gold-light" : "text-smart-gold",
        className,
      )}
    >
      {children}
    </p>
  );
}
