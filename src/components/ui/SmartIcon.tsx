import {
  ArrowUpRight,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  GraduationCap,
  HeartPulse,
  Mail,
  Newspaper,
  PenTool,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Timer,
  UserRound,
} from "lucide-react";

import type { IconName } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export type SmartIconName = IconName | "arrow-up-right" | "check" | "send";

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
  "arrow-up-right": ArrowUpRight,
  check: CheckCircle2,
  send: Send,
} satisfies Record<SmartIconName, typeof BookOpen>;

type SmartIconProps = {
  name: SmartIconName;
  className?: string;
};

export function SmartIcon({ name, className }: SmartIconProps) {
  const Icon = iconMap[name];

  return <Icon aria-hidden="true" className={cn("size-5", className)} strokeWidth={1.7} />;
}
