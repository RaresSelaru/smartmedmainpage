import type { Metadata } from "next";
import { Barlow_Condensed, Cormorant_Garamond, Kaushan_Script, Manrope } from "next/font/google";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import StyledComponentsRegistry from "@/lib/styled-components-registry";
import { siteConfig } from "@/lib/site-config";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const kaushanScript = Kaushan_Script({
  variable: "--font-script",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} | Pregătire pentru Medicină`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    title: `${siteConfig.name} | Pregătire pentru Medicină`,
    description: siteConfig.description,
    siteName: siteConfig.fullName,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ro"
      className={`${manrope.variable} ${cormorant.variable} ${kaushanScript.variable} ${barlowCondensed.variable} h-full`}
    >
      <body className="flex min-h-full flex-col antialiased">
        <StyledComponentsRegistry>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
