import { expect, test, type Page } from "@playwright/test";

const homeViewports = [
  { label: "compact desktop", width: 1366, height: 768 },
  { label: "standard desktop", width: 1440, height: 900 },
  { label: "large laptop", width: 1512, height: 982 },
  { label: "full HD", width: 1920, height: 1080 },
  { label: "QHD", width: 2560, height: 1440 },
  { label: "ultrawide", width: 3440, height: 1440 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "mobile", width: 390, height: 844 },
] as const;

const atlasViewports = homeViewports.filter(({ width }) => width >= 1024);

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

    await expect(main, `${viewport.label}: main content`).toBeVisible();
    await expect(header, `${viewport.label}: public header`).toBeVisible();
    await expect(nav, `${viewport.label}: primary navigation`).toBeVisible();
    await expect(hero, `${viewport.label}: homepage hero`).toBeVisible();
    await expect(heroHeading, `${viewport.label}: hero heading`).toBeVisible();
    await expect(heroHighlight, `${viewport.label}: hero highlight`).toBeVisible();
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

    expect.soft(maxPageWidth, `${viewport.label}: full-scroll horizontal overflow`).toBeLessThanOrEqual(
      measuredViewportWidth + 1,
    );
  });
}

for (const viewport of atlasViewports) {
  test(`all special-module chapters alternate at ${viewport.width}px`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const response = await page.goto("/module-speciale");
    expect(response?.ok(), `${viewport.label}: successful module-speciale response`).toBe(true);

    const story = page.locator("#atlas-modulelor-speciale");
    const chapters = page.locator("#atlas-modulelor-speciale > article");

    await expect(story).toBeVisible();
    await expect(chapters).toHaveCount(5);
    await waitForFonts(page);

    for (let index = 0; index < 5; index += 1) {
      await chapters.nth(index).scrollIntoViewIfNeeded();
      await waitForLayout(page);
    }

    const chapterLayouts = await chapters.evaluateAll((chapterElements) =>
      chapterElements.map((chapter) => {
        const grid = chapter.firstElementChild;
        const gridChildren = grid ? Array.from(grid.children) : [];
        const parchment = gridChildren.find(
          (element) => getComputedStyle(element).gridArea === "parchment",
        );
        const visual = gridChildren.find(
          (element) => getComputedStyle(element).gridArea === "visual",
        );
        const gridRect = grid?.getBoundingClientRect();
        const parchmentRect = parchment?.getBoundingClientRect();
        const visualRect = visual?.getBoundingClientRect();

        return {
          display: grid ? getComputedStyle(grid).display : "none",
          gridWidth: gridRect?.width ?? 0,
          parchmentLeft: parchmentRect?.left ?? 0,
          parchmentRight: parchmentRect?.right ?? 0,
          visualLeft: visualRect?.left ?? 0,
          visualRight: visualRect?.right ?? 0,
        };
      }),
    );
    const pageWidth = await measurePageWidth(page);

    expect(chapterLayouts).toHaveLength(5);

    for (const [index, layout] of chapterLayouts.entries()) {
      expect.soft(layout.display, `${viewport.width}px chapter ${index + 1}: grid layout`).toBe(
        "grid",
      );
      expect.soft(layout.gridWidth, `${viewport.width}px chapter ${index + 1}: content exists`).toBeGreaterThan(
        0,
      );
      expect.soft(layout.gridWidth, `${viewport.width}px chapter ${index + 1}: desktop content cap`).toBeLessThanOrEqual(
        1473,
      );

      if (index % 2 === 0) {
        expect.soft(layout.parchmentRight, `${viewport.width}px chapter ${index + 1}: parchment precedes visual`).toBeLessThan(
          layout.visualLeft,
        );
      } else {
        expect.soft(layout.visualRight, `${viewport.width}px chapter ${index + 1}: visual precedes parchment`).toBeLessThan(
          layout.parchmentLeft,
        );
      }
    }

    expect.soft(pageWidth.pageWidth, `${viewport.width}px atlas horizontal overflow`).toBeLessThanOrEqual(
      pageWidth.viewportWidth + 1,
    );
  });
}
