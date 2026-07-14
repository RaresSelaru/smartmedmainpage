"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

const pergaments = [
  { src: "/images/special-modules/pergament-module-speciale--1.png", w: 1092, h: 1095, pos: "left-1/2 top-[0%] -translate-x-1/2", size: "w-[22%] sm:w-[18%]" },
  { src: "/images/special-modules/pergament-module-speciale-2.png", w: 1092, h: 1095, pos: "left-[3%] top-[12%]", size: "w-[22%] sm:w-[18%]" },
  { src: "/images/special-modules/pergament-module-speciale-3.png", w: 1092, h: 1095, pos: "right-[3%] top-[12%]", size: "w-[22%] sm:w-[18%]" },
  { src: "/images/special-modules/pergament-module-speciale-4.png", w: 1092, h: 1095, pos: "left-[-28%] top-[20%]", size: "w-[22%] sm:w-[18%]" },
  { src: "/images/special-modules/pergament-module-speciale-5.png", w: 1087, h: 1080, pos: "right-[-28%] top-[20%]", size: "w-[22%] sm:w-[18%]" },
] as const;

export function AtlasPergamenteSection() {
  const [preview, setPreview] = useState<string | null>(null);

  const close = useCallback(() => setPreview(null), []);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview, close]);

  return (
    <section className="relative overflow-hidden bg-smart-cream px-4 py-12 sm:px-6 sm:py-20 lg:py-28">
      <div className="relative mx-auto w-full max-w-[1000px]">
        <div className="relative w-full" style={{ paddingBottom: "105%" }}>
          {pergaments.map((p) => (
            <button
              key={p.src}
              type="button"
              className={`absolute cursor-pointer ${p.pos} ${p.size}`}
              onClick={() => setPreview(p.src)}
            >
              <Image
                alt=""
                aria-hidden="true"
                className="h-auto w-full drop-shadow-[0_8px_24px_rgba(0,0,0,0.10)] transition-transform duration-300 hover:scale-110"
                height={p.h}
                src={p.src}
                width={p.w}
              />
            </button>
          ))}

          {/* Atlas — center */}
          <div className="absolute left-1/2 top-[22%] w-[48%] -translate-x-1/2 sm:w-[44%]">
            <Image
              alt=""
              aria-hidden="true"
              className="h-auto w-full drop-shadow-[0_12px_32px_rgba(0,0,0,0.16)]"
              height={529}
              src="/images/special-modules/atlas-statuie-module-speciale-no-bg.png"
              width={460}
            />
          </div>

          {/* Pergament 0 — closed scroll, bottom center */}
          <div className="absolute bottom-[2%] left-1/2 w-[72%] -translate-x-1/2 sm:w-[64%]">
            <Image
              alt=""
              aria-hidden="true"
              className="h-auto w-full drop-shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
              height={226}
              src="/images/special-modules/pergament-module-speciale-0.png"
              width={606}
            />
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {preview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={close}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image
              alt="Pergament preview"
              className="h-auto max-h-[90vh] w-auto min-w-[70vw] rounded-lg object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.4)] sm:min-w-[55vw] lg:min-w-[45vw]"
              height={1095}
              src={preview}
              width={1092}
            />
            <button
              type="button"
              className="absolute -right-3 -top-3 flex size-9 items-center justify-center rounded-full bg-smart-abyss/80 text-white shadow-lg transition-colors hover:bg-smart-abyss"
              onClick={close}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
