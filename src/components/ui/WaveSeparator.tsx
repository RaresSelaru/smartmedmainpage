import { cn } from "@/lib/utils";

type WaveSeparatorProps = {
  fill: "cream" | "teal" | "dark";
  position?: "top" | "bottom";
  variant?: "default" | "relaxed";
  className?: string;
};

const fills = {
  cream: { back: "fill-smart-cream-deep", front: "fill-smart-cream" },
  teal: { back: "fill-smart-teal-soft", front: "fill-smart-teal" },
  dark: { back: "fill-smart-deep", front: "fill-smart-dark" },
};

const paths = {
  default: {
    back: "M-120 98 C 250 98, 400 22, 720 22 C 1040 22, 1130 148, 1560 120 L 1560 200 L -120 200 Z",
    front: "M-120 150 C 260 150, 405 76, 720 76 C 1040 76, 1135 188, 1560 154 L 1560 200 L -120 200 Z",
  },
  relaxed: {
    back: "M-120 118 C 250 118, 420 56, 720 56 C 1040 56, 1130 146, 1560 130 L 1560 200 L -120 200 Z",
    front: "M-120 166 C 260 166, 420 112, 720 112 C 1040 112, 1140 186, 1560 168 L 1560 200 L -120 200 Z",
  },
};

export function WaveSeparator({
  fill,
  position = "bottom",
  variant = "default",
  className,
}: WaveSeparatorProps) {
  const { back, front } = fills[fill];
  const wavePaths = paths[variant];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 z-20 h-36 overflow-hidden sm:h-48",
        position === "top" ? "-top-px rotate-180" : "-bottom-px",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className={cn("absolute bottom-0 h-full w-full", back)}
        preserveAspectRatio="none"
        viewBox="0 0 1440 200"
      >
        <path d={wavePaths.back} />
      </svg>
      <svg
        aria-hidden="true"
        className={cn("absolute bottom-0 h-full w-full", front)}
        preserveAspectRatio="none"
        viewBox="0 0 1440 200"
      >
        <path d={wavePaths.front} />
      </svg>
    </div>
  );
}
