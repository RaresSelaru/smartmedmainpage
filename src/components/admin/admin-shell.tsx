"use client";

import {
  CalendarDays,
  ClipboardCheck,
  Crown,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { AdminAssuranceLevel } from "@/lib/admin/auth";
import type {
  AdminModuleIconKey,
  AdminModuleSummary,
} from "@/lib/admin/module-types";
import { logoutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

type AdminShellIdentity = {
  currentAal: AdminAssuranceLevel;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
  mfaRequired: boolean;
};

type AdminShellProps = {
  children: ReactNode;
  identity: AdminShellIdentity;
  modules: readonly AdminModuleSummary[];
};

function isActivePath(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function ModuleIcon({ icon }: { icon: AdminModuleIconKey }) {
  if (icon === "administrators") {
    return <UsersRound aria-hidden="true" className="size-5" />;
  }

  if (icon === "calendar") {
    return <CalendarDays aria-hidden="true" className="size-5" />;
  }

  if (icon === "files") {
    return <FileText aria-hidden="true" className="size-5" />;
  }

  if (icon === "evaluations") {
    return <ClipboardCheck aria-hidden="true" className="size-5" />;
  }

  if (icon === "enrollments") {
    return <UserRoundCheck aria-hidden="true" className="size-5" />;
  }

  return <LayoutDashboard aria-hidden="true" className="size-5" />;
}

function AdminNavigation({
  modules,
  pathname,
}: {
  modules: readonly AdminModuleSummary[];
  pathname: string;
}) {
  const linkClass =
    "flex min-h-11 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-aqua";

  return (
    <nav aria-label="Navigare administrare" className="grid gap-2">
      <Link
        aria-current={pathname === "/admin" ? "page" : undefined}
        className={cn(
          linkClass,
          pathname === "/admin"
            ? "bg-smart-aqua/15 text-smart-aqua"
            : "text-smart-white/72 hover:bg-white/7 hover:text-smart-white",
        )}
        href="/admin"
      >
        <LayoutDashboard aria-hidden="true" className="size-5" />
        Panou principal
      </Link>

      {modules.map((module) => {
        const active = isActivePath(pathname, module.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              linkClass,
              active
                ? "bg-smart-aqua/15 text-smart-aqua"
                : "text-smart-white/72 hover:bg-white/7 hover:text-smart-white",
            )}
            href={module.href}
            key={module.id}
          >
            <ModuleIcon icon={module.icon} />
            {module.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AssuranceBadge({
  currentAal,
  mfaRequired,
}: Pick<AdminShellIdentity, "currentAal" | "mfaRequired">) {
  const satisfied = currentAal === "aal2";
  const label = satisfied
    ? "MFA verificat"
    : mfaRequired
      ? "MFA necesar"
      : "MFA local";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]",
        satisfied
          ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
          : mfaRequired
            ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
            : "border-smart-aqua/25 bg-smart-aqua/10 text-smart-aqua",
      )}
    >
      <ShieldCheck aria-hidden="true" className="size-4" />
      {label}
    </span>
  );
}

function IdentitySummary({ identity }: { identity: AdminShellIdentity }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate text-sm font-bold text-smart-white">
          {identity.fullName}
        </p>
        {identity.isSuperAdmin ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-smart-gold/25 bg-smart-gold/10 px-2 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-[#f3d794]">
            <Crown aria-hidden="true" className="size-3" />
            Super administrator
          </span>
        ) : null}
      </div>
      <p className="mt-1 truncate text-xs text-smart-white/52">
        {identity.email}
      </p>
    </div>
  );
}

function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-semibold text-smart-white/72 transition hover:border-smart-aqua/35 hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-aqua"
        type="submit"
      >
        <LogOut aria-hidden="true" className="size-4" />
        Deconectare
      </button>
    </form>
  );
}

export function AdminShell({
  children,
  identity,
  modules,
}: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-svh bg-[#f4f0e8] text-smart-ink">
      <a
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-xl bg-smart-dark px-4 py-3 text-sm font-bold text-smart-white transition focus:translate-y-0"
        href="#admin-main"
      >
        Sari la conținutul administrativ
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-white/8 bg-smart-dark px-5 py-6 text-smart-white lg:flex">
        <Link
          className="rounded-2xl px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-aqua"
          href="/admin"
        >
          <span className="block font-serif text-3xl font-semibold">
            SmartMed
          </span>
          <span className="mt-1 block text-xs font-bold uppercase tracking-[0.2em] text-smart-aqua">
            Administrare SmartMed
          </span>
        </Link>

        <div className="mt-8">
          <AdminNavigation modules={modules} pathname={pathname} />
        </div>

        <div className="mt-auto grid gap-4 border-t border-white/10 pt-5">
          <AssuranceBadge
            currentAal={identity.currentAal}
            mfaRequired={identity.mfaRequired}
          />
          <IdentitySummary identity={identity} />
          <Link
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/12 px-4 py-3 text-sm font-semibold text-smart-white/72 transition hover:border-smart-aqua/35 hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-aqua"
            href="/"
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            Vezi site-ul public
          </Link>
          <LogoutButton />
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-smart-abyss/10 bg-[#f4f0e8]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link
            className="rounded-xl font-serif text-2xl font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal"
            href="/admin"
          >
            SmartMed Admin
          </Link>

          <details className="group relative">
            <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-2xl border border-smart-abyss/12 bg-white/65 text-smart-ink marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal">
              <Menu aria-hidden="true" className="size-5" />
              <span className="sr-only">Deschide navigarea administrativă</span>
            </summary>
            <div className="absolute right-0 mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-smart-dark p-4 text-smart-white shadow-2xl">
              <AdminNavigation modules={modules} pathname={pathname} />
              <div className="mt-4 grid gap-3 border-t border-white/10 pt-4">
                <AssuranceBadge
                  currentAal={identity.currentAal}
                  mfaRequired={identity.mfaRequired}
                />
                <IdentitySummary identity={identity} />
                <Link
                  className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/12 px-4 py-3 text-sm font-semibold text-smart-white/72"
                  href="/"
                >
                  <ExternalLink aria-hidden="true" className="size-4" />
                  Site public
                </Link>
                <LogoutButton />
              </div>
            </div>
          </details>
        </div>
      </header>

      <main
        className="min-h-svh px-4 py-8 sm:px-6 lg:ml-72 lg:px-10 lg:py-10"
        id="admin-main"
      >
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
