import { Play, Radio, Sparkles } from "lucide-react";

export function VideoTeaser() {
  return (
    <div className="relative">
      <div className="absolute inset-4 rounded-lg bg-smart-cyan/18 blur-2xl" />
      <div className="relative overflow-hidden rounded-lg border border-white/70 bg-smart-ink shadow-[0_28px_80px_rgba(13,23,38,0.24)]">
        <div className="aspect-[16/11] min-h-[260px] bg-[linear-gradient(135deg,rgba(13,23,38,0.96),rgba(32,49,68,0.88)_44%,rgba(196,168,103,0.78))]">
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(120deg,rgba(255,255,255,0.18)_0_1px,transparent_1px_22px)]" />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/16 to-transparent" />
          <div className="absolute left-5 top-5 flex items-center gap-2 rounded-md border border-white/18 bg-white/10 px-3 py-2 text-xs font-medium text-white/78 backdrop-blur-md">
            <Radio aria-hidden="true" className="size-4 text-smart-cyan" />
            video introductiv
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              aria-label="Redă video-ul de prezentare SmartMed"
              className="group flex size-20 items-center justify-center rounded-md border border-white/25 bg-white/18 text-white shadow-[0_20px_50px_rgba(0,0,0,0.24)] backdrop-blur-md transition hover:scale-[1.03] hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-cyan"
              type="button"
            >
              <Play
                aria-hidden="true"
                className="ml-1 size-8 fill-current transition group-hover:scale-105"
                strokeWidth={1.6}
              />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-smart-ink via-smart-ink/82 to-transparent p-5 pt-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">SmartMed Academy</p>
                <p className="mt-1 max-w-sm text-sm leading-6 text-white/66">
                  Placeholder pregătit pentru video real, thumbnail, analytics și
                  tracking de progres.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-md border border-smart-gold/34 bg-smart-gold/14 px-3 py-2 text-xs font-medium text-smart-gold">
                <Sparkles aria-hidden="true" className="size-4" />
                Admiterea 2026
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
