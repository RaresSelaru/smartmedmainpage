import { UserRoundCheck } from "lucide-react";

import { CenterEnrollmentsDashboard } from "@/components/admin/center-enrollments-dashboard";
import { requireAdminCapability } from "@/lib/admin/auth";
import { getAdminCenterEnrollments } from "@/lib/center-enrollments/admin-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminCenterEnrollmentsPage() {
  await requireAdminCapability("enrollments.read", {
    nextPath: "/admin/inscrieri",
  });
  const result = await getAdminCenterEnrollments();

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-smart-teal">
            Admitere SmartMed
          </p>
          <h1 className="mt-3 font-serif text-5xl font-semibold leading-none sm:text-6xl">
            Înscrieri la centru
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-smart-ink/65 sm:text-base">
            Un singur loc pentru candidați, preferințe, acorduri, follow-up și
            stadiul conversației cu echipa SmartMed.
          </p>
        </div>
        <span className="flex size-14 items-center justify-center rounded-[1.25rem] bg-smart-dark text-smart-aqua shadow-lg">
          <UserRoundCheck aria-hidden="true" className="size-7" />
        </span>
      </header>

      <CenterEnrollmentsDashboard
        enrollments={result.data}
        error={result.error}
      />
    </div>
  );
}
