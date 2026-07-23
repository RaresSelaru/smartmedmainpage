import type { Metadata } from "next";

import { CentruFizicLandingPage } from "@/components/centru-fizic/centru-fizic-page";

export const metadata: Metadata = {
  title: "Centrul Fizic SmartMed",
  description:
    "Descoperă centrul fizic SmartMed Academy: pregătire în sală, grupe atent formate, feedback direct, calendar orientativ și informații pentru prima vizită.",
  openGraph: {
    title: "Centrul Fizic SmartMed | SmartMed Academy",
    description:
      "Pregătire în sală, experiență academică premium și un parcurs clar pentru admiterea la Medicină.",
    type: "website",
  },
};

export default function CentruFizicPage() {
  return <CentruFizicLandingPage />;
}
