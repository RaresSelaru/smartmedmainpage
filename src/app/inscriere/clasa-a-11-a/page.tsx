import type { Metadata } from "next";

import {
  GradeProgramPage,
  gradeElevenProgram,
} from "@/components/registration/grade-program-page";
import { parseRegistrationContext } from "@/lib/registration-context";
import { siteConfig } from "@/lib/site-config";

const description =
  "Programul SmartMed pentru clasa a XI-a: consolidare, gândire analitică, mentorat și un traseu clar până la admiterea din 2028.";

export const metadata: Metadata = {
  title: "Înscriere clasa a XI-a",
  description,
  alternates: { canonical: "/inscriere/clasa-a-11-a" },
  openGraph: {
    title: "Program clasa a XI-a | " + siteConfig.name,
    description,
    siteName: siteConfig.fullName,
    type: "website",
  },
};

type GradeElevenEnrollmentPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GradeElevenEnrollmentPage({
  searchParams,
}: GradeElevenEnrollmentPageProps) {
  const context = parseRegistrationContext(await searchParams);

  return <GradeProgramPage config={gradeElevenProgram} source={context.source} />;
}
