"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

export function Reveal({ children, className }: RevealProps) {
  return <div className={cn(className)}>{children}</div>;
}
