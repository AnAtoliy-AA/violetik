import { test, expect } from "@playwright/test";
import { devServerRequiresAuth } from "./helpers/admin-skip";

test.skip(devServerRequiresAuth(), "admin auth fixture not yet wired");

test("admin testimonials page renders all three buckets", async ({ page }) => {
  await page.goto("/en/admin/testimonials");
  await expect(
    page.getByRole("heading", { level: 1, name: /Pending reviews/i }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Pending \(\d+\)$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Approved \(\d+\)$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Rejected \(\d+\)$/ })).toBeVisible();
});

test("admin dashboard exposes the Testimonials tile", async ({ page }) => {
  await page.goto("/en/admin");
  const tile = page.getByRole("link", { name: /Testimonials/i });
  await expect(tile).toBeVisible();
  await tile.click();
  await expect(page).toHaveURL(/\/en\/admin\/testimonials$/);
});
