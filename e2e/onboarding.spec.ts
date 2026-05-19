import { test, expect } from "@playwright/test";

test("renders the first slide and a skip link at /en/onboarding", async ({ page }) => {
  await page.goto("/en/onboarding");
  await expect(page.getByText("A studio of one")).toBeVisible();
  await expect(page.getByRole("link", { name: /^Skip$/i })).toHaveAttribute(
    "href",
    /\/home$/,
  );
});

test("Continue advances to the next slide, the last slide shows Begin", async ({
  page,
}) => {
  await page.goto("/en/onboarding");
  await page.getByRole("button", { name: /Continue/i }).click();
  await expect(page.getByText("Designed like couture")).toBeVisible();
  await page.getByRole("button", { name: /Continue/i }).click();
  await expect(page.getByText("Yours, by appointment")).toBeVisible();
  await expect(page.getByRole("link", { name: /^Begin$/i })).toHaveAttribute(
    "href",
    /\/home$/,
  );
});

test("renders Russian slide copy at /ru/onboarding", async ({ page }) => {
  await page.goto("/ru/onboarding");
  await expect(page.getByText("Студия на одного")).toBeVisible();
});
