import Image from "next/image";
import { Play } from "lucide-react";

import { generatedAssets } from "@/lib/site-config";

export function HeroMediaFrame() {
  return (
    <>
      <div className="hero-media-field pointer-events-none absolute inset-0 z-[5] overflow-hidden">
        <div className="hero-media-image-mask">
          <Image
            alt=""
            className="object-cover object-center"
            fill
            loading="eager"
            sizes="(max-width: 767px) 140vw, (max-width: 1023px) 96vw, 76vw"
            src={generatedAssets.heroNeural}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_34%,rgba(156,206,208,0.24),transparent_34%),radial-gradient(circle_at_74%_53%,rgba(200,168,117,0.18),transparent_26%),linear-gradient(90deg,rgba(3,17,28,0.72)_0%,rgba(6,22,34,0.34)_34%,transparent_68%)]" />
        </div>
        <div className="hero-media-wash" />
      </div>
      <button
        aria-label="Redă video-ul de prezentare SmartMed"
        className="hero-media-play pointer-events-auto absolute right-8 z-[15] flex size-14 -translate-y-1/2 items-center justify-center rounded-full border border-white/16 bg-white/10 text-smart-white shadow-[0_0_64px_16px_rgba(156,206,208,0.20),0_18px_50px_rgba(3,17,28,0.38)] backdrop-blur-xl transition hover:scale-[1.04] hover:bg-white/18 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua sm:right-[18%] sm:top-[67%] sm:size-16 md:right-[17%] md:top-[55%] lg:right-[21%] lg:top-[48%] lg:size-20"
        type="button"
      >
        <Play aria-hidden="true" className="ml-1 size-5 fill-current sm:size-6 lg:size-7" strokeWidth={1.5} />
      </button>
    </>
  );
}
