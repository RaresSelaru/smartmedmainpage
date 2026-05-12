"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";

import {
  blogCategories,
  blogSecondaryNavItems,
  type BlogCategorySlug,
  type BlogNavItem,
} from "@/lib/blog";
import { cn } from "@/lib/utils";

type BlogSecondaryNavProps = {
  activeCategory?: BlogCategorySlug;
  className?: string;
  disabled?: boolean;
  mode?: "standalone" | "collected" | "mobile";
  visible?: boolean;
};

function itemHref(item: BlogNavItem) {
  return item.isBlog ? "/blog#articole" : item.href;
}

const linkBaseClass =
  "group/navlink relative inline-flex shrink-0 items-center justify-center rounded-full font-bold uppercase tracking-[0.13em] transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua";

const standaloneLinkClass =
  "h-10 px-3 text-[11px] text-smart-white/74 hover:bg-white/[0.055] hover:text-smart-white sm:px-4";

const collectedLinkClass =
  "h-8 px-2.5 text-[9px] text-smart-white/72 hover:bg-white/[0.055] hover:text-smart-white 2xl:h-9 2xl:px-3 2xl:text-[10px]";

const activeLineClass =
  "after:absolute after:inset-x-3 after:-bottom-1 after:h-px after:origin-center after:scale-x-0 after:bg-gradient-to-r after:from-transparent after:via-smart-gold-light/85 after:to-transparent after:transition-transform after:duration-300 hover:after:scale-x-100";

export function BlogSecondaryNav({
  activeCategory,
  className,
  disabled = false,
  mode = "standalone",
  visible = true,
}: BlogSecondaryNavProps) {
  const reduceMotion = useReducedMotion();
  const collected = mode === "collected";
  const mobile = mode === "mobile";

  return (
    <motion.nav
      aria-hidden={disabled}
      aria-label={collected ? "Navigație Blog colectată" : "Navigație secundară Blog"}
      animate={{
        opacity: visible ? 1 : 0,
        y: visible ? 0 : collected ? -8 : -10,
        scale: visible ? 1 : collected ? 0.985 : 1,
      }}
      className={cn(
        disabled && "pointer-events-none",
        collected
          ? "hidden min-w-0 flex-1 items-center justify-center xl:flex"
          : "relative block",
        className,
      )}
      initial={false}
      transition={{
        duration: reduceMotion ? 0.01 : collected ? 0.32 : 0.42,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div
        className={cn(
          "no-scrollbar flex min-w-0 items-center overflow-x-auto",
          collected
            ? "max-w-full justify-center gap-0.5 overflow-visible 2xl:gap-1.5"
            : "gap-1.5 px-1 py-1.5 sm:gap-2 lg:flex-wrap lg:justify-center lg:overflow-visible",
          mobile && "grid grid-cols-1 gap-1 overflow-visible px-0 py-0",
        )}
      >
        {blogSecondaryNavItems.map((item) =>
          item.isBlog ? (
            <BlogCategoryDropdown
              activeCategory={activeCategory}
              disabled={disabled || !visible}
              key={item.label}
              linkClass={cn(
                linkBaseClass,
                activeLineClass,
                collected ? collectedLinkClass : standaloneLinkClass,
                mobile && "h-auto justify-between px-4 py-3 text-sm normal-case tracking-normal",
                "text-smart-white after:scale-x-100",
              )}
            />
          ) : (
            <Link
              className={cn(
                linkBaseClass,
                activeLineClass,
                collected ? collectedLinkClass : standaloneLinkClass,
                mobile && "h-auto justify-start px-4 py-3 text-sm normal-case tracking-normal",
              )}
              href={itemHref(item)}
              key={item.label}
              tabIndex={disabled || !visible ? -1 : undefined}
            >
              {item.label}
            </Link>
          ),
        )}
      </div>
    </motion.nav>
  );
}

function BlogCategoryDropdown({
  activeCategory,
  disabled,
  linkClass,
}: {
  activeCategory?: BlogCategorySlug;
  disabled?: boolean;
  linkClass: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);

  return (
    <div
      className="relative shrink-0"
      onBlur={(event) => {
        if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) {
          close();
        }
      }}
      onMouseEnter={() => !disabled && setOpen(true)}
      onMouseLeave={close}
      ref={wrapperRef}
    >
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(linkClass, "gap-1.5")}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onFocus={() => !disabled && setOpen(true)}
        tabIndex={disabled ? -1 : undefined}
        type="button"
      >
        Blog
        <ChevronDown
          aria-hidden="true"
          className={cn("size-3.5 transition", open && "rotate-180")}
          strokeWidth={1.8}
        />
      </button>
      <div
        className={cn(
          "absolute left-1/2 top-[calc(100%+0.55rem)] z-50 w-56 -translate-x-1/2 overflow-hidden rounded-[20px] border border-white/14 bg-smart-abyss/94 p-2 text-smart-white shadow-[0_24px_70px_rgba(0,0,0,0.36)] backdrop-blur-2xl transition duration-200",
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
        role="menu"
      >
        <div className="grid max-h-[min(72vh,430px)] gap-1 overflow-y-auto pr-1">
          {blogCategories.map((category) => (
            <Link
              aria-current={activeCategory === category.slug ? "page" : undefined}
              className={cn(
                "rounded-2xl px-3 py-2 text-sm font-semibold text-smart-white/76 transition hover:bg-white/9 hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-smart-aqua",
                activeCategory === category.slug && "bg-smart-aqua/12 text-smart-aqua",
              )}
              href={`/blog?categorie=${category.slug}#articole`}
              key={category.slug}
              onClick={close}
              role="menuitem"
              tabIndex={disabled || !open ? -1 : undefined}
            >
              {category.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
