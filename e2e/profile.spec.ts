import { test, expect } from "@playwright/test";

test("renders the profile hero at /en/profile", async ({ page }) => {
  await page.goto("/en/profile");
  await expect(
    page.getByRole("heading", { level: 1, name: /Lara K\./ }),
  ).toBeVisible();
  await expect(page.getByText(/Member · VIP/i)).toBeVisible();
});

test("shows next-visit card with service and countdown", async ({ page }) => {
  await page.goto("/en/profile");
  const card = page.getByRole("article", { name: /Next visit/i });
  await expect(card).toBeVisible();
  await expect(card.getByText("Couture Gel")).toBeVisible();
  await expect(card.getByText(/In 4 days/i)).toBeVisible();
});

test("quick-links nav routes to the canonical sections", async ({ page }) => {
  await page.goto("/en/profile");
  const nav = page.getByRole("navigation", { name: /Account links/i });
  await expect(
    nav.getByRole("link", { name: /My bookings/i }),
  ).toHaveAttribute("href", /\/en\/booking\/service$/);
  await expect(
    nav.getByRole("link", { name: /Member card/i }),
  ).toHaveAttribute("href", /\/en\/membership$/);
});

test("renders the Belarusian profile labels at /be/profile", async ({
  page,
}) => {
  await page.goto("/be/profile");
  await expect(page.getByText(/Сябар · VIP/i)).toBeVisible();
  await expect(page.getByText(/Наступны візіт/i)).toBeVisible();
});
