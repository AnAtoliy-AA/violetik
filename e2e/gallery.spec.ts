import { test, expect } from "@playwright/test";

test("renders the gallery hero and tiles at /en/gallery", async ({ page }) => {
  await page.goto("/en/gallery");
  await expect(
    page.getByRole("heading", { level: 1, name: /Recent works\.?/i }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /^All$/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /^Chrome$/i })).toBeVisible();
});

test("filtering by Chrome narrows the grid", async ({ page }) => {
  await page.goto("/en/gallery");
  await page.getByRole("tab", { name: /^Chrome$/i }).click();
  // After narrowing, only Chrome-tagged buttons should remain in the grid.
  const remaining = await page
    .getByRole("button", { name: "Chrome" })
    .all();
  expect(remaining.length).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Lace" })).toHaveCount(0);
});

test("clicking a tile opens the lightbox dialog", async ({ page }) => {
  await page.goto("/en/gallery");
  await page.getByRole("button", { name: "Editorial" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText(/Set \d{2} ·/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("renders the Belarusian gallery hero at /be/gallery", async ({ page }) => {
  await page.goto("/be/gallery");
  await expect(
    page.getByRole("heading", { level: 1, name: /Свежыя працы/i }),
  ).toBeVisible();
});
