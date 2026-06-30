import { test, expect } from "@playwright/test";

test("renders the editorial hero at /en/home", async ({ page }) => {
  await page.goto("/en/home");
  await expect(
    page.getByRole("heading", { level: 1, name: /Beauty.*details/is }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Reserve$/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Gallery/i }).first(),
  ).toBeVisible();
});

test("Signatures section lists services", async ({ page }) => {
  await page.goto("/en/home");
  await expect(
    page.getByRole("heading", { level: 2, name: /^Signatures\.$/ }),
  ).toBeVisible();
  // At least one service menu item should render when services are seeded.
  await expect(page.getByRole("article").first()).toBeVisible();
});

test("renders the Belarusian hero at /be/home", async ({ page }) => {
  await page.goto("/be/home");
  await expect(
    page.getByRole("heading", { level: 1, name: /Прыгажосць.*дэталях/is }),
  ).toBeVisible();
});
