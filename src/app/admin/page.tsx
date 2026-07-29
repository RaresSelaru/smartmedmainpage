import { ArrowRight, FileText, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { requireAdminCapability } from "@/lib/admin/auth";
import { getVisibleAdminModules } from "@/lib/admin/modules";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const admin = await requireAdminCapability("admin.access", {
    nextPath: "/admin",
  });
  const modules = getVisibleAdminModules(admin.capabilities);

  return (
    <div className="grid gap-8">
      <header className="rounded-[2rem] border border-smart-abyss/10 bg-white/70 p-6 shadow-[0_24px_70px_rgba(3,17,28,0.08)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-smart-teal">
              Panou administrativ
            </p>
            <h1 className="mt-3 font-serif text-5xl font-semibold leading-none sm:text-6xl">
              Bun venit, {admin.fullName}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-smart-ink/68 sm:text-base">
              Administrează fluxul editorial SmartMed din modulele autorizate
              pentru acest cont.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-700/15 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Sesiune protejată
          </span>
        </div>
      </header>

      <section aria-labelledby="admin-modules-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-smart-teal">
              Module disponibile
            </p>
            <h2
              className="mt-2 font-serif text-4xl font-semibold"
              id="admin-modules-title"
            >
              Control editorial
            </h2>
          </div>
          <p className="text-sm text-smart-ink/55">
            {modules.length} {modules.length === 1 ? "modul" : "module"}
          </p>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <Link
              className="group rounded-[2rem] border border-smart-abyss/10 bg-white/75 p-6 shadow-[0_18px_50px_rgba(3,17,28,0.06)] transition hover:-translate-y-1 hover:border-smart-teal/35 hover:shadow-[0_24px_65px_rgba(3,17,28,0.11)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
              href={module.href}
              key={module.id}
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-smart-dark text-smart-aqua">
                <FileText aria-hidden="true" className="size-6" />
              </span>
              <h3 className="mt-6 font-serif text-3xl font-semibold">
                {module.label}
              </h3>
              <p className="mt-3 text-sm leading-7 text-smart-ink/64">
                {module.description}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-smart-teal">
                Deschide modulul
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition group-hover:translate-x-1"
                />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
