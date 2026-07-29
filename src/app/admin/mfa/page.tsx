import { LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";

import { MfaPanel } from "@/components/admin/mfa-panel";
import {
  isAdminMfaSatisfied,
  requireAdminIdentity,
} from "@/lib/admin/auth";
import { sanitizeAdminNextPath } from "@/lib/admin/redirects";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AdminMfaPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

export default async function AdminMfaPage({
  searchParams,
}: AdminMfaPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeAdminNextPath(
    typeof params.next === "string" ? params.next : "/admin",
  );
  const identity = await requireAdminIdentity({
    allowAal1: true,
    nextPath,
  });

  if (isAdminMfaSatisfied(identity)) {
    redirect(nextPath);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-smart-dark text-smart-aqua">
          <LockKeyhole aria-hidden="true" className="size-7" />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-smart-teal">
          Verificare suplimentară
        </p>
        <h1 className="mt-3 font-serif text-5xl font-semibold leading-none sm:text-6xl">
          Protejează accesul administrativ
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-smart-ink/68 sm:text-base">
          SmartMed cere un cod TOTP pentru fiecare sesiune administrativă.
          Această verificare protejează publicarea și datele editoriale chiar
          dacă parola contului este compromisă.
        </p>
      </header>

      <div className="rounded-[2rem] border border-smart-abyss/10 bg-white/75 p-6 shadow-[0_24px_70px_rgba(3,17,28,0.08)] sm:p-8">
        <MfaPanel nextPath={nextPath} />
      </div>
    </div>
  );
}
