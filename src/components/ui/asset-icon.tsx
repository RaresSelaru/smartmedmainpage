"use client";

import Image from "next/image";
import { useState } from "react";

import { IconSymbol } from "@/components/ui/icon-symbol";
import type { IconName } from "@/lib/site-config";
import { cn } from "@/lib/utils";

type AssetIconProps = {
  src?: string;
  alt: string;
  fallbackIcon: IconName;
  className?: string;
  imageClassName?: string;
  sizes?: string;
};

export function AssetIcon({
  src,
  alt,
  fallbackIcon,
  className,
  imageClassName,
  sizes = "(max-width: 768px) 42vw, 180px",
}: AssetIconProps) {
  const [failed, setFailed] = useState(false);
  const imageSrc = src && !failed ? src : null;

  return (
    <span
      className={cn(
        "relative flex aspect-square w-full items-center justify-center overflow-hidden",
        className,
      )}
    >
      {imageSrc ? (
        <Image
          alt={alt}
          className={cn("object-contain", imageClassName)}
          fill
          onError={() => setFailed(true)}
          sizes={sizes}
          src={imageSrc}
          unoptimized
        />
      ) : (
        <span className="flex size-24 items-center justify-center rounded-md border border-smart-gold/35 bg-white/70 text-smart-navy shadow-[0_16px_44px_rgba(13,23,38,0.08)]">
          <IconSymbol className="size-11" name={fallbackIcon} />
        </span>
      )}
    </span>
  );
}
