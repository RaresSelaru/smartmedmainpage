import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { AssetIcon } from "@/components/ui/asset-icon";
import type { DestinationCardConfig } from "@/lib/site-config";

type DestinationCardProps = {
  card: DestinationCardConfig;
};

export function DestinationCard({ card }: DestinationCardProps) {
  return (
    <Link
      className="group flex min-h-[272px] flex-col justify-between rounded-lg border border-smart-navy/10 bg-white/72 p-5 shadow-[0_18px_52px_rgba(13,23,38,0.08)] transition duration-300 hover:-translate-y-1 hover:border-smart-gold/55 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-cyan"
      href={card.href}
    >
      <AssetIcon
        alt=""
        className="mx-auto w-32 transition duration-300 group-hover:scale-[1.03]"
        fallbackIcon={card.fallbackIcon}
        imageClassName="p-1"
        src={card.image}
      />
      <span className="mt-5 block">
        <span className="flex items-start justify-between gap-3">
          <span className="text-lg font-semibold text-smart-navy">{card.title}</span>
          <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-md border border-smart-navy/10 bg-smart-cream text-smart-navy transition group-hover:border-smart-gold/55 group-hover:bg-smart-gold/16">
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </span>
        </span>
        <span className="mt-3 block text-sm leading-6 text-smart-ink/66">
          {card.subtitle}
        </span>
      </span>
    </Link>
  );
}
