import { test, expect } from "@playwright/test";

test("/ redirects to the default-locale welcome screen", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en\/welcome\b/);
  await expect(page.getByLabel("Violetta")).toBeVisible();
});

test("renders the English tagline and CTAs at /en/welcome", async ({ page }) => {
  await page.goto("/en/welcome");
  await expect(page.getByText(/A private nail atelier/i)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Enter the atelier/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /I already have an account/i }),
  ).toBeVisible();
});

test("renders the Belarusian tagline at /be/welcome", async ({ page }) => {
  await page.goto("/be/welcome");
  await expect(page.getByText(/Прыватнае атэлье манікюру/i)).toBeVisible();
});
