import { test, expect } from "@playwright/test";

// When TELEGRAM_BOT_TOKEN is unset (default CI + local dev), the /admin/*
// routes are open and these specs run normally. Once the token lands,
// requireAdmin() redirects to /sign-in (same posture as e2e/admin-services).
test.skip(
  Boolean(process.env.TELEGRAM_BOT_TOKEN),
  "admin auth fixture not yet wired",
);

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
