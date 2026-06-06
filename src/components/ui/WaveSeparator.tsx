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
        <path d="M0 90 C 320 90, 400 20, 720 20 C 1040 20, 1120 138, 1440 118 L 1440 180 L 0 180 Z" />
      </svg>
      <svg
        aria-hidden="true"
        className={cn("absolute bottom-0 h-full w-full", front)}
        preserveAspectRatio="none"
        viewBox="0 0 1440 180"
      >
        <path d="M0 140 C 320 140, 400 70, 720 70 C 1040 70, 1120 174, 1440 150 L 1440 180 L 0 180 Z" />
      </svg>
    </div>
  );
}
