import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "article";
};

export function GlassCard({ children, className, as = "article" }: GlassCardProps) {
  const Component = as;

  return (
    <Component
      className={cn(
        "rounded-[28px] border border-white/20 bg-white/[0.075] shadow-[0_22px_70px_rgba(3,17,28,0.24)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </Component>
  );
}
