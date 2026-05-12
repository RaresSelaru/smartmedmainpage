import { cn } from "@/lib/utils";

type WaveSeparatorProps = {
  fill: "cream" | "teal" | "dark";
  position?: "top" | "bottom";
  className?: string;
};

const fills = {
  cream: { back: "fill-smart-cream-deep", front: "fill-smart-cream" },
  teal: { back: "fill-smart-teal-soft", front: "fill-smart-teal" },
  dark: { back: "fill-smart-deep", front: "fill-smart-dark" },
};

export function WaveSeparator({
  fill,
  position = "bottom",
  className,
}: WaveSeparatorProps) {
  const { back, front } = fills[fill];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 z-20 h-32 overflow-hidden sm:h-44",
        position === "top" ? "-top-px rotate-180" : "-bottom-px",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className={cn("absolute bottom-0 h-full w-full", back)}
        preserveAspectRatio="none"
        viewBox="0 0 1440 180"
      >
        <path d="M0 88C152 154 320 174 488 134C656 94 824 26 992 42C1160 58 1304 130 1440 110V180H0V88Z" />
      </svg>
      <svg
        aria-hidden="true"
        className={cn("absolute bottom-0 h-full w-full", front)}
        preserveAspectRatio="none"
        viewBox="0 0 1440 180"
      >
        <path d="M0 130C168 168 336 156 504 130C672 104 840 64 1008 78C1176 92 1296 138 1440 152V180H0V130Z" />
      </svg>
    </div>
  );
}
