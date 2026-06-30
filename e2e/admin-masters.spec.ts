import { test, expect } from "@playwright/test";
import { devServerRequiresAuth } from "./helpers/admin-skip";

test.skip(devServerRequiresAuth(), "admin auth fixture not yet wired");

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
  // fill('') doesn't reliably reset a controlled React textarea — the
  // direct value mutation gets overwritten by React's next render from
  // state. Real keystrokes (select-all + backspace) trigger onChange and
  // commit setState.
  await ruBio.focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await expect(ruBio).toHaveValue("");
  await page.getByRole("button", { name: /^Save$/ }).click();
  await expect(page.getByText(/Required/).first()).toBeVisible();
});
