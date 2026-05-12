import type { Metadata } from "next";

import { GrileReferralPage } from "@/components/pages/grile-referral-page";

export const metadata: Metadata = {
  title: "Grile SmartMed",
  description:
    "Pagină de trimitere către platforma externă de grile SmartMed, configurabilă prin NEXT_PUBLIC_GRILE_URL.",
};

export default function GrilePage() {
  return <GrileReferralPage />;
}
