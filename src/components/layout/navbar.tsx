"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HeartPulse, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

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
  "hidden size-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.055] text-smart-white/82 shadow-[0_10px_28px_rgba(3,17,28,0.18)] backdrop-blur-xl transition duration-300 hover:border-smart-aqua/40 hover:bg-white/[0.10] hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua sm:inline-flex";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [activeCategory, setActiveCategory] = useState<BlogCategorySlug>(defaultBlogCategory);
  const isBlog = pathname === "/blog" || pathname.startsWith("/blog/");
  const collected = useBlogNavCollection(isBlog, pathname);
  const compactBlogSearch = isBlog && collected && !searchOpen;

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 20);
    update();
    window.addEventListener("scroll", update, { passive: true });

    return () => window.removeEventListener("scroll", update);
  }, []);

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

  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-4 sm:pt-5" data-smart-header="true">
      <nav
        aria-label="Navigație principală"
        className={cn(
          "smart-container flex min-h-[74px] items-center justify-between gap-3 rounded-full border px-3 py-2 backdrop-blur-2xl transition-all duration-500 ease-out sm:px-4 lg:gap-4",
          scrolled || collected
            ? "border-white/14 bg-smart-dark/74 shadow-[0_20px_60px_rgba(3,17,28,0.34)]"
            : "border-white/10 bg-smart-dark/38 shadow-[0_12px_36px_rgba(3,17,28,0.22)]",
        )}
      >
        <Link
          aria-label="SmartMed Academy, mergi la pagina principală"
          className="group flex min-w-0 items-center gap-3 rounded-full text-smart-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua"
          href="/"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-smart-gold/42 bg-white/6 text-smart-gold-light transition group-hover:border-smart-aqua/50">
            <HeartPulse aria-hidden="true" className="size-6" strokeWidth={1.55} />
          </span>
          <span
            className={cn(
              "hidden overflow-hidden whitespace-nowrap leading-none transition-all duration-500 ease-out sm:block",
              isBlog && collected
                ? "max-w-0 -translate-x-2 opacity-0"
                : "max-w-[190px] translate-x-0 opacity-100",
            )}
          >
            <span className="block font-serif text-xl font-semibold uppercase tracking-[0.16em]">
              {siteConfig.name}
            </span>
            <span className="block font-serif text-sm uppercase tracking-[0.18em] text-smart-cream">
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
          <div className="hidden min-w-0 items-center justify-center gap-3 xl:flex 2xl:gap-5">
            {navbarRoutes.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative py-2 text-sm font-semibold text-smart-white/82 transition hover:text-smart-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua",
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

        <div className="flex shrink-0 items-center gap-2">
          <form
            className={cn(
              "hidden items-center overflow-hidden rounded-full border border-white/12 bg-white/[0.055] shadow-[0_10px_28px_rgba(3,17,28,0.18)] backdrop-blur-xl transition-all duration-500 ease-out lg:flex",
              compactBlogSearch ? "w-11 px-0" : "w-48 pl-4 pr-1 2xl:w-56",
              searchOpen && "w-52 pl-4 pr-1 2xl:w-60",
            )}
            onSubmit={submitSearch}
          >
            <label className="sr-only" htmlFor="navbar-search">
              Caută în blog
            </label>
            <input
              className={cn(
                "min-w-0 flex-1 bg-transparent text-sm text-smart-white outline-none transition-all duration-300 placeholder:text-smart-muted",
                compactBlogSearch && !searchOpen ? "w-0 opacity-0" : "w-auto opacity-100",
              )}
              id="navbar-search"
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={compactBlogSearch ? "" : "Caută în blog"}
              tabIndex={compactBlogSearch && !searchOpen ? -1 : undefined}
              type="search"
              value={searchValue}
            />
            <button
              aria-label="Caută în blog"
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-smart-white/82 transition hover:bg-white/10 hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua"
              onClick={() => {
                if (compactBlogSearch && !searchOpen) {
                  setSearchOpen(true);
                }
              }}
              type={compactBlogSearch && !searchOpen ? "button" : "submit"}
            >
              <Search aria-hidden="true" className="size-5" />
            </button>
          </form>
          <button
            aria-label="Deschide căutarea"
            className="inline-flex size-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.055] text-smart-white/82 transition hover:bg-white/10 hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua lg:hidden"
            onClick={() => {
              setSearchOpen(true);
              setOpen(true);
            }}
            type="button"
          >
            <Search aria-hidden="true" className="size-5" />
          </button>
          <Link aria-label="Mergi la shop" className={navActionClass} href="/shop">
            <ShoppingBag aria-hidden="true" className="size-5" />
          </Link>
          <Link aria-label="Mergi la contul tău" className={navActionClass} href="/cont">
            <UserRound aria-hidden="true" className="size-5" />
          </Link>
          <button
            aria-expanded={open}
            aria-label={open ? "Închide meniul" : "Deschide meniul"}
            className="inline-flex size-12 items-center justify-center rounded-full border border-white/16 bg-white/8 text-smart-white backdrop-blur-xl transition hover:bg-white/14 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua xl:hidden"
            onClick={() => setOpen((current) => !current)}
            type="button"
          >
            {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
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
