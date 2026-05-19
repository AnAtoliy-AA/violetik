import { test, expect } from "@playwright/test";

test("renders the menu and six rituals at /en/services", async ({ page }) => {
  await page.goto("/en/services");
  await expect(
    page.getByRole("heading", { level: 1, name: /^The menu\.$/ }),
  ).toBeVisible();
  for (const name of [
    "Signature Manicure",
    "Couture Gel",
    "Editorial Art",
    "Glass Extensions",
    "Spa Pedicure",
    "Gentle Removal",
  ]) {
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
});

test("Care chip filters down to the three Care services", async ({ page }) => {
  await page.goto("/en/services");
  await page.getByRole("tab", { name: /^Care$/ }).click();
  await expect(page.getByText("Signature Manicure", { exact: true })).toBeVisible();
  await expect(page.getByText("Spa Pedicure", { exact: true })).toBeVisible();
  await expect(page.getByText("Gentle Removal", { exact: true })).toBeVisible();
  await expect(page.getByText("Couture Gel", { exact: true })).toBeHidden();
});

test("renders the Belarusian hero at /be/services", async ({ page }) => {
  await page.goto("/be/services");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Меню.");
});
