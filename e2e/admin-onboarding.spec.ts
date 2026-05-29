import { test, expect } from "@playwright/test";

test.skip(
  Boolean(process.env.TELEGRAM_BOT_TOKEN),
  "admin auth fixture not yet wired",
);

test("admin onboarding list renders the slides section", async ({ page }) => {
  await page.goto("/en/admin/onboarding");
  await expect(
    page.getByRole("heading", { level: 1, name: /Manage onboarding/i }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Slides$/ })).toBeVisible();
});

test("New slide link opens the slide editor", async ({ page }) => {
  await page.goto("/en/admin/onboarding");
  await page.getByRole("link", { name: /New slide/i }).click();
  await expect(page).toHaveURL(/\/admin\/onboarding\/new$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /New slide/i }),
  ).toBeVisible();
});

test("slide editor surfaces inline validation on empty fields", async ({
  page,
}) => {
  await page.goto("/en/admin/onboarding/new");
  await page.getByLabel(/ID \(slug\)/i).fill("atelier");
  await page.getByRole("button", { name: /^Save$/ }).click();
  await expect(page.getByText(/^Required$/).first()).toBeVisible();
});

test("the customer onboarding still renders the default first slide", async ({
  page,
}) => {
  await page.goto("/en/onboarding");
  await expect(page.getByText("A studio of one")).toBeVisible();
});
