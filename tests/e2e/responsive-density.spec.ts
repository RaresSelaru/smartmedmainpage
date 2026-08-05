import { expect, test, type Page } from "@playwright/test";

const homeViewports = [
  { label: "compact desktop", width: 1366, height: 768 },
  { label: "standard desktop", width: 1440, height: 900 },
  { label: "large laptop", width: 1512, height: 982 },
  { label: "wide-brand breakpoint", width: 1536, height: 900 },
  { label: "full HD", width: 1920, height: 1080 },
  { label: "QHD", width: 2560, height: 1440 },
  { label: "ultrawide", width: 3440, height: 1440 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "mobile", width: 390, height: 844 },
] as const;

const atlasViewports = homeViewports;

const atlasChapterTitles = [
  "Baze solide",
  "Înțelegerea conceptelor, nu memorarea lor",
  "Legături inteligente",
  "Strategii de succes",
  "De ce fac diferența modulele speciale SmartMed?",
] as const;

const atlasChapterPoints = [0.03, 0.25, 0.5, 0.75, 0.97] as const;

async function waitForFonts(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

async function waitForLayout(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => resolve());
        });
      }),
  );
}

async function measurePageWidth(page: Page) {
  return page.evaluate(() => {
    const documentElement = document.documentElement;

    return {
      pageWidth: Math.max(documentElement.scrollWidth, document.body.scrollWidth),
      viewportWidth: documentElement.clientWidth,
    };
  });
}

async function scrollToStoryProgress(
  page: Page,
  geometry: { start: number; travel: number },
  progress: number,
) {
  await page.evaluate(
    ({ nextProgress, start, travel }) => {
      const currentProgress = (window.scrollY - start) / travel;

      window.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: nextProgress >= currentProgress ? 1 : -1,
        }),
      );
      window.scrollTo({
        behavior: "instant",
        top: start + travel * nextProgress,
      });
    },
    { ...geometry, nextProgress: progress },
  );
}

async function expectScrollSettledAt(page: Page, targetY: number) {
  let previousY: number | undefined;
  let consecutiveStableSamples = 0;

  await expect
    .poll(
      async () => {
        const currentY = await page.evaluate(() => window.scrollY);
        const nearTarget = Math.abs(currentY - targetY) <= 5;
        const stopped =
          previousY !== undefined && Math.abs(currentY - previousY) <= 0.75;

        consecutiveStableSamples = nearTarget && stopped ? consecutiveStableSamples + 1 : 0;
        previousY = currentY;

        return consecutiveStableSamples;
      },
      {
        intervals: [60, 80, 100, 120],
        timeout: 8_000,
      },
    )
    .toBeGreaterThanOrEqual(3);
}

