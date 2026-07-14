import type { Metadata } from "next";

import { AccountHub } from "@/components/account/AccountHub";
import { isAuthMode, sanitizeInternalPath, type AuthMode } from "@/lib/auth/access-control";
import { getSupabaseAuthConfig } from "@/lib/auth/env";
import { getCurrentSmartMedSession } from "@/lib/auth/session";
import { siteConfig } from "@/lib/site-config";

type ContPageProps = {
  searchParams?: Promise<{
    access?: string;
    error?: string;
    mode?: string;
    next?: string;
    status?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Contul tău SmartMed",
  description:
    "Autentificare, creare cont, recuperare parolă și profil personal SmartMed.",
  openGraph: {
    title: `Contul tău SmartMed | ${siteConfig.name}`,
    description:
      "Autentificare, creare cont, recuperare parolă și profil personal SmartMed.",
    siteName: siteConfig.fullName,
    type: "website",
  },
};

function parseMode(value: string | undefined): AuthMode {
  return isAuthMode(value) ? value : "conectare";
}

export default async function ContPage({ searchParams }: ContPageProps) {
  const params = await searchParams;
  const session = await getCurrentSmartMedSession();
  const authConfig = getSupabaseAuthConfig();

  return (
    <AccountHub
      accessRequired={params?.access === "required"}
      activeMode={parseMode(params?.mode)}
      errorCode={params?.error}
      isConfigured={authConfig.isConfigured}
      nextPath={sanitizeInternalPath(params?.next)}
      session={session}
      status={params?.status}
    />
  );
}
