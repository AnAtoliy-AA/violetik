import { test, expect } from "@playwright/test";

test("renders the editorial hero at /en/home", async ({ page }) => {
  await page.goto("/en/home");
  await expect(
    page.getByRole("heading", { level: 1, name: /The hands.*portrait/is }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Reserve$/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Gallery/i }).first(),
  ).toBeVisible();
});

test("Signatures section lists the first four services", async ({ page }) => {
  await page.goto("/en/home");
  await expect(
    page.getByRole("heading", { level: 2, name: /^Signatures\.$/ }),
  ).toBeVisible();
  for (const name of [
    "Signature Manicure",
    "Couture Gel",
    "Editorial Art",
    "Glass Extensions",
  ]) {
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
});

test("renders the Belarusian hero at /be/home", async ({ page }) => {
  await page.goto("/be/home");
  await expect(
    page.getByRole("heading", { level: 1, name: /Рукі.*партрэт/is }),
  ).toBeVisible();
});
