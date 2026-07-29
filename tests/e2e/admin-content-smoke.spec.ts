import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const hasLocalAdmin = Boolean(adminEmail && adminPassword);

test.describe("provisioned local administrator", () => {
  test.skip(
    !hasLocalAdmin,
    "Requires the guarded local provisioner and E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD.",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/cont?mode=conectare&next=%2Fadmin");
    await page.getByLabel("Email").fill(adminEmail!);
    await page.getByLabel("Parolă").fill(adminPassword!);
    await page.getByRole("button", { name: "Intră în cont" }).click();
    await expect(page).toHaveURL(/\/admin(?:\/mfa)?$/u);
  });

  test("loads the responsive shell and Content module", async ({ page }) => {
    test.skip(
      new URL(page.url()).pathname === "/admin/mfa",
      "The interactive TOTP challenge must be completed before this smoke test.",
    );

    await expect(
      page.getByRole("heading", { name: /Administrare SmartMed/u }),
    ).toBeVisible();
    await page.getByRole("link", { name: /Conținut/u }).first().click();
    await expect(page).toHaveURL(/\/admin\/content$/u);
    await expect(
      page.getByRole("heading", { name: "Conținut" }),
    ).toBeVisible();
  });

  test("creates and opens a private News draft with publication disabled", async ({
    page,
  }) => {
    test.skip(
      new URL(page.url()).pathname === "/admin/mfa",
      "The interactive TOTP challenge must be completed before this mutation test.",
    );

    const unique = Date.now().toString(36);
    await page.goto("/admin/content/new");
    await page.getByLabel(/News/u).check();
    await page.getByLabel("Titlu").fill(`News E2E ${unique}`);
    await page.getByLabel("Slug unic").fill(`news-e2e-${unique}`);
    await page
      .getByLabel("Rezumat")
      .fill("Ciornă News izolată pentru verificarea fluxului administrativ.");
    await page
      .getByRole("button", { name: "Creează versiunea inițială" })
      .click();

    await expect(page).toHaveURL(/\/admin\/content\/[1-9][0-9]*$/u);
    await expect(
      page.getByText(
        /Publicarea News nu este activată deoarece canalul public News/u,
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Public/u }),
    ).toBeDisabled();
  });
});
