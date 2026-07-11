"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Search, ShoppingCart, UserRoundCheck, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { BlogSecondaryNav } from "@/components/blog/blog-secondary-nav";
import { useBlogNavCollection } from "@/components/blog/use-blog-nav-collection";
import { logoutAction } from "@/lib/auth/actions";
import type { SmartMedSession } from "@/lib/auth/session";
import { blogCategories, defaultBlogCategory, type BlogCategorySlug } from "@/lib/blog";
import { navbarRoutes } from "@/lib/routes";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

const navActionClass =
  "group/action relative hidden h-12 w-11 shrink-0 items-center justify-center text-smart-white/78 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua sm:inline-flex";

type ThemeMode = "dark" | "light";

function getInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = window.localStorage.getItem("smartmed-theme");

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const lastScrollYRef = useRef(0);
  const upwardScrollRef = useRef(0);
  const revealDelayRef = useRef<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<BlogCategorySlug>(defaultBlogCategory);
  const [accountSession, setAccountSession] = useState<SmartMedSession | null>(null);
  const isBlog = pathname === "/blog" || pathname.startsWith("/blog/");
  const collected = useBlogNavCollection(isBlog, pathname);
  const searchExpanded = searchOpen || searchValue.length > 0;
  const accountInitial = accountSession?.fullName.trim().charAt(0).toUpperCase() ?? "";

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 20);
    update();
    window.addEventListener("scroll", update, { passive: true });

    return () => window.removeEventListener("scroll", update);
  }, []);

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

        const payload = (await response.json()) as { session: SmartMedSession | null };

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

      if (open || searchExpanded || currentY < hideStartY) {
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
  }, [open, pathname, searchExpanded]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    window.localStorage.setItem("smartmed-theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (!isBlog) {
      return;
    }

    const updateCategory = () => {
      const params = new URLSearchParams(window.location.search);
      const category =
        blogCategories.find((item) => item.slug === params.get("categorie"))?.slug ??
        defaultBlogCategory;

      setActiveCategory(category);
    };

    updateCategory();
    window.addEventListener("popstate", updateCategory);

    return () => window.removeEventListener("popstate", updateCategory);
  }, [isBlog, pathname]);

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

  function toggleTheme() {
    setThemeMode((current) => {
      return current === "dark" ? "light" : "dark";
    });
  }

  return (
    <header
      className={cn(
        "smart-header-shell fixed inset-x-0 top-0 z-50 pt-4 will-change-transform sm:pt-5",
        navHidden && "smart-header-shell--hidden pointer-events-none",
      )}
      data-smart-header="true"
    >
      <nav
        aria-label="Navigație principală"
        className={cn(
          "smart-nav-container flex min-h-[74px] items-center justify-between gap-3 rounded-full border px-3 py-2 backdrop-blur-2xl transition-all duration-500 ease-out sm:px-4 xl:gap-5",
          scrolled || collected
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
            className="size-[65px] shrink-0 object-contain"
            height={65}
            src="/assets/brand/smartmed-logo-mark.svg"
            width={65}
          />
          <span
            className={cn(
              "hidden -ml-2.5 overflow-hidden whitespace-nowrap text-center leading-none transition-all duration-500 ease-out sm:block",
              isBlog && collected
                ? "max-w-0 -translate-x-2 opacity-0"
                : "max-w-[170px] translate-x-0 opacity-100 2xl:max-w-[190px]",
            )}
          >
            <span className="block font-serif text-xl font-semibold uppercase tracking-[0.16em]">
              {siteConfig.name}
            </span>
            <span className="-mt-[5px] block font-serif text-sm uppercase tracking-[0.18em] text-smart-cream">
              Academy
            </span>
          </span>
        </Link>

        {isBlog ? (
          <BlogSecondaryNav
            activeCategory={activeCategory}
            disabled={!collected}
            mode="collected"
            visible={collected}
          />
        ) : (
          <div className="hidden min-w-0 items-center justify-center gap-1 xl:flex 2xl:gap-2">
            {navbarRoutes.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative whitespace-nowrap px-1.5 py-3 text-[13px] font-semibold text-smart-white/82 transition hover:text-smart-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua 2xl:px-2.5 2xl:text-sm",
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
        )}

        <div className="flex shrink-0 items-center gap-3">
          <button
            aria-label={themeMode === "dark" ? "Comută la modul luminos" : "Comută la modul întunecat"}
            aria-pressed={themeMode === "light"}
            className={cn(
              "theme-infinity-toggle hidden lg:inline-flex",
              themeMode === "light" && "theme-infinity-toggle--light",
            )}
            onClick={toggleTheme}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="theme-infinity-toggle__track"
              fill="none"
              viewBox="0 0 96 48"
            >
              <defs>
                <linearGradient gradientUnits="userSpaceOnUse" id="theme-infinity-taper-soft" x1="12" x2="84" y1="24" y2="24">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                  <stop offset="18%" stopColor="currentColor" stopOpacity="1" />
                  <stop offset="36%" stopColor="currentColor" stopOpacity="0.34" />
                  <stop offset="50%" stopColor="currentColor" stopOpacity="0" />
                  <stop offset="64%" stopColor="currentColor" stopOpacity="0.34" />
                  <stop offset="82%" stopColor="currentColor" stopOpacity="1" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
                </linearGradient>
                <linearGradient gradientUnits="userSpaceOnUse" id="theme-infinity-taper-mid" x1="12" x2="84" y1="24" y2="24">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                  <stop offset="20%" stopColor="currentColor" stopOpacity="1" />
                  <stop offset="33%" stopColor="currentColor" stopOpacity="0.42" />
                  <stop offset="46%" stopColor="currentColor" stopOpacity="0" />
                  <stop offset="54%" stopColor="currentColor" stopOpacity="0" />
                  <stop offset="67%" stopColor="currentColor" stopOpacity="0.42" />
                  <stop offset="80%" stopColor="currentColor" stopOpacity="1" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
                </linearGradient>
                <linearGradient gradientUnits="userSpaceOnUse" id="theme-infinity-taper-core" x1="12" x2="84" y1="24" y2="24">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                  <stop offset="17%" stopColor="currentColor" stopOpacity="1" />
                  <stop offset="28%" stopColor="currentColor" stopOpacity="0.72" />
                  <stop offset="40%" stopColor="currentColor" stopOpacity="0" />
                  <stop offset="60%" stopColor="currentColor" stopOpacity="0" />
                  <stop offset="72%" stopColor="currentColor" stopOpacity="0.72" />
                  <stop offset="83%" stopColor="currentColor" stopOpacity="1" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
                </linearGradient>
              </defs>
              <path
                className="theme-infinity-toggle__track-base"
                d="M84 24C84 12.48 66.85 12.48 48 24C29.15 35.52 12 35.52 12 24C12 12.48 29.15 12.48 48 24C66.85 35.52 84 35.52 84 24Z"
                pathLength="1"
                vectorEffect="non-scaling-stroke"
              />
              <path
                className="theme-infinity-toggle__track-loop-soft"
                d="M84 24C84 12.48 66.85 12.48 48 24C29.15 35.52 12 35.52 12 24C12 12.48 29.15 12.48 48 24C66.85 35.52 84 35.52 84 24Z"
                stroke="url(#theme-infinity-taper-soft)"
                vectorEffect="non-scaling-stroke"
              />
              <path
                className="theme-infinity-toggle__track-loop-mid"
                d="M84 24C84 12.48 66.85 12.48 48 24C29.15 35.52 12 35.52 12 24C12 12.48 29.15 12.48 48 24C66.85 35.52 84 35.52 84 24Z"
                stroke="url(#theme-infinity-taper-mid)"
                vectorEffect="non-scaling-stroke"
              />
              <path
                className="theme-infinity-toggle__track-loop-core"
                d="M84 24C84 12.48 66.85 12.48 48 24C29.15 35.52 12 35.52 12 24C12 12.48 29.15 12.48 48 24C66.85 35.52 84 35.52 84 24Z"
                stroke="url(#theme-infinity-taper-core)"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <span aria-hidden="true" className="theme-infinity-toggle__orb theme-infinity-toggle__sun">
              <svg className="theme-infinity-toggle__sun-mark" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" fill="currentColor" r="5.05" />
                <path
                  d="M12 2.2V4.7M18.9 5.1L17.1 6.9M21.8 12H19.3M18.9 18.9L17.1 17.1M12 21.8V19.3M5.1 18.9L6.9 17.1M2.2 12H4.7M5.1 5.1L6.9 6.9"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.86"
                />
              </svg>
            </span>
            <span aria-hidden="true" className="theme-infinity-toggle__orb theme-infinity-toggle__moon">
              <svg className="theme-infinity-toggle__moon-mark" viewBox="0 0 24 24">
                <path
                  d="M18.55 16.95C16.85 19.05 13.9 20.1 11.1 19.2C7.15 17.95 4.95 13.75 6.2 9.8C7.1 6.98 9.55 5.04 12.3 4.67C10.96 6.39 10.47 8.72 11.19 10.98C11.94 13.36 13.86 15.13 16.18 15.72C16.98 15.92 17.78 15.99 18.55 16.95Z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </button>
          <form
            className={cn(
              "group/search hidden h-11 items-center overflow-hidden rounded-full transition-all duration-500 ease-out lg:flex",
              searchExpanded
                ? "w-52 border border-white/10 bg-white/[0.045] pl-4 pr-1 focus-within:border-smart-aqua/45 focus-within:bg-white/[0.08] focus-within:shadow-[0_12px_30px_rgba(156,206,208,0.16)] 2xl:w-60"
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
              <Link
                className="rounded-full px-4 py-3 text-sm font-semibold text-smart-white/84 transition hover:bg-white/8 hover:text-smart-white"
                href={item.href}
                key={`${item.label}-${item.href}`}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {isBlog ? (
              <div className="mt-3 rounded-[24px] border border-white/10 bg-white/[0.045] p-2">
                <BlogSecondaryNav activeCategory={activeCategory} mode="mobile" />
              </div>
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
