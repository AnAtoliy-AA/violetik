import { test, expect } from "@playwright/test";

test("renders the membership hero and three tier cards at /en/membership", async ({
  page,
}) => {
  await page.goto("/en/membership");
  await expect(
    page.getByRole("heading", { level: 1, name: /Become a member/i }),
  ).toBeVisible();
  // Tier names appear both in the cards and in the CTA links ("Join Violette"),
  // so scope assertions to the cards themselves (rendered as <article>).
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText("Petale");
  await expect(cards.nth(1)).toContainText("Violette");
  await expect(cards.nth(2)).toContainText("Atelier");
  await expect(page.getByText(/Most chosen/i)).toBeVisible();
});

test("annual toggle multiplies the prices by 10", async ({ page }) => {
  await page.goto("/en/membership");
  await expect(page.getByText("€180")).toBeVisible();
  await page.getByRole("tab", { name: /Annual/i }).click();
  await expect(page.getByText("€1800")).toBeVisible();
  await expect(page.getByText("€4200")).toBeVisible();
});

test("renders the Belarusian membership eyebrow at /be/membership", async ({
  page,
}) => {
  await page.goto("/be/membership");
  await expect(page.getByText(/Па запрашэнні/i)).toBeVisible();
});
