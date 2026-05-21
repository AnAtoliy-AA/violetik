import { test, expect } from "@playwright/test";

// Skipped in default CI; requires DATABASE_URL + an admin user fixture.
test.skip(
  "TODO: VIP request happy path",
  async ({ page }) => {
    await page.goto("/en/membership");
    await page.getByRole("button", { name: /join vip/i }).click();
    // visit /admin/vip-requests (as admin)
    // approve
    // visit /profile
    await expect(page.getByText(/vip/i)).toBeVisible();
  },
);
