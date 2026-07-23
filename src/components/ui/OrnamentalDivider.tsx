import { cn } from "@/lib/utils";

type OrnamentalDividerProps = {
  className?: string;
};

export function OrnamentalDivider({ className }: OrnamentalDividerProps) {
  return (
    <div
      aria-hidden="true"
      data-ornamental-divider="true"
      className={cn(
        "relative left-1/2 flex w-[min(92vw,1500px)] -translate-x-1/2 items-center gap-4 sm:gap-5 lg:gap-6",
        className,
      )}
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-smart-gold/25 to-smart-gold/40" />
      <span className="size-2 rotate-45 rounded-[1px] border border-smart-gold/45 bg-smart-gold/25 shadow-[0_0_12px_rgba(200,168,117,0.10)]" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-smart-gold/25 to-smart-gold/40" />
    </div>
  );
}
