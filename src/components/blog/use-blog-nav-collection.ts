"use client";

import { useEffect, useState } from "react";

const SENTINEL_ID = "blog-secondary-nav-sentinel";
const HEADER_SELECTOR = "[data-smart-header='true']";

export function useBlogNavCollection(enabled = true, resetKey?: string) {
  const [collected, setCollected] = useState(false);

  useEffect(() => {
    const resetFrame = window.requestAnimationFrame(() => setCollected(false));

    return () => window.cancelAnimationFrame(resetFrame);
  }, [enabled, resetKey]);

  useEffect(() => {
    if (!enabled) {
      const resetFrame = window.requestAnimationFrame(() => setCollected(false));

      return () => window.cancelAnimationFrame(resetFrame);
    }

    const sentinel = document.getElementById(SENTINEL_ID);

    if (!sentinel) {
      const resetFrame = window.requestAnimationFrame(() => setCollected(false));

      return () => window.cancelAnimationFrame(resetFrame);
    }

    let headerHeight = 96;
    let frame = 0;

    const readHeaderHeight = () => {
      const header = document.querySelector<HTMLElement>(HEADER_SELECTOR);
      headerHeight = header?.getBoundingClientRect().height ?? 96;
      document.documentElement.style.setProperty(
        "--smart-header-height",
        `${Math.ceil(headerHeight)}px`,
      );
    };

    const update = () => {
      frame = 0;
      readHeaderHeight();
      const top = sentinel.getBoundingClientRect().top;
      setCollected(top <= headerHeight + 12);
    };

    const requestUpdate = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(update);
    };

    readHeaderHeight();

    const header = document.querySelector<HTMLElement>(HEADER_SELECTOR);
    const resizeObserver =
      "ResizeObserver" in window
        ? new ResizeObserver(() => requestUpdate())
        : undefined;

    if (header && resizeObserver) {
      resizeObserver.observe(header);
    }

    const intersectionObserver =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            () => requestUpdate(),
            {
              root: null,
              rootMargin: `-${Math.ceil(headerHeight)}px 0px 0px 0px`,
              threshold: [0, 1],
            },
          )
        : undefined;

    if (intersectionObserver) {
      intersectionObserver.observe(sentinel);
    }

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [enabled, resetKey]);

  return collected;
}
