import { ClipboardCheck } from "lucide-react";

import { EvaluationAdminDashboard } from "@/components/admin/evaluation-admin-dashboard";
import { requireAdminCapability } from "@/lib/admin/auth";
import {
  getAdminEvaluations,
  getAdminEvaluationSlotCatalog,
  getAdminEvaluationSlots,
} from "@/lib/evaluations/admin-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminEvaluationsPage() {
  await requireAdminCapability("evaluations.read", {
    nextPath: "/admin/evaluari",
  });

  const [evaluationsResult, slotsResult, catalogResult] = await Promise.all([
    getAdminEvaluations(),
    getAdminEvaluationSlots(),
    getAdminEvaluationSlotCatalog(),
  ]);

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-smart-teal">
            Evaluări inițiale
          </p>
          <h1 className="mt-3 font-serif text-5xl font-semibold leading-none sm:text-6xl">
            Programări SmartMed
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-smart-ink/65 sm:text-base">
            Vezi cine urmează să vină, confirmă rezultatul discuției,
            reprogramează rapid și urmărește emailurile de confirmare.
          </p>
        </div>
        <span className="flex size-14 items-center justify-center rounded-[1.25rem] bg-smart-dark text-smart-aqua shadow-lg">
          <ClipboardCheck aria-hidden="true" className="size-7" />
        </span>
      </header>

      <EvaluationAdminDashboard
        catalog={catalogResult.data}
        catalogError={catalogResult.error}
        evaluations={evaluationsResult.data ?? []}
        evaluationsError={evaluationsResult.error}
        referenceNow={new Date().toISOString()}
        slots={slotsResult.data ?? []}
        slotsError={slotsResult.error}
      />
    </div>
  );
}
