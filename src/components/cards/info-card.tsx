import { IconSymbol } from "@/components/ui/icon-symbol";
import type { IconName } from "@/lib/site-config";

type InfoCardProps = {
  title: string;
  description: string;
  icon: IconName;
};

export function InfoCard({ title, description, icon }: InfoCardProps) {
  return (
    <article className="rounded-lg border border-smart-navy/10 bg-white/72 p-5 shadow-[0_16px_44px_rgba(13,23,38,0.06)]">
      <div className="flex size-11 items-center justify-center rounded-md border border-smart-gold/35 bg-smart-cream text-smart-navy">
        <IconSymbol className="size-5" name={icon} />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-smart-navy">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-smart-ink/66">{description}</p>
    </article>
  );
}
