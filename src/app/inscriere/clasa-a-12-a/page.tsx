import type { Metadata } from "next";

import {
  GradeProgramPage,
  gradeTwelveProgram,
} from "@/components/registration/grade-program-page";
import { parseRegistrationContext } from "@/lib/registration-context";
import { siteConfig } from "@/lib/site-config";

const description =
  "Programul SmartMed pentru clasa a XII-a: pregătire intensivă, testări, mentorat și strategie lunară pentru admiterea din 2027.";

export const metadata: Metadata = {
  title: "Înscriere clasa a XII-a",
  description,
  alternates: { canonical: "/inscriere/clasa-a-12-a" },
  openGraph: {
    title: "Program clasa a XII-a | " + siteConfig.name,
    description,
    siteName: siteConfig.fullName,
    type: "website",
  },
};

type GradeTwelveEnrollmentPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GradeTwelveEnrollmentPage({
  searchParams,
}: GradeTwelveEnrollmentPageProps) {
  const context = parseRegistrationContext(await searchParams);

  return <GradeProgramPage config={gradeTwelveProgram} source={context.source} />;
}
