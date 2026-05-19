import { test, expect } from "@playwright/test";

test("renders English greeting at default locale", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en\b/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hello");
});

test("switches to Belarusian via locale switcher", async ({ page }) => {
  await page.goto("/en");
  await page.getByLabel("Language").selectOption("be");
  await expect(page).toHaveURL(/\/be\b/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Прывітанне");
});
