import { test, expect } from "@playwright/test";

// Mirrors e2e/admin-masters.spec.ts. Admin routes are open in CI
// (TELEGRAM_BOT_TOKEN unset) so route-level smokes can run without
// secrets; the admin auth fixture isn't wired yet for the secrets case.
test.skip(
  Boolean(process.env.TELEGRAM_BOT_TOKEN),
  "admin auth fixture not yet wired",
);

test("admin users list page renders the search box and filter pills", async ({
  page,
}) => {
  await page.goto("/en/admin/users");
  await expect(page).toHaveTitle(/Users/);
  await expect(page.getByPlaceholder(/Search by name/i)).toBeVisible();
  // Default role + VIP filters are present.
  await expect(page.getByRole("link", { name: "Admins" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Customers" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Active VIP" })).toBeVisible();
});

test("role and VIP filter pills toggle URL params", async ({ page }) => {
  await page.goto("/en/admin/users");
  await page.getByRole("link", { name: "Admins" }).click();
  await expect(page).toHaveURL(/role=admin/);
  await page.getByRole("link", { name: "Active VIP" }).click();
  await expect(page).toHaveURL(/vip=active/);
});
