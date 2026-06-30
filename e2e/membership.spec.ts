import { test, expect } from "@playwright/test";

test("renders the membership hero and two tier cards at /en/membership", async ({
  page,
}) => {
  await page.goto("/en/membership");
  await expect(
    page.getByRole("heading", { level: 1, name: /Become a member/i }),
  ).toBeVisible();
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText("Member");
  await expect(cards.nth(1)).toContainText("VIP");
  await expect(page.getByText(/Most chosen/i)).toBeVisible();
});

test("annual toggle multiplies the prices by 10", async ({ page }) => {
  await page.goto("/en/membership");
  // Find the VIP card's current (non-strikethrough) price.
  const vipCard = page.getByRole("article").filter({ hasText: "VIP" });
  const priceLocator = vipCard.locator("span").filter({ hasText: /^€\d+$/ }).first();
  await expect(priceLocator).toBeVisible();
  const monthlyPrice = await priceLocator.innerText();
  await page.getByRole("tab", { name: /Annual/i }).click();
  // Annual price should be 10× the monthly price.
  const expectedAnnual = monthlyPrice.replace(/\d+/, (m) => String(Number(m) * 10));
  await expect(page.getByText(expectedAnnual)).toBeVisible();
});

test("renders the Belarusian membership eyebrow at /be/membership", async ({
  page,
}) => {
  await page.goto("/be/membership");
  await expect(page.getByText(/Па запрашэнні/i)).toBeVisible();
});
