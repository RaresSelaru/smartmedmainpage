"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, ShoppingCart, UserRoundCheck, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { BlogSecondaryNav } from "@/components/blog/blog-secondary-nav";
import { useBlogNavCollection } from "@/components/blog/use-blog-nav-collection";
import { blogCategories, defaultBlogCategory, type BlogCategorySlug } from "@/lib/blog";
import { navbarRoutes } from "@/lib/routes";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

const navActionClass =
  "group/action relative hidden h-11 w-10 shrink-0 items-center justify-center text-smart-white/78 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua sm:inline-flex";

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] = useState<BlogCategorySlug>(defaultBlogCategory);
  const isBlog = pathname === "/blog" || pathname.startsWith("/blog/");
  const collected = useBlogNavCollection(isBlog, pathname);
  const searchExpanded = searchOpen || searchValue.length > 0;

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 20);
    update();
    window.addEventListener("scroll", update, { passive: true });

    return () => window.removeEventListener("scroll", update);
  }, []);

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

    // TODO: Replace this with global search when the site-wide search index exists.
    if (!query) {
      router.push("/blog#articole");
      return;
    }

    router.push(`/blog?cautare=${encodeURIComponent(query)}#articole`);
    setSearchOpen(false);
    setOpen(false);
  }

  function toggleTheme() {
    setThemeMode((current) => {
      return current === "dark" ? "light" : "dark";
    });
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-4 sm:pt-5" data-smart-header="true">
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
              <path
                className="theme-infinity-toggle__track-base"
                d="M12 24C18.8 8.5 35.6 8.5 48 24C60.4 39.5 77.2 39.5 84 24C77.2 8.5 60.4 8.5 48 24C35.6 39.5 18.8 39.5 12 24Z"
                pathLength="1"
              />
              <path
                className="theme-infinity-toggle__track-weight"
                d="M12 24C18.8 8.5 35.6 8.5 48 24C60.4 39.5 77.2 39.5 84 24C77.2 8.5 60.4 8.5 48 24C35.6 39.5 18.8 39.5 12 24Z"
              />
            </svg>
            <span aria-hidden="true" className="theme-infinity-toggle__orb theme-infinity-toggle__sun">
              <svg className="theme-infinity-toggle__sun-mark" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" fill="currentColor" r="4.7" />
                <path
                  d="M12 2.2V4.7M18.9 5.1L17.1 6.9M21.8 12H19.3M18.9 18.9L17.1 17.1M12 21.8V19.3M5.1 18.9L6.9 17.1M2.2 12H4.7M5.1 5.1L6.9 6.9"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.55"
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
              "group/search hidden h-10 items-center overflow-hidden rounded-full transition-all duration-500 ease-out lg:flex",
              searchExpanded
                ? "w-52 border border-white/10 bg-white/[0.045] pl-4 pr-1 focus-within:border-smart-aqua/45 focus-within:bg-white/[0.08] focus-within:shadow-[0_12px_30px_rgba(156,206,208,0.16)] 2xl:w-60"
                : "w-10 border border-transparent bg-transparent px-0",
            )}
            onSubmit={submitSearch}
          >
            <label className="sr-only" htmlFor="navbar-search">
              Caută în blog
            </label>
            <input
              className={cn(
                "min-w-0 flex-1 bg-transparent text-sm text-smart-white outline-none transition-all duration-300 placeholder:text-smart-muted/80",
                searchExpanded ? "w-auto opacity-100" : "pointer-events-none w-0 opacity-0",
              )}
              id="navbar-search"
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Caută în blog"
              ref={desktopSearchInputRef}
              tabIndex={searchExpanded ? undefined : -1}
              type="search"
              value={searchValue}
            />
            <button
              aria-label="Caută în blog"
              className="flex size-10 shrink-0 items-center justify-center text-smart-white/78 transition duration-300 hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua"
              onClick={() => {
                if (!searchExpanded) {
                  setSearchOpen(true);
                }
              }}
              type={searchExpanded ? "submit" : "button"}
            >
              <Search aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
            </button>
          </form>
          <button
            aria-label="Deschide căutarea"
            className="inline-flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-smart-white/78 transition duration-300 hover:-translate-y-0.5 hover:border-smart-aqua/45 hover:bg-white/[0.08] hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua lg:hidden"
            onClick={() => {
              setSearchOpen(true);
              setOpen(true);
            }}
            type="button"
          >
            <Search aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
          </button>
          <Link aria-label="Mergi la shop" className={navActionClass} href="/shop">
            <ShoppingCart aria-hidden="true" className="size-[21px]" strokeWidth={1.75} />
          </Link>
          <Link aria-label="Mergi la contul tău" className={navActionClass} href="/cont">
            <UserRoundCheck aria-hidden="true" className="size-[22px]" strokeWidth={1.7} />
          </Link>
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
                Caută în blog
              </label>
              <input
                className="min-w-0 flex-1 bg-transparent px-4 text-sm text-smart-white outline-none placeholder:text-smart-muted"
                id="navbar-mobile-search"
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Caută în blog"
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
            <div className="mt-3 grid grid-cols-2 gap-2">
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
                Cont
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
