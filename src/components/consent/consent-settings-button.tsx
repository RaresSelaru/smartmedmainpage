"use client";

import { Cookie } from "lucide-react";
import type { ReactNode } from "react";

import { OPEN_CONSENT_SETTINGS_EVENT } from "@/lib/consent";
import { cn } from "@/lib/utils";

export function ConsentSettingsButton({
  children = "Setări cookie",
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua",
        className,
      )}
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_SETTINGS_EVENT))}
      type="button"
    >
      <Cookie aria-hidden="true" className="size-[0.9em] shrink-0" />
      {children}
    </button>
  );
}
