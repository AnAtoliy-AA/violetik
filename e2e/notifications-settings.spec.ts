import { test, expect } from "@playwright/test";

test("anonymous visit to /en/profile/notifications redirects to sign-in", async ({
  page,
}) => {
  await page.goto("/en/profile/notifications");
  await expect(page).toHaveURL(/\/sign-in/);
});
