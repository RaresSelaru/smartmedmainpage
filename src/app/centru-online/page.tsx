import type { Metadata } from "next";

import { OnlineCenterPage } from "@/components/pages/online-center-page";

export const metadata: Metadata = {
  title: "Centru SmartMed Online",
  description:
    "Structură premium pentru cursuri online, module, progres, abonamente și acces diferențiat SmartMed.",
};

export default function CentruOnlinePage() {
  return <OnlineCenterPage />;
}
