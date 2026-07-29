import { expect, test } from "@playwright/test";

test("anonymous visitors are redirected away from the admin control plane", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(page).toHaveURL((url) => {
    return (
      url.pathname === "/cont" &&
      url.searchParams.get("access") === "required" &&
      url.searchParams.get("next") === "/admin"
    );
  });
  await expect(
    page.getByRole("heading", { name: "Contul tău SmartMed" }),
  ).toBeVisible();
  await expect(page.getByText("Acces restricționat")).toBeVisible();
});

test("the pre-existing static News page remains independent from CMS News", async ({
  page,
}) => {
  await page.goto("/news");

  await expect(
    page.getByRole("heading", { name: "SmartMed News" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/news$/u);
});

test("the article template placeholder is explicitly noindex", async ({
  page,
}) => {
  await page.goto("/sablon-articol");

  const robots = page.locator('meta[name="robots"]');
  await expect(robots).toHaveAttribute("content", /noindex/u);
  await expect(robots).toHaveAttribute("content", /nofollow/u);
});

test("missing CMS configuration produces a controlled Blog outage, never bundled resurrection", async ({
  page,
}) => {
  test.skip(
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    "This assertion is for the deliberately unconfigured local test process.",
  );

  await page.goto("/blog");

  await expect(
    page.getByRole("heading", { name: "Articolele nu pot fi încărcate" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Nu afișăm copii locale care ar putea fi depășite/u),
  ).toBeVisible();
});

test("application responses include the production-oriented security baseline", async ({
  request,
}) => {
  const response = await request.get("/news");
  const headers = response.headers();

  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});
