import {
  BookOpen,
  Building2,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  GraduationCap,
  HeartPulse,
  Mail,
  Newspaper,
  PenTool,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Timer,
  UserRound,
} from "lucide-react";

import type { IconName } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const iconMap = {
  "book-open": BookOpen,
  building: Building2,
  calendar: CalendarDays,
  clipboard: ClipboardCheck,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  help: CircleHelp,
  mail: Mail,
  newspaper: Newspaper,
  "pen-tool": PenTool,
  shield: ShieldCheck,
  "shopping-bag": ShoppingBag,
  sparkles: Sparkles,
  stethoscope: Stethoscope,
  timer: Timer,
  user: UserRound,
} satisfies Record<IconName, typeof BookOpen>;

type IconSymbolProps = {
  name: IconName;
  className?: string;
  decorative?: boolean;
};

export function IconSymbol({
  name,
  className,
  decorative = true,
}: IconSymbolProps) {
  const Icon = iconMap[name];

  return (
    <Icon
      aria-hidden={decorative}
      className={cn("size-5", className)}
      strokeWidth={1.8}
    />
  );
}
