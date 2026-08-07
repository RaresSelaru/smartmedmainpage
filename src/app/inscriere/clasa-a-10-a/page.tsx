import type { Metadata } from "next";

import {
  GradeProgramPage,
  gradeTenProgram,
} from "@/components/registration/grade-program-page";
import { parseRegistrationContext } from "@/lib/registration-context";
import { siteConfig } from "@/lib/site-config";

const description =
  "Programul SmartMed pentru clasa a X-a: pregătire structurată, testări regulate, mentorat și un traseu clar până la admiterea din 2029.";

export const metadata: Metadata = {
  title: "Înscriere clasa a X-a",
  description,
  alternates: { canonical: "/inscriere/clasa-a-10-a" },
  openGraph: {
    title: "Program clasa a X-a | " + siteConfig.name,
    description,
    siteName: siteConfig.fullName,
    type: "website",
  },
};

type GradeTenEnrollmentPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GradeTenEnrollmentPage({
  searchParams,
}: GradeTenEnrollmentPageProps) {
  const context = parseRegistrationContext(await searchParams);

  return <GradeProgramPage config={gradeTenProgram} source={context.source} />;
}
