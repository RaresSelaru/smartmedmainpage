import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionShellProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  id?: string;
  tone?: "plain" | "cream" | "deep" | "cyan";
};

const tones = {
  plain: "bg-transparent",
  cream: "bg-smart-cream/78",
  deep: "bg-smart-navy text-white",
  cyan: "bg-smart-cyan/18",
};

export function SectionShell({
  children,
  className,
  innerClassName,
  id,
  tone = "plain",
}: SectionShellProps) {
  return (
    <section className={cn("relative py-20 sm:py-24", tones[tone], className)} id={id}>
      <div className={cn("mx-auto w-full max-w-7xl px-5 sm:px-7 lg:px-8", innerClassName)}>
        {children}
      </div>
    </section>
  );
}
