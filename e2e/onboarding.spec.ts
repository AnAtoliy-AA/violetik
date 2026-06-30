import { test, expect } from "@playwright/test";

test("renders the first slide and a Take-me-home link at /en/onboarding", async ({ page }) => {
  await page.goto("/en/onboarding");
  await expect(page.getByText("A studio of one")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Take me home/i }),
  ).toHaveAttribute("href", /\/home$/);
});

test("Forward advances to the second slide, the last slide shows Step inside", async ({
  page,
}) => {
  await page.goto("/en/onboarding");
  await page.getByRole("button", { name: /^Forward$/i }).click();
  await expect(page.getByText("Made with care")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Step inside$/i }),
  ).toHaveAttribute("href", /\/home$/);
});

test("renders Russian slide copy at /ru/onboarding", async ({ page }) => {
  await page.goto("/ru/onboarding");
  await expect(page.getByText("Студия на одного")).toBeVisible();
});