for (const viewport of homeViewports) {
  test(`the public homepage stays bounded at ${viewport.label} (${viewport.width}x${viewport.height})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const response = await page.goto("/");
    expect(response?.ok(), `${viewport.label}: successful homepage response`).toBe(true);

    const main = page.locator("main");
    const header = page.locator("[data-smart-header='true']");
    const nav = header.getByRole("navigation", { name: "Navigație principală" });
    const hero = page.locator("[data-home-hero='true']");
    const heroHeading = hero.locator("h1");
    const heroHighlight = heroHeading.locator("span").first();
    const brandWordmark = header.locator("[data-smart-brand-wordmark='true']");
    const academicArtwork = page.locator("[data-academic-creation-artwork='true']");

    await expect(main, `${viewport.label}: main content`).toBeVisible();
    await expect(header, `${viewport.label}: public header`).toBeVisible();
    await expect(nav, `${viewport.label}: primary navigation`).toBeVisible();
    await expect(hero, `${viewport.label}: homepage hero`).toBeVisible();
    await expect(heroHeading, `${viewport.label}: hero heading`).toBeVisible();
    await expect(heroHighlight, `${viewport.label}: hero highlight`).toBeVisible();
    await expect(academicArtwork, `${viewport.label}: academic artwork`).toBeAttached();

    if (viewport.width >= 1536 || (viewport.width >= 640 && viewport.width < 1280)) {
      await expect(brandWordmark, `${viewport.label}: complete SmartMed brand`).toBeVisible();
    } else {
      await expect(brandWordmark, `${viewport.label}: compact SmartMed brand`).toBeHidden();
    }

    await waitForFonts(page);

    const geometry = await page.evaluate(() => {
      const documentElement = document.documentElement;
      const headerElement = document.querySelector<HTMLElement>(
        "[data-smart-header='true']",
      );
      const navElement = headerElement?.querySelector<HTMLElement>("nav");
      const heroElement = document.querySelector<HTMLElement>(
        "[data-home-hero='true']",
      );
      const heroHeadingElement = heroElement?.querySelector<HTMLElement>("h1");
      const heroHighlightElement = heroHeadingElement?.querySelector<HTMLElement>("span");
      const mainElement = document.querySelector<HTMLElement>("main");
      const globalElements = [documentElement, document.body, mainElement].filter(
        (element): element is HTMLElement => element !== null,
      );

      return {
        documentWidth: Math.max(
          documentElement.scrollWidth,
          document.body.scrollWidth,
        ),
        globalScale: globalElements.map((element) => getComputedStyle(element).scale),
        globalTransform: globalElements.map(
          (element) => getComputedStyle(element).transform,
        ),
        globalZoom: globalElements.map((element) => getComputedStyle(element).zoom),
        headerHeight: headerElement?.getBoundingClientRect().height ?? 0,
        heroHeadingSize: heroHeadingElement
          ? Number.parseFloat(getComputedStyle(heroHeadingElement).fontSize)
          : 0,
        heroHeight: heroElement?.getBoundingClientRect().height ?? 0,
        heroHighlightSize: heroHighlightElement
          ? Number.parseFloat(getComputedStyle(heroHighlightElement).fontSize)
          : 0,
        navHeight: navElement?.getBoundingClientRect().height ?? 0,
        navWidth: navElement?.getBoundingClientRect().width ?? 0,
        rootFontSize: Number.parseFloat(getComputedStyle(documentElement).fontSize),
        viewportScale: window.visualViewport?.scale ?? 1,
        viewportWidth: documentElement.clientWidth,
      };
    });

    expect.soft(
      geometry.documentWidth,
      `${viewport.label}: initial horizontal overflow`,
    ).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect.soft(geometry.viewportScale, `${viewport.label}: browser viewport scale`).toBe(1);
    expect.soft(geometry.rootFontSize, `${viewport.label}: root font-size scaling`).toBeCloseTo(
      16,
      2,
    );
    expect.soft(geometry.globalZoom, `${viewport.label}: global CSS zoom`).toEqual([
      "1",
      "1",
      "1",
    ]);
    expect.soft(geometry.globalTransform, `${viewport.label}: global transform`).toEqual([
      "none",
      "none",
      "none",
    ]);
    expect.soft(geometry.globalScale, `${viewport.label}: global scale property`).toEqual([
      "none",
      "none",
      "none",
    ]);
    expect.soft(geometry.headerHeight, `${viewport.label}: fixed header lower bound`).toBeGreaterThanOrEqual(
      90,
    );
    expect.soft(geometry.headerHeight, `${viewport.label}: fixed header upper bound`).toBeLessThanOrEqual(
      104,
    );

    const navHorizontalInset = viewport.width >= 1024 ? 64 : viewport.width >= 640 ? 48 : 32;
    const expectedNavWidth = Math.min(viewport.width - navHorizontalInset, 1480);

    expect.soft(geometry.navWidth, `${viewport.label}: navigation width lower bound`).toBeGreaterThanOrEqual(
      expectedNavWidth - 1,
    );
    expect.soft(geometry.navWidth, `${viewport.label}: navigation width upper bound`).toBeLessThanOrEqual(
      expectedNavWidth + 1,
    );

    if (viewport.width >= 1024) {
      const heroHeightRange = [860, 890];

      expect.soft(geometry.heroHeight, `${viewport.label}: desktop hero lower bound`).toBeGreaterThanOrEqual(
        heroHeightRange[0],
      );
      expect.soft(geometry.heroHeight, `${viewport.label}: desktop hero upper bound`).toBeLessThanOrEqual(
        heroHeightRange[1],
      );
      expect.soft(geometry.heroHeadingSize, `${viewport.label}: desktop hero heading lower bound`).toBeGreaterThanOrEqual(
        56,
      );
      expect.soft(geometry.heroHeadingSize, `${viewport.label}: desktop hero heading upper bound`).toBeLessThanOrEqual(
        60,
      );
      expect.soft(geometry.heroHighlightSize, `${viewport.label}: desktop hero highlight lower bound`).toBeGreaterThanOrEqual(
        112,
      );
      expect.soft(geometry.heroHighlightSize, `${viewport.label}: desktop hero highlight upper bound`).toBeLessThanOrEqual(
        118,
      );
      expect.soft(geometry.navHeight, `${viewport.label}: desktop navigation lower bound`).toBeGreaterThanOrEqual(
        76,
      );
      expect.soft(geometry.navHeight, `${viewport.label}: desktop navigation upper bound`).toBeLessThanOrEqual(
        80,
      );
    } else {
      const headingRange = viewport.width >= 640 ? [48, 52] : [34, 38];
      const highlightRange = viewport.width >= 640 ? [84, 88] : [58, 62];

      expect.soft(geometry.heroHeight, `${viewport.label}: small-screen hero lower bound`).toBeGreaterThanOrEqual(
        930,
      );
      expect.soft(geometry.heroHeight, `${viewport.label}: small-screen hero upper bound`).toBeLessThanOrEqual(
        980,
      );
      expect.soft(geometry.heroHeadingSize, `${viewport.label}: small-screen heading lower bound`).toBeGreaterThanOrEqual(
        headingRange[0],
      );
      expect.soft(geometry.heroHeadingSize, `${viewport.label}: small-screen heading upper bound`).toBeLessThanOrEqual(
        headingRange[1],
      );
      expect.soft(geometry.heroHighlightSize, `${viewport.label}: small-screen highlight lower bound`).toBeGreaterThanOrEqual(
        highlightRange[0],
      );
      expect.soft(geometry.heroHighlightSize, `${viewport.label}: small-screen highlight upper bound`).toBeLessThanOrEqual(
        highlightRange[1],
      );
      expect.soft(geometry.navHeight, `${viewport.label}: small-screen navigation lower bound`).toBeGreaterThanOrEqual(
        80,
      );
      expect.soft(geometry.navHeight, `${viewport.label}: small-screen navigation upper bound`).toBeLessThanOrEqual(
        86,
      );
    }

    const sections = page.locator("main > section");
    const sectionCount = await sections.count();
    expect(sectionCount, `${viewport.label}: complete homepage section sequence`).toBeGreaterThanOrEqual(
      9,
    );

    let maxPageWidth = geometry.documentWidth;
    let measuredViewportWidth = geometry.viewportWidth;

    for (let index = 0; index < sectionCount; index += 1) {
      await sections.nth(index).scrollIntoViewIfNeeded();
      await waitForLayout(page);

      const widthSample = await measurePageWidth(page);
      maxPageWidth = Math.max(maxPageWidth, widthSample.pageWidth);
      measuredViewportWidth = widthSample.viewportWidth;
    }

    await academicArtwork.scrollIntoViewIfNeeded();
    await waitForLayout(page);

    const artworkGeometry = await academicArtwork.evaluate((artworkElement) => {
      const artworkRect = artworkElement.getBoundingClientRect();
      const imageRect = artworkElement.querySelector("img")?.getBoundingClientRect();

      return {
        artworkCenter: artworkRect.left + artworkRect.width / 2,
        artworkLeft: artworkRect.left,
        artworkRight: artworkRect.right,
        imageAspectRatio: imageRect ? imageRect.width / imageRect.height : 0,
        imageLeft: imageRect?.left ?? 0,
        imageRight: imageRect?.right ?? 0,
        viewportWidth: document.documentElement.clientWidth,
      };
    });

    expect.soft(artworkGeometry.artworkLeft, `${viewport.label}: artwork left edge`).toBeCloseTo(
      0,
      0,
    );
    expect.soft(artworkGeometry.artworkRight, `${viewport.label}: artwork right edge`).toBeCloseTo(
      artworkGeometry.viewportWidth,
      0,
    );
    expect.soft(artworkGeometry.artworkCenter, `${viewport.label}: artwork fixed center`).toBeCloseTo(
      artworkGeometry.viewportWidth / 2,
      0,
    );
    expect.soft(artworkGeometry.imageLeft, `${viewport.label}: image left edge`).toBeCloseTo(
      0,
      0,
    );
    expect.soft(artworkGeometry.imageRight, `${viewport.label}: image right edge`).toBeCloseTo(
      artworkGeometry.viewportWidth,
      0,
    );
    expect.soft(artworkGeometry.imageAspectRatio, `${viewport.label}: artwork aspect ratio`).toBeCloseTo(
      1425 / 735,
      2,
    );

    expect.soft(maxPageWidth, `${viewport.label}: full-scroll horizontal overflow`).toBeLessThanOrEqual(
      measuredViewportWidth + 1,
    );
  });
}

for (const viewport of atlasViewports) {
  test(`the parchment story stays centered and bounded at ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.emulateMedia({ reducedMotion: "no-preference" });

    const response = await page.goto("/module-speciale");
    expect(response?.ok(), `${viewport.label}: successful module-speciale response`).toBe(true);

    const story = page.locator("#atlas-modulelor-speciale");
    const stage = story.locator("[data-atlas-stage='true']");
    const chapters = story.locator("[data-atlas-slide]");
    const nav = page.locator("[data-smart-header='true'] nav");

    await expect(story).toBeVisible();
    await expect(stage).toBeVisible();
    await expect(chapters).toHaveCount(5);
    await expect(nav).toBeVisible();
    await expect(story.locator("i > b"), `${viewport.label}: no bottom progress rail`).toHaveCount(
      0,
    );
    await waitForFonts(page);
    await waitForLayout(page);

    const geometry = await story.evaluate((storyElement) => {
      const stageElement = storyElement.querySelector<HTMLElement>("[data-atlas-stage='true']");
      const trackElement = storyElement.querySelector<HTMLElement>("[data-atlas-track='true']");
      const slideElements = Array.from(
        storyElement.querySelectorAll<HTMLElement>("[data-atlas-slide]"),
      );
      const stageRect = stageElement?.getBoundingClientRect();
      const trackRect = trackElement?.getBoundingClientRect();

      return {
        axis: trackElement?.dataset.atlasAxis ?? "",
        lock: trackElement?.dataset.atlasLock ?? "",
        rootFontSize: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
        stageHeight: stageRect?.height ?? 0,
        stagePosition: stageElement ? getComputedStyle(stageElement).position : "",
        stageTop: stageRect?.top ?? 0,
        storyHeight: storyElement.getBoundingClientRect().height,
        trackTransform: trackElement ? getComputedStyle(trackElement).transform : "",
        trackWidth: trackRect?.width ?? 0,
        slides: slideElements.map((slide) => {
          const heading = slide.querySelector<HTMLElement>("[data-atlas-heading='true']");
          const label = slide.querySelector<HTMLElement>("[data-atlas-principle='true']");
          const number = slide.querySelector<HTMLElement>("[data-atlas-number='true']");
          const title = heading?.querySelector<HTMLElement>("h2");
          const parchment = slide.querySelector<HTMLElement>("[data-atlas-parchment='true']");
          const copy = slide.querySelector<HTMLElement>("[data-atlas-copy='true']");
          const panels = Array.from(
            slide.querySelectorAll<HTMLElement>("[data-atlas-panel]"),
          );
          const inner = slide.firstElementChild as HTMLElement | null;
          const headingRect = heading?.getBoundingClientRect();
          const labelRect = label?.getBoundingClientRect();
          const numberRect = number?.getBoundingClientRect();
          const titleRect = title?.getBoundingClientRect();
          const parchmentRect = parchment?.getBoundingClientRect();
          const copyRect = copy?.getBoundingClientRect();
          const panelRects = panels.map((panel) => panel.getBoundingClientRect());
          const panelArtwork = panels
            .map((panel) => panel.querySelector<HTMLElement>("img"))
            .filter((image): image is HTMLElement => Boolean(image));
          const copyStyle = copy ? getComputedStyle(copy) : null;
          const copyContentRects = copy
            ? Array.from(copy.children, (child) => child.getBoundingClientRect())
            : [];
          const copyContentBounds = copyContentRects.length
            ? {
                bottom: Math.max(...copyContentRects.map((rect) => rect.bottom)),
                left: Math.min(...copyContentRects.map((rect) => rect.left)),
                right: Math.max(...copyContentRects.map((rect) => rect.right)),
                top: Math.min(...copyContentRects.map((rect) => rect.top)),
              }
            : null;

          return {
            ariaLabelledby: slide.getAttribute("aria-labelledby") ?? "",
            copyContentBounds,
            copyDensity: copy?.dataset.atlasCopyDensity ?? "",
            copyFontSize: copyStyle ? Number.parseFloat(copyStyle.fontSize) : 0,
            copyLineHeight: copyStyle ? Number.parseFloat(copyStyle.lineHeight) : 0,
            copyPaddingLeft: copyStyle ? Number.parseFloat(copyStyle.paddingLeft) : 0,
            copyOverflowX: copy ? copy.scrollWidth - copy.clientWidth : 0,
            copyOverflowY: copy ? copy.scrollHeight - copy.clientHeight : 0,
            copyRect: copyRect
              ? {
                  bottom: copyRect.bottom,
                  left: copyRect.left,
                  right: copyRect.right,
                  top: copyRect.top,
                }
              : null,
            headingBottom: headingRect?.bottom ?? 0,
            innerWidth: inner?.getBoundingClientRect().width ?? 0,
            labelCenter: labelRect ? labelRect.left + labelRect.width / 2 : 0,
            labelTop: labelRect?.top ?? 0,
            numberRight: numberRect?.right ?? 0,
            numberTitleGap:
              numberRect && titleRect ? titleRect.left - numberRect.right : Number.POSITIVE_INFINITY,
            numberWidth: numberRect?.width ?? 0,
            numberVerticallyOverlapsTitle:
              Boolean(numberRect && titleRect) &&
              (numberRect?.top ?? 0) < (titleRect?.bottom ?? 0) &&
              (numberRect?.bottom ?? 0) > (titleRect?.top ?? 0),
            panelAspectRatios: panelRects.map((panel) => panel.height / panel.width),
            panelArtworkFits: panelArtwork.map((image) => getComputedStyle(image).objectFit),
            panelArtworkTransforms: panelArtwork.map(
              (image) => getComputedStyle(image).transform,
            ),
            panelCenters: panelRects.map((panel) => panel.left + panel.width / 2),
            panelCount: panels.length,
            panelWidths: panelRects.map((panel) => panel.width),
            parchmentCenter: parchmentRect
              ? parchmentRect.left + parchmentRect.width / 2
              : 0,
            parchmentRect: parchmentRect
              ? {
                  bottom: parchmentRect.bottom,
                  left: parchmentRect.left,
                  right: parchmentRect.right,
                  top: parchmentRect.top,
                }
              : null,
            parchmentTop: parchmentRect?.top ?? 0,
            slideWidth: slide.getBoundingClientRect().width,
            titleCenter: titleRect ? titleRect.left + titleRect.width / 2 : 0,
            titleId: title?.id ?? "",
            titleText: title?.textContent?.replace(/\s+/g, " ").trim() ?? "",
          };
        }),
      };
    });
    const navRestBottom = await nav.evaluate((navElement) => {
      const headerElement = navElement.closest<HTMLElement>("[data-smart-header='true']");
      const headerPaddingTop = headerElement
        ? Number.parseFloat(getComputedStyle(headerElement).paddingTop)
        : 0;

      return headerPaddingTop + (navElement as HTMLElement).offsetHeight;
    });
    const pageWidth = await measurePageWidth(page);

    expect.soft(geometry.stagePosition, `${viewport.label}: pinned stage`).toBe("sticky");
    expect.soft(geometry.stageHeight, `${viewport.label}: one-viewport stage`).toBeCloseTo(
      viewport.height,
      0,
    );
    expect.soft(geometry.storyHeight, `${viewport.label}: deliberate scroll runway`).toBeGreaterThanOrEqual(
      viewport.height * 6.9,
    );
    expect.soft(geometry.axis, `${viewport.label}: vertical story axis`).toBe("vertical");
    expect.soft(geometry.lock, `${viewport.label}: native scroll`).toBe("native");
    expect.soft(geometry.trackTransform, `${viewport.label}: no horizontal track transform`).toBe(
      "none",
    );
    expect.soft(geometry.trackWidth, `${viewport.label}: single-stage track`).toBeCloseTo(
      viewport.width,
      0,
    );
    expect(geometry.slides).toHaveLength(5);

    for (const [index, layout] of geometry.slides.entries()) {
      expect.soft(layout.panelCount, `${viewport.label} slide ${index + 1}: two panels`).toBe(2);
      expect.soft(layout.slideWidth, `${viewport.label} slide ${index + 1}: one stage wide`).toBeCloseTo(
        viewport.width,
        0,
      );
      expect.soft(layout.innerWidth, `${viewport.label} slide ${index + 1}: content exists`).toBeGreaterThan(
        0,
      );
      expect.soft(layout.innerWidth, `${viewport.label} slide ${index + 1}: wide content cap`).toBeLessThanOrEqual(
        1441,
      );
      expect.soft(layout.titleText, `${viewport.label} slide ${index + 1}: existing title`).toBe(
        atlasChapterTitles[index],
      );
      expect.soft(
        layout.ariaLabelledby,
        `${viewport.label} slide ${index + 1}: heading relationship`,
      ).toBe(layout.titleId);
      expect.soft(
        Math.abs(layout.labelCenter - layout.titleCenter),
        `${viewport.label} slide ${index + 1}: label and title share a center`,
      ).toBeLessThanOrEqual(2);
      if (index === 0) {
        expect.soft(
          layout.labelTop - geometry.stageTop,
          `${viewport.label}: principle label clears the resting navbar`,
        ).toBeGreaterThanOrEqual(navRestBottom + 4);
      }
      expect.soft(
        layout.numberRight,
        `${viewport.label} slide ${index + 1}: number precedes title`,
      ).toBeLessThan(layout.titleCenter);
      expect.soft(
        layout.numberTitleGap,
        `${viewport.label} slide ${index + 1}: fixed number/title gap`,
      ).toBeCloseTo(geometry.rootFontSize * 1.75, 0);
      expect.soft(
        layout.numberVerticallyOverlapsTitle,
        `${viewport.label} slide ${index + 1}: number aligns with title row`,
      ).toBe(true);
      expect.soft(
        layout.numberWidth / geometry.rootFontSize,
        `${viewport.label} slide ${index + 1}: prominent principle number`,
      ).toBeGreaterThanOrEqual(viewport.width < 640 ? 2.8 : 3.2);
      expect.soft(layout.headingBottom, `${viewport.label} slide ${index + 1}: title above parchment`).toBeLessThanOrEqual(
        layout.parchmentTop,
      );
      expect.soft(
        layout.parchmentTop - layout.headingBottom,
        `${viewport.label} slide ${index + 1}: title stays close to parchment`,
      ).toBeLessThanOrEqual(geometry.rootFontSize * 1.35);
      expect.soft(layout.panelCenters[0], `${viewport.label} slide ${index + 1}: left panel`).toBeLessThan(
        layout.parchmentCenter,
      );
      expect.soft(layout.panelCenters[1], `${viewport.label} slide ${index + 1}: right panel`).toBeGreaterThan(
        layout.parchmentCenter,
      );
      expect.soft(
        layout.panelAspectRatios[0],
        `${viewport.label} slide ${index + 1}: left panel stays portrait`,
      ).toBeCloseTo(2000 / 1080, 2);
      expect.soft(
        layout.panelAspectRatios[1],
        `${viewport.label} slide ${index + 1}: right panel stays portrait`,
      ).toBeCloseTo(2000 / 1080, 2);
      expect.soft(
        layout.panelArtworkFits,
        `${viewport.label} slide ${index + 1}: both panel artworks use contain`,
      ).toEqual(["contain", "contain"]);
      expect.soft(
        layout.panelArtworkTransforms,
        `${viewport.label} slide ${index + 1}: panel artworks are not rotated`,
      ).toEqual(["none", "none"]);
      expect.soft(
        layout.parchmentCenter,
        `${viewport.label} slide ${index + 1}: centered parchment`,
      ).toBeCloseTo(viewport.width / 2, 0);
      expect.soft(
        layout.copyRect,
        `${viewport.label} slide ${index + 1}: parchment copy box exists`,
      ).not.toBeNull();
      expect.soft(
        layout.parchmentRect,
        `${viewport.label} slide ${index + 1}: parchment exists`,
      ).not.toBeNull();

      if (layout.copyRect && layout.parchmentRect) {
        const minimumPanelRatio = viewport.width > 1120 ? 0.28 : 0.09;

        for (const [panelIndex, panelWidth] of layout.panelWidths.entries()) {
          expect.soft(
            panelWidth / (layout.parchmentRect.right - layout.parchmentRect.left),
            `${viewport.label} slide ${index + 1}: panel ${panelIndex + 1} has presence`,
          ).toBeGreaterThanOrEqual(minimumPanelRatio);
        }

        expect.soft(
          layout.copyPaddingLeft / (layout.copyRect.right - layout.copyRect.left),
          `${viewport.label} slide ${index + 1}: copy keeps a safe paper inset`,
        ).toBeGreaterThanOrEqual(0.124);

        for (const edge of ["top", "right", "bottom", "left"] as const) {
          expect.soft(
            Math.abs(layout.copyRect[edge] - layout.parchmentRect[edge]),
            `${viewport.label} slide ${index + 1}: copy ${edge} matches parchment`,
          ).toBeLessThanOrEqual(1);
        }

        if (layout.copyContentBounds) {
          expect.soft(
            layout.copyContentBounds.top,
            `${viewport.label} slide ${index + 1}: copy content top`,
          ).toBeGreaterThanOrEqual(layout.parchmentRect.top - 1);
          expect.soft(
            layout.copyContentBounds.right,
            `${viewport.label} slide ${index + 1}: copy content right`,
          ).toBeLessThanOrEqual(layout.parchmentRect.right + 1);
          expect.soft(
            layout.copyContentBounds.bottom,
            `${viewport.label} slide ${index + 1}: copy content bottom`,
          ).toBeLessThanOrEqual(layout.parchmentRect.bottom + 1);
          expect.soft(
            layout.copyContentBounds.left,
            `${viewport.label} slide ${index + 1}: copy content left`,
          ).toBeGreaterThanOrEqual(layout.parchmentRect.left - 1);
        }
      }

      const minimumCopyFontRem =
        index === 0
          ? viewport.width >= 1920
            ? 1.1
            : viewport.width >= 1440
              ? 1
              : viewport.width >= 768
                ? 0.88
                : 0.76
          : viewport.width >= 1920
            ? 1.2
            : viewport.width >= 1440
              ? 1.05
              : viewport.width >= 768
                ? 0.95
                : 0.82;

      expect.soft(
        layout.copyFontSize / geometry.rootFontSize,
        `${viewport.label} slide ${index + 1}: larger parchment font`,
      ).toBeGreaterThanOrEqual(minimumCopyFontRem - 0.01);
      expect.soft(
        layout.copyLineHeight / layout.copyFontSize,
        `${viewport.label} slide ${index + 1}: readable line height`,
      ).toBeGreaterThanOrEqual(1.09);
      expect.soft(
        layout.copyOverflowX,
        `${viewport.label} slide ${index + 1}: horizontal copy overflow`,
      ).toBeLessThanOrEqual(1);
      expect.soft(
        layout.copyOverflowY,
        `${viewport.label} slide ${index + 1}: vertical copy overflow`,
      ).toBeLessThanOrEqual(1);
    }

    if (viewport.width >= 1024) {
      const navGroups = await nav.evaluate((navElement) => {
        const [brand, menu, actions] = Array.from(navElement.children).map((element) =>
          element.getBoundingClientRect(),
        );

        return {
          actionsLeft: actions?.left ?? 0,
          brandRight: brand?.right ?? 0,
          menuLeft: menu?.left ?? 0,
          menuRight: menu?.right ?? 0,
        };
      });

      expect.soft(navGroups.brandRight, `${viewport.width}px: brand clears navigation`).toBeLessThanOrEqual(
        navGroups.menuLeft,
      );
      expect.soft(navGroups.menuRight, `${viewport.width}px: navigation clears actions`).toBeLessThanOrEqual(
        navGroups.actionsLeft,
      );
    }

    expect.soft(pageWidth.pageWidth, `${viewport.label}: atlas horizontal overflow`).toBeLessThanOrEqual(
      pageWidth.viewportWidth + 1,
    );
  });
}

