import { expect, test } from "@playwright/test";

const consentCookieName = "smartmed_cookie_consent";

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test("optional technologies stay off until the visitor makes a choice", async ({
  context,
  page,
}) => {
  await page.goto("/news");

  await expect(
    page.getByRole("heading", { name: "Tu alegi ce activăm" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Refuz opționale" }),
  ).toBeVisible();

  const cookiesBeforeChoice = await context.cookies();
  expect(
    cookiesBeforeChoice.some((cookie) => cookie.name === consentCookieName),
  ).toBe(false);

  await page.getByRole("button", { name: "Refuz opționale" }).click();

  await expect(page.locator("[data-consent-banner='true']")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Deschide setările de consimțământ" }),
  ).toBeVisible();

  const consentCookie = (await context.cookies()).find(
    (cookie) => cookie.name === consentCookieName,
  );
  expect(consentCookie).toBeDefined();

  const record = JSON.parse(decodeURIComponent(consentCookie!.value)) as {
    choices: Record<string, boolean>;
    version: number;
  };
  expect(record.version).toBe(1);
  expect(record.choices).toEqual({
    necessary: true,
    preferences: false,
    analytics: false,
    externalMedia: false,
    marketing: false,
  });
});

test("the permanent consent tab reopens granular settings", async ({
  context,
  page,
}) => {
  await page.goto("/news");
  await page.getByRole("button", { name: "Refuz opționale" }).click();
  await page
    .getByRole("button", { name: "Deschide setările de consimțământ" })
    .click();

  await expect(
    page.getByRole("heading", { name: "Preferințele tale" }),
  ).toBeVisible();

  const analyticsSwitch = page.getByRole("switch", {
    name: "Analiză: dezactivat",
  });
  await expect(analyticsSwitch).toHaveAttribute("aria-checked", "false");
  await analyticsSwitch.click();
  await page.getByRole("button", { name: "Salvează selecția" }).click();

  const consentCookie = (await context.cookies()).find(
    (cookie) => cookie.name === consentCookieName,
  );
  const record = JSON.parse(decodeURIComponent(consentCookie!.value)) as {
    choices: Record<string, boolean>;
  };

  expect(record.choices.analytics).toBe(true);
  expect(record.choices.externalMedia).toBe(false);
  await expect(
    page.getByRole("button", { name: "Deschide setările de consimțământ" }),
  ).toBeVisible();
});

test("the cookie policy explains the choices simply and opens settings", async ({
  page,
}) => {
  await page.goto("/politica-cookie");

  await expect(
    page.getByRole("heading", {
      name: "Cookie-uri, pe înțelesul tuturor",
      level: 1,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cookie-uri necesare" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Nu folosim momentan cookie-uri de analiză sau publicitate.",
    ),
  ).toBeVisible();
  await expect(page.getByText("smartmed_cookie_consent")).toHaveCount(0);
  await expect(page.getByText("Supabase")).toHaveCount(0);

  await page.getByRole("button", { name: "Deschide setările" }).click();
  await expect(
    page.getByRole("heading", { name: "Preferințele tale" }),
  ).toBeVisible();
});
