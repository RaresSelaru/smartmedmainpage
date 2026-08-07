import type { Metadata } from "next";

import { GrileReferralPage } from "@/components/pages/grile-referral-page";

export const metadata: Metadata = {
  title: "Grile SmartMed",
  description:
    "Exersează pentru admitere cu grile SmartMed organizate pe discipline, capitole și niveluri de pregătire.",
};

export default function GrilePage() {
  return <GrileReferralPage />;
}
