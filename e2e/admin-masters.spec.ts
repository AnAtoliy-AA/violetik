import { test, expect } from "@playwright/test";

// Mirrors e2e/admin-services.spec.ts and e2e/vip-request.spec.ts.
// Once TELEGRAM_BOT_TOKEN lands the admin routes redirect to /sign-in;
// the admin fixture isn't wired yet.
test.skip(
  Boolean(process.env.TELEGRAM_BOT_TOKEN),
  "admin auth fixture not yet wired",
);

test("admin masters list renders Published group", async ({ page }) => {
  await page.goto("/en/admin/masters");
  await expect(
    page.getByRole("heading", { level: 1, name: /Masters/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /^Published$/ }),
  ).toBeVisible();
});

test("New master link navigates to the editor", async ({ page }) => {
  await page.goto("/en/admin/masters");
  await page.getByRole("link", { name: /New master/i }).click();
  await expect(page).toHaveURL(/\/admin\/masters\/new$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /New master/i }),
  ).toBeVisible();
});

test("master editor surfaces inline validation on empty locale", async ({
  page,
}) => {
  await page.goto("/en/admin/masters/violetta");
  const ruBio = page.getByLabel(/Bio \(Russian\)/);
  await expect(ruBio).toBeVisible();
  await ruBio.fill("");
  // Wait for React's controlled-textarea state to commit before clicking
  // Save (same race that surfaced on admin-services).
  await expect(ruBio).toHaveValue("");
  await page.getByRole("button", { name: /^Save$/ }).click();
  await expect(page.getByText(/Required/).first()).toBeVisible();
});