test("the parchment story follows native scroll smoothly in both directions and releases", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });

  const response = await page.goto("/module-speciale");
  expect(response?.ok()).toBe(true);
  await waitForFonts(page);

  const story = page.locator("#atlas-modulelor-speciale");
  const scenes = story.locator("[data-atlas-scene='true']");
  const followingSection = page.locator("#modulele-speciale");
  const scrollGeometry = await story.evaluate((element) => ({
    start: window.scrollY + element.getBoundingClientRect().top,
    travel: element.getBoundingClientRect().height - window.innerHeight,
  }));

  const expectSceneActive = async (index: number) => {
    await expect
      .poll(
        async () =>
          scenes.nth(index).evaluate((scene) => Number(getComputedStyle(scene).opacity)),
        { timeout: 5_000 },
      )
      .toBeGreaterThan(0.98);
  };

  for (const [index, progress] of atlasChapterPoints.entries()) {
    await scrollToStoryProgress(page, scrollGeometry, progress);
    await expectScrollSettledAt(
      page,
      scrollGeometry.start + scrollGeometry.travel * progress,
    );
    await expectSceneActive(index);
  }

  const unsnappedProgress = 0.29;
  const unsnappedTarget =
    scrollGeometry.start + scrollGeometry.travel * unsnappedProgress;

  await scrollToStoryProgress(page, scrollGeometry, unsnappedProgress);
  await expectScrollSettledAt(page, unsnappedTarget);
  await expectSceneActive(1);

  await scrollToStoryProgress(page, scrollGeometry, 0.5);
  await expectSceneActive(2);
  await scrollToStoryProgress(page, scrollGeometry, 0.25);
  await expectSceneActive(1);

  await scrollToStoryProgress(page, scrollGeometry, 0.145);
  await expect
    .poll(
      async () => {
        const transitionOpacities = await Promise.all(
          [0, 1].map((index) =>
            scenes.nth(index).evaluate((scene) => Number(getComputedStyle(scene).opacity)),
          ),
        );

        return Math.max(...transitionOpacities);
      },
      { timeout: 5_000 },
    )
    .toBeLessThan(0.35);

  await scrollToStoryProgress(page, scrollGeometry, atlasChapterPoints[4]);
  await expectSceneActive(4);

  const followingTopAtFinalHold = await followingSection.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  expect(followingTopAtFinalHold).toBeGreaterThanOrEqual(900);

  const stageTopAtFinalHold = await story
    .locator("[data-atlas-stage='true']")
    .evaluate((element) => element.getBoundingClientRect().top);
  expect(stageTopAtFinalHold).toBeCloseTo(0, 0);

  await page.mouse.wheel(0, 480);
  await waitForLayout(page);

  const releasedLayout = await Promise.all([
    story
      .locator("[data-atlas-stage='true']")
      .evaluate((element) => element.getBoundingClientRect().top),
    followingSection.evaluate((element) => element.getBoundingClientRect().top),
  ]);
  expect(releasedLayout[0]).toBeLessThan(-100);
  expect(releasedLayout[1]).toBeGreaterThanOrEqual(0);
  expect(releasedLayout[1]).toBeLessThan(900);
});

