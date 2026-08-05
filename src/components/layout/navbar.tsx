"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  GraduationCap,
  LogOut,
  Menu,
  Search,
  ShoppingCart,
  UserRoundCheck,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { logoutAction } from "@/lib/auth/actions";
import type { SmartMedSessionSummary } from "@/lib/auth/session";
import { navbarRoutes } from "@/lib/routes";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  const routePath = href.split("#", 1)[0] || "/";

  return routePath === "/"
    ? pathname === "/"
    : pathname === routePath || pathname.startsWith(`${routePath}/`);
}

const navActionClass =
  "group/action relative hidden h-12 w-11 shrink-0 items-center justify-center text-smart-white/78 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua sm:inline-flex";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [homeCtaGate, setHomeCtaGate] = useState({
    pathname: "",
    passed: false,
  });
  const [navHidden, setNavHidden] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const lastScrollYRef = useRef(0);
  const upwardScrollRef = useRef(0);
  const revealDelayRef = useRef<number | null>(null);
  const [accountSession, setAccountSession] = useState<SmartMedSessionSummary | null>(null);
  const searchExpanded = searchOpen || searchValue.length > 0;
  const accountInitial = accountSession?.fullName.trim().charAt(0).toUpperCase() ?? "";
  const showRegistrationCta =
    pathname !== "/" ||
    (homeCtaGate.pathname === pathname && homeCtaGate.passed);
  const keepHomeNavigationVisible =
    pathname === "/" &&
    homeCtaGate.pathname === pathname &&
    homeCtaGate.passed;

  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 20);

      if (pathname !== "/") {
        return;
      }

      const primaryCta = document.querySelector<HTMLElement>(
        "[data-home-primary-cta='true']",
      );

      if (!primaryCta) {
        return;
      }

      const headerBottom =
        document
          .querySelector<HTMLElement>("[data-smart-header='true']")
          ?.getBoundingClientRect().bottom ?? 96;
      const passed = primaryCta.getBoundingClientRect().bottom <= headerBottom;

      setHomeCtaGate((current) =>
        current.pathname === pathname && current.passed === passed
          ? current
          : { pathname, passed },
      );
    };

    update();
    const fallbackInterval = window.setInterval(update, 200);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.clearInterval(fallbackInterval);
    };
  }, [pathname]);

  useEffect(() => {
    let active = true;

    async function loadAccountSession() {
      try {
        const response = await fetch("/auth/session", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { session: SmartMedSessionSummary | null };

        if (active) {
          setAccountSession(payload.session);
        }
      } catch {
        if (active) {
          setAccountSession(null);
        }
      }
    }

    loadAccountSession();
    window.addEventListener("smartmed-auth-change", loadAccountSession);

    return () => {
      active = false;
      window.removeEventListener("smartmed-auth-change", loadAccountSession);
    };
  }, [pathname]);

  useEffect(() => {
    const clearRevealDelay = () => {
      if (revealDelayRef.current) {
        window.clearTimeout(revealDelayRef.current);
        revealDelayRef.current = null;
      }
    };

    const revealNav = () => {
      clearRevealDelay();
      setNavHidden(false);
    };

    const getHideStartY = () => {
      if (pathname === "/") {
        const homeHero = document.querySelector<HTMLElement>("[data-home-hero='true']");

        if (homeHero) {
          const heroBottom = homeHero.getBoundingClientRect().bottom + window.scrollY;

          return Math.max(140, heroBottom - 16);
        }
      }

      return 180;
    };

    const updateVisibility = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;
      lastScrollYRef.current = currentY;
      const hideStartY = getHideStartY();

      if (
        keepHomeNavigationVisible ||
        open ||
        searchExpanded ||
        currentY < hideStartY
      ) {
        upwardScrollRef.current = 0;
        revealNav();
        return;
      }

      if (delta > 8) {
        upwardScrollRef.current = 0;
        clearRevealDelay();
        setNavHidden(true);
        return;
      }

      if (delta < -6) {
        upwardScrollRef.current += Math.abs(delta);

        if (upwardScrollRef.current > 92 && !revealDelayRef.current) {
          revealDelayRef.current = window.setTimeout(() => {
            setNavHidden(false);
            revealDelayRef.current = null;
          }, 170);
        }
      }
    };

    const revealFromTopIntent = (event: PointerEvent) => {
      if (event.clientY <= 34) {
        upwardScrollRef.current = 0;
        revealNav();
      }
    };

    lastScrollYRef.current = window.scrollY;
    updateVisibility();

    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("pointermove", revealFromTopIntent, { passive: true });
    window.addEventListener("resize", updateVisibility, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("pointermove", revealFromTopIntent);
      window.removeEventListener("resize", updateVisibility);
      clearRevealDelay();
    };
  }, [keepHomeNavigationVisible, open, pathname, searchExpanded]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setOpen(false);
      setSearchOpen(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (searchOpen) {
      desktopSearchInputRef.current?.focus();
    }
  }, [searchOpen]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchValue.trim();

    router.push(query ? `/cautare?q=${encodeURIComponent(query)}` : "/cautare");
    setSearchOpen(false);
    setOpen(false);
  }

  return (
    <header
      className={cn(
        "smart-header-shell fixed inset-x-0 top-0 z-50 pt-4 will-change-transform sm:pt-5 lg:pt-4",
        navHidden && "smart-header-shell--hidden pointer-events-none",
      )}
      data-smart-header="true"
    >
      <nav
        aria-label="Navigație principală"
        className={cn(
          "smart-nav-container flex min-h-[74px] items-center justify-between gap-3 rounded-full border px-3 py-2 backdrop-blur-2xl transition-all duration-500 ease-out sm:px-4 lg:min-h-[68px] lg:px-3.5 xl:gap-[1.125rem]",
          scrolled
            ? "border-white/14 bg-smart-dark/74 shadow-[0_20px_60px_rgba(3,17,28,0.34)]"
            : "border-white/10 bg-smart-dark/38 shadow-[0_12px_36px_rgba(3,17,28,0.22)]",
        )}
      >
        <Link
          aria-label="SmartMed Academy, mergi la pagina principală"
          className="group flex min-w-0 items-center gap-[2px] rounded-full text-smart-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua"
          href="/"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="size-[65px] shrink-0 object-contain lg:size-[60px]"
            height={65}
            src="/assets/brand/smartmed-logo-mark.svg"
            width={65}
          />
          <span className="hidden -ml-2.5 max-w-[170px] whitespace-nowrap text-center leading-none sm:block xl:hidden">
            <span className="block font-serif text-xl font-semibold uppercase tracking-[0.16em]">
              {siteConfig.name}
            </span>
            <span className="-mt-[5px] block font-serif text-sm uppercase tracking-[0.18em] text-smart-cream">
              Academy
            </span>
          </span>
        </Link>

        <div className="hidden min-w-0 items-center justify-center gap-1 xl:flex">
          {navbarRoutes.map((item) => {
            const active = isActive(pathname, item.href);

            if (item.children && item.children.length > 0) {
              return (
                <div
                  className="group/dropdown relative"
                  data-nav-dropdown="true"
                  key={`${item.label}-${item.href}`}
                >
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-1 whitespace-nowrap px-1.5 py-3 text-[13px] font-semibold text-smart-white/82 transition hover:text-smart-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua",
                      "after:absolute after:inset-x-2 after:-bottom-0.5 after:h-px after:origin-center after:scale-x-0 after:bg-gradient-to-r after:from-transparent after:via-smart-gold-light/80 after:to-transparent after:transition-transform after:duration-300 hover:after:scale-x-100",
                      active && "text-smart-white after:scale-x-100",
                    )}
                    href={item.href}
                    onClick={(event) => event.currentTarget.blur()}
                  >
                    {item.label}
                    <ChevronDown
                      aria-hidden="true"
                      className="size-3.5 shrink-0 transition duration-300 group-hover/dropdown:rotate-180 group-focus-within/dropdown:rotate-180"
                      strokeWidth={2}
                    />
                  </Link>
                  <div
                    className="pointer-events-none invisible absolute left-0 top-full z-20 pt-3 opacity-0 transition-[opacity,visibility] duration-200 ease-out group-hover/dropdown:pointer-events-auto group-hover/dropdown:visible group-hover/dropdown:opacity-100 group-focus-within/dropdown:pointer-events-auto group-focus-within/dropdown:visible group-focus-within/dropdown:opacity-100"
                    data-nav-dropdown-panel="true"
                  >
                    <div className="min-w-[210px] translate-y-1 rounded-2xl border border-white/12 bg-smart-dark/95 p-2 shadow-[0_20px_50px_rgba(3,17,28,0.34)] backdrop-blur-2xl transition-transform duration-200 ease-out group-hover/dropdown:translate-y-0 group-focus-within/dropdown:translate-y-0">
                      {item.children.map((child) => (
                        <Link
                          className="block whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold text-smart-white/84 transition hover:bg-white/8 hover:text-smart-white"
                          href={child.href}
                          key={`${child.label}-${child.href}`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative whitespace-nowrap px-1.5 py-3 text-[13px] font-semibold text-smart-white/82 transition hover:text-smart-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua",
                  "after:absolute after:inset-x-2 after:-bottom-0.5 after:h-px after:origin-center after:scale-x-0 after:bg-gradient-to-r after:from-transparent after:via-smart-gold-light/80 after:to-transparent after:transition-transform after:duration-300 hover:after:scale-x-100",
                  active && "text-smart-white after:scale-x-100",
                )}
                href={item.href}
                key={`${item.label}-${item.href}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {keepHomeNavigationVisible ? (
            <Link
              aria-label="Înscrie-te la Centrul SmartMed"
              className="group inline-flex size-11 shrink-0 items-center justify-center gap-2 rounded-full border border-smart-gold-light/55 bg-[linear-gradient(180deg,#efd39b_0%,#d4aa68_100%)] text-sm font-extrabold text-smart-abyss shadow-[0_12px_30px_rgba(213,173,107,0.22),inset_0_1px_0_rgba(255,255,255,0.58)] transition duration-300 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold md:w-auto md:px-4 lg:hidden"
              href="/#abonamente"
            >
              <GraduationCap
                aria-hidden="true"
                className="size-[18px] shrink-0 transition-transform duration-300 group-hover:-rotate-6"
                strokeWidth={1.8}
              />
              <span aria-hidden="true" className="hidden md:inline">
                Înscriere
              </span>
            </Link>
          ) : null}
          <Link
            aria-hidden={!showRegistrationCta}
            className={cn(
              "group hidden min-h-11 items-center gap-2 overflow-hidden whitespace-nowrap rounded-full border bg-[linear-gradient(180deg,#efd39b_0%,#d4aa68_100%)] text-sm font-extrabold text-smart-abyss transition-[max-width,opacity,padding,border-color,box-shadow] duration-500 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-gold lg:inline-flex",
              showRegistrationCta
                ? "max-w-[150px] border-smart-gold-light/55 px-4 opacity-100 shadow-[0_12px_30px_rgba(213,173,107,0.2),inset_0_1px_0_rgba(255,255,255,0.58)] hover:shadow-[0_16px_38px_rgba(213,173,107,0.3),inset_0_1px_0_rgba(255,255,255,0.68)]"
                : "pointer-events-none max-w-0 border-transparent px-0 opacity-0 shadow-none",
            )}
            href="/#abonamente"
            tabIndex={showRegistrationCta ? undefined : -1}
          >
            <GraduationCap
              aria-hidden="true"
              className="size-[18px] transition-transform duration-300 group-hover:-rotate-6"
              strokeWidth={1.8}
            />
            Înscriere
          </Link>
          <form
            className={cn(
              "group/search hidden h-11 items-center overflow-hidden rounded-full transition-all duration-500 ease-out lg:flex",
              searchExpanded
                ? "w-52 border border-white/10 bg-white/[0.045] pl-4 pr-1 focus-within:border-smart-aqua/45 focus-within:bg-white/[0.08] focus-within:shadow-[0_12px_30px_rgba(156,206,208,0.16)]"
                : "w-11 border border-transparent bg-transparent px-0",
            )}
            onSubmit={submitSearch}
          >
            <label className="sr-only" htmlFor="navbar-search">
              Caută în site
            </label>
            <input
              className={cn(
                "min-w-0 flex-1 bg-transparent text-sm text-smart-white outline-none transition-all duration-300 placeholder:text-smart-muted/80",
                searchExpanded ? "w-auto opacity-100" : "pointer-events-none w-0 opacity-0",
              )}
              id="navbar-search"
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Caută în site"
              ref={desktopSearchInputRef}
              tabIndex={searchExpanded ? undefined : -1}
              type="search"
              value={searchValue}
            />
            <button
              aria-label="Caută în site"
              className="flex size-11 shrink-0 items-center justify-center text-smart-white/78 transition duration-300 hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua"
              onClick={() => {
                if (!searchExpanded) {
                  setSearchOpen(true);
                }
              }}
              type={searchExpanded ? "submit" : "button"}
            >
              <Search aria-hidden="true" className="size-[21px]" strokeWidth={1.75} />
            </button>
          </form>
          <button
            aria-label="Deschide căutarea"
            className="inline-flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-smart-white/78 transition duration-300 hover:-translate-y-0.5 hover:border-smart-aqua/45 hover:bg-white/[0.08] hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua lg:hidden"
            onClick={() => {
              setSearchOpen(true);
              setOpen(true);
            }}
            type="button"
          >
            <Search aria-hidden="true" className="size-[21px]" strokeWidth={1.75} />
          </button>
          <Link aria-label="Mergi la shop" className={navActionClass} href="/shop">
            <ShoppingCart aria-hidden="true" className="size-[24px]" strokeWidth={1.75} />
          </Link>
          {accountSession ? (
            <div className="hidden items-center gap-1 sm:inline-flex">
              <Link
                aria-label={`Mergi la profilul ${accountSession.fullName}`}
                className="inline-flex h-12 min-w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-sm font-extrabold text-smart-white/86 transition duration-300 hover:-translate-y-0.5 hover:border-smart-aqua/45 hover:bg-white/[0.08] hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua"
                href="/cont"
              >
                {accountInitial || <UserRoundCheck aria-hidden="true" className="size-[25px]" strokeWidth={1.7} />}
              </Link>
              <form action={logoutAction}>
                <button
                  aria-label="Ieși din cont"
                  className="inline-flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-smart-white/78 transition duration-300 hover:-translate-y-0.5 hover:border-smart-aqua/45 hover:bg-white/[0.08] hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua"
                  type="submit"
                >
                  <LogOut aria-hidden="true" className="size-[20px]" strokeWidth={1.75} />
                </button>
              </form>
            </div>
          ) : (
            <Link aria-label="Mergi la contul tău" className={navActionClass} href="/cont">
              <UserRoundCheck aria-hidden="true" className="size-[25px]" strokeWidth={1.7} />
            </Link>
          )}
          <button
            aria-expanded={open}
            aria-label={open ? "Închide meniul" : "Deschide meniul"}
            className="inline-flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-smart-white/82 transition duration-300 hover:-translate-y-0.5 hover:border-smart-aqua/45 hover:bg-white/[0.08] hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua xl:hidden"
            onClick={() => setOpen((current) => !current)}
            type="button"
          >
            {open ? <X aria-hidden="true" className="size-[18px]" strokeWidth={1.75} /> : <Menu aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />}
          </button>
        </div>
      </nav>

      {open ? (
        <div className="smart-container mt-3 overflow-hidden rounded-[32px] border border-white/14 bg-smart-abyss/88 p-4 text-smart-white shadow-[0_28px_80px_rgba(0,0,0,0.40)] backdrop-blur-2xl xl:hidden">
          <div className="grid gap-1">
            {navbarRoutes.map((item) => (
              <div key={`${item.label}-${item.href}`}>
                <Link
                  className="block rounded-full px-4 py-3 text-sm font-semibold text-smart-white/84 transition hover:bg-white/8 hover:text-smart-white"
                  href={item.href}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
                {item.children && item.children.length > 0 ? (
                  <div className="ml-4 grid gap-1 border-l border-white/10 pl-4">
                    {item.children.map((child) => (
                      <Link
                        className="block rounded-full px-4 py-2.5 text-sm font-semibold text-smart-white/72 transition hover:bg-white/8 hover:text-smart-white"
                        href={child.href}
                        key={`${child.label}-${child.href}`}
                        onClick={() => setOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {showRegistrationCta ? (
              <Link
                className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-full border border-smart-gold-light/55 bg-[linear-gradient(180deg,#efd39b_0%,#d4aa68_100%)] px-4 text-sm font-extrabold text-smart-abyss shadow-[0_12px_30px_rgba(213,173,107,0.18),inset_0_1px_0_rgba(255,255,255,0.58)]"
                href="/#abonamente"
                onClick={() => setOpen(false)}
              >
                <GraduationCap aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
                Înscriere
              </Link>
            ) : null}
            <form
              className="mt-3 flex rounded-full border border-white/14 bg-white/8 p-1"
              onSubmit={submitSearch}
            >
              <label className="sr-only" htmlFor="navbar-mobile-search">
                Caută în site
              </label>
              <input
                className="min-w-0 flex-1 bg-transparent px-4 text-sm text-smart-white outline-none placeholder:text-smart-muted"
                id="navbar-mobile-search"
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Caută în site"
                type="search"
                value={searchValue}
              />
              <button
                aria-label="Caută"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-smart-aqua text-smart-abyss"
                type="submit"
              >
                <Search aria-hidden="true" className="size-4" />
              </button>
            </form>
            <div className={cn("mt-3 grid gap-2", accountSession ? "grid-cols-3" : "grid-cols-2")}>
              <Link
                className="rounded-full border border-white/12 bg-white/8 px-4 py-3 text-center text-sm font-semibold text-smart-white"
                href="/shop"
                onClick={() => setOpen(false)}
              >
                Shop
              </Link>
              <Link
                className="rounded-full border border-white/12 bg-white/8 px-4 py-3 text-center text-sm font-semibold text-smart-white"
                href="/cont"
                onClick={() => setOpen(false)}
              >
                {accountSession ? "Profil" : "Cont"}
              </Link>
              {accountSession ? (
                <form action={logoutAction}>
                  <button
                    className="h-full w-full rounded-full border border-white/12 bg-white/8 px-4 py-3 text-center text-sm font-semibold text-smart-white"
                    onClick={() => setOpen(false)}
                    type="submit"
                  >
                    Ieși
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
