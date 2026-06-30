import { test, expect } from "@playwright/test";

test("renders the menu and service list at /en/services", async ({ page }) => {
  await page.goto("/en/services");
  await expect(
    page.getByRole("heading", { level: 1, name: /^The menu\.$/ }),
  ).toBeVisible();
  // At least one service menu item should render.
  await expect(page.getByRole("article").first()).toBeVisible();
});

test("Care chip filters down to Care services", async ({ page }) => {
  await page.goto("/en/services");
  const allArticles = page.getByRole("article");
  const totalBefore = await allArticles.count();
  await page.getByRole("tab", { name: /^Care$/ }).click();
  // After filtering, fewer services should be visible.
  await expect(allArticles.first()).toBeVisible();
  const totalAfter = await allArticles.count();
  expect(totalAfter).toBeLessThan(totalBefore);
});

test("renders the Belarusian hero at /be/services", async ({ page }) => {
  await page.goto("/be/services");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Меню.");
});
