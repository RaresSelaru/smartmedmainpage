import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import {
  getGrantedAdminCapabilities,
  requireAdminIdentity,
} from "@/lib/admin/auth";
import { getVisibleAdminModules } from "@/lib/admin/modules";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
    noarchive: true,
    nocache: true,
    noimageindex: true,
    nosnippet: true,
  },
  title: {
    default: "Administrare",
    template: "%s | SmartMed Administrare",
  },
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const identity = await requireAdminIdentity({
    allowAal1: true,
    nextPath: "/admin",
  });
  const modules = getVisibleAdminModules(
    getGrantedAdminCapabilities(identity),
  );

  return (
    <AdminShell
      identity={{
        currentAal: identity.currentAal,
        email: identity.email,
        fullName: identity.fullName,
        mfaRequired: identity.mfaRequired,
      }}
      modules={modules}
    >
      {children}
    </AdminShell>
  );
}
