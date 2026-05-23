import { test, expect } from "@playwright/test";

// When TELEGRAM_BOT_TOKEN is unset (default CI + local dev), the
// /admin/* routes are open and these specs run normally. Once the token
// lands, requireAdmin() activates and the route redirects to /sign-in —
// no admin fixture is wired yet (same posture as e2e/vip-request.spec.ts).
test.skip(
  Boolean(process.env.TELEGRAM_BOT_TOKEN),
  "admin auth fixture not yet wired",
);

test("admin services list renders both groups", async ({ page }) => {
  await page.goto("/en/admin/services");
  await expect(
    page.getByRole("heading", { level: 1, name: /Menu/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /^Categories$/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /^Services$/ }),
  ).toBeVisible();
});

test("New category link navigates to the editor", async ({ page }) => {
  await page.goto("/en/admin/services");
  await page.getByRole("link", { name: /New category/i }).click();
  await expect(page).toHaveURL(/\/admin\/services\/categories\/new$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /New category/i }),
  ).toBeVisible();
});

test("service editor surfaces inline validation error on empty locale", async ({
  page,
}) => {
  await page.goto("/en/admin/services/signature");
  // The seeded "signature" service has populated RU/BE blurbs from the
  // migration; blanking RU forces a validation error.
  const ruBlurb = page.getByLabel(/Blurb \(Russian\)/);
  await expect(ruBlurb).toBeVisible();
  await ruBlurb.fill("");
  // Wait for React's controlled-input state to commit before clicking
  // Save — otherwise the click can fire while React still holds the
  // pre-clear value, Zod passes, and the save succeeds with stale text.
  await expect(ruBlurb).toHaveValue("");
  await page.getByRole("button", { name: /^Save$/ }).click();
  // The required-locale error surfaces inline next to the blurb input.
  await expect(page.getByText(/Required/).first()).toBeVisible();
});
