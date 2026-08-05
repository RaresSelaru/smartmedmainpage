import type { Metadata } from "next";

import { CentruFizicIntroPrompt } from "@/components/centru-fizic/centru-fizic-intro-prompt";
import { CentruFizicLandingPage } from "@/components/centru-fizic/centru-fizic-page";

type CentruFizicPageProps = {
  searchParams?: Promise<{
    intro?: string;
    source?: string;
  }>;
};

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

export default async function CentruFizicPage({ searchParams }: CentruFizicPageProps) {
  const params = await searchParams;

  return (
    <>
      {params?.intro === "inscriere" ? (
        <CentruFizicIntroPrompt source={params.source} />
      ) : null}
      <CentruFizicLandingPage />
    </>
  );
}
