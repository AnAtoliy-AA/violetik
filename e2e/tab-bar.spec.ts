import { test, expect } from "@playwright/test";

const TAB_ROUTES = ["/en/home", "/en/services", "/en/gallery", "/en/profile"];

test.describe("TabBar — appears on tab-bar routes", () => {
  for (const route of TAB_ROUTES) {
    test(`renders the primary navigation on ${route}`, async ({ page }) => {
      await page.goto(route);
      const nav = page.getByRole("navigation", { name: /Primary navigation/i });
      await expect(nav).toBeVisible();
      // All four tab links present.
      await expect(nav.getByRole("link", { name: /Home/i })).toBeVisible();
      await expect(nav.getByRole("link", { name: /Menu/i })).toBeVisible();
      await expect(nav.getByRole("link", { name: /Gallery/i })).toBeVisible();
      await expect(nav.getByRole("link", { name: /You/i })).toBeVisible();
    });
  }
});

test("the tab matching the current route is aria-current", async ({ page }) => {
  await page.goto("/en/gallery");
  const nav = page.getByRole("navigation", { name: /Primary navigation/i });
  const current = nav.getByRole("link", { current: "page" });
  await expect(current).toHaveAttribute("href", /\/en\/gallery$/);
});

test("clicking a tab navigates and updates aria-current", async ({ page }) => {
  await page.goto("/en/home");
  const nav = page.getByRole("navigation", { name: /Primary navigation/i });
  await nav.getByRole("link", { name: /Gallery/i }).click();
  await expect(page).toHaveURL(/\/en\/gallery$/);
  const current = nav.getByRole("link", { current: "page" });
  await expect(current).toHaveAttribute("href", /\/en\/gallery$/);
});

test("tab bar is NOT rendered on /welcome (off-tab route)", async ({ page }) => {
  await page.goto("/en/welcome");
  const nav = page.getByRole("navigation", { name: /Primary navigation/i });
  await expect(nav).toHaveCount(0);
});

test("renders Belarusian labels on /be/home", async ({ page }) => {
  await page.goto("/be/home");
  const nav = page.getByRole("navigation", { name: /Асноўная навігацыя/i });
  await expect(nav.getByRole("link", { name: /Галерэя/i })).toBeVisible();
});