test("reduced motion presents the five parchments in normal page flow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  const response = await page.goto("/module-speciale");
  expect(response?.ok()).toBe(true);

  const story = page.locator("#atlas-modulelor-speciale");
  const slides = story.locator("[data-atlas-slide]");
  await expect(slides).toHaveCount(5);
  await waitForFonts(page);
  await waitForLayout(page);

  const reducedLayout = await story.evaluate((element) => {
    const stageElement = element.querySelector<HTMLElement>("[data-atlas-stage='true']");
    const trackElement = element.querySelector<HTMLElement>("[data-atlas-track='true']");
    const slideElements = Array.from(
      element.querySelectorAll<HTMLElement>("[data-atlas-slide]"),
    );
    const sceneElements = Array.from(
      element.querySelectorAll<HTMLElement>("[data-atlas-scene='true']"),
    );
    const slideRects = slideElements.map((slide) => slide.getBoundingClientRect());

    return {
      scenes: sceneElements.map((scene) => ({
        opacity: getComputedStyle(scene).opacity,
        transform: getComputedStyle(scene).transform,
      })),
      slides: slideElements.map((slide, index) => ({
        followsPrevious:
          index === 0 || slideRects[index].top >= slideRects[index - 1].bottom - 1,
        position: getComputedStyle(slide).position,
      })),
      stagePosition: stageElement ? getComputedStyle(stageElement).position : "",
      storyHeight: element.getBoundingClientRect().height,
      trackDisplay: trackElement ? getComputedStyle(trackElement).display : "",
      trackTransform: trackElement ? getComputedStyle(trackElement).transform : "",
    };
  });

  expect(reducedLayout.stagePosition).toBe("relative");
  expect(reducedLayout.trackDisplay).toBe("block");
  expect(reducedLayout.trackTransform).toBe("none");
  expect(reducedLayout.storyHeight).toBeGreaterThan(844);
  expect(reducedLayout.slides).toEqual(
    Array.from({ length: 5 }, () => ({ followsPrevious: true, position: "relative" })),
  );
  expect(reducedLayout.scenes).toEqual(
    Array.from({ length: 5 }, () => ({ opacity: "1", transform: "none" })),
  );

  const reducedScrollGeometry = await story.evaluate((element) => ({
    start: window.scrollY + element.getBoundingClientRect().top,
    travel: Math.max(1, element.getBoundingClientRect().height - window.innerHeight),
  }));
  const unsnappedProgress = 0.37;
  const unsnappedTarget =
    reducedScrollGeometry.start + reducedScrollGeometry.travel * unsnappedProgress;

  await scrollToStoryProgress(page, reducedScrollGeometry, unsnappedProgress);
  await expectScrollSettledAt(page, unsnappedTarget);

  await slides.last().scrollIntoViewIfNeeded();
  await expect(slides.last().getByRole("heading", { level: 2 })).toBeVisible();
  const pageWidth = await measurePageWidth(page);
  expect(pageWidth.pageWidth).toBeLessThanOrEqual(pageWidth.viewportWidth + 1);
});
