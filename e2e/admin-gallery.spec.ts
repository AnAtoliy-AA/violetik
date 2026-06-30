import { test, expect } from "@playwright/test";
import { devServerRequiresAuth } from "./helpers/admin-skip";

// When the dev server requires auth (TELEGRAM_BOT_TOKEN in .env.local or
// shell env), admin routes redirect to /sign-in. Skip until the admin
// auth fixture is wired.
test.skip(devServerRequiresAuth(), "admin auth fixture not yet wired");

test("admin gallery list renders both sections", async ({ page }) => {
  await page.goto("/en/admin/gallery");
  await expect(
    page.getByRole("heading", { level: 1, name: /Manage the gallery/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /^Categories$/ }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Pictures$/ })).toBeVisible();
});

test("New category link opens the category editor", async ({ page }) => {
  await page.goto("/en/admin/gallery");
  await page.getByRole("link", { name: /New category/i }).click();
  await expect(page).toHaveURL(/\/admin\/gallery\/categories\/new$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /New category/i }),
  ).toBeVisible();
});

test("New picture link opens the picture editor", async ({ page }) => {
  await page.goto("/en/admin/gallery");
  await page.getByRole("link", { name: /New picture/i }).click();
  await expect(page).toHaveURL(/\/admin\/gallery\/new$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /New picture/i }),
  ).toBeVisible();
});

test("category editor surfaces inline validation on a missing name", async ({
  page,
}) => {
  await page.goto("/en/admin/gallery/categories/new");
  await page.getByLabel(/ID \(slug\)/i).fill("editorial");
  await page.getByRole("button", { name: /^Save$/ }).click();
  await expect(page.getByText(/^Required$/).first()).toBeVisible();
});
