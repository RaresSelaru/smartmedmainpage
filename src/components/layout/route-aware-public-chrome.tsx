"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type RouteAwarePublicChromeProps = {
  children: ReactNode;
  footer: ReactNode;
  navbar: ReactNode;
};

export function RouteAwarePublicChrome({
  children,
  footer,
  navbar,
}: RouteAwarePublicChromeProps) {
  const pathname = usePathname();
  const isAdminRoute =
    pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminRoute) {
    return children;
  }

  return (
    <>
      {navbar}
      <main className="flex-1">{children}</main>
      {footer}
    </>
  );
}
