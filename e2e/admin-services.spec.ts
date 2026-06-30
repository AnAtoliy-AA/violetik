import { test, expect } from "@playwright/test";
import { devServerRequiresAuth } from "./helpers/admin-skip";

// When the dev server requires auth (TELEGRAM_BOT_TOKEN in .env.local or
// shell env), admin routes redirect to /sign-in. Skip until the admin
// auth fixture is wired.
test.skip(devServerRequiresAuth(), "admin auth fixture not yet wired");

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
  // The seeded "signature" service has populated RU/BY blurbs from the
  // migration; blanking RU forces a validation error.
  const ruBlurb = page.getByLabel(/Blurb \(Russian\)/);
  await expect(ruBlurb).toBeVisible();
  // fill('') doesn't reliably reset a controlled React textarea — the
  // direct value mutation gets overwritten by React's next render from
  // state. Real keystrokes (select-all + backspace) trigger onChange and
  // commit setState.
  await ruBlurb.focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await expect(ruBlurb).toHaveValue("");
  await page.getByRole("button", { name: /^Save$/ }).click();
  // The required-locale error surfaces inline next to the blurb input.
  await expect(page.getByText(/Required/).first()).toBeVisible();
});
