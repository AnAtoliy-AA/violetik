import { test, expect } from "@playwright/test";

test("admin shows the palette switcher with all 12 options", async ({
  page,
}) => {
  await page.goto("/en/admin");
  await expect(
    page.getByRole("heading", { level: 1, name: /Palette\.?/i }),
  ).toBeVisible();
  const group = page.getByRole("radiogroup");
  await expect(group.getByRole("radio")).toHaveCount(12);
});

test("selecting a palette swaps data-palette and persists across reload", async ({
  page,
}) => {
  await page.goto("/en/admin");
  // Default Aubergine is checked.
  await expect(
    page.getByRole("radio", { name: /Aubergine/i }),
  ).toHaveAttribute("aria-checked", "true");

  await page.getByRole("radio", { name: /Moss/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-palette", "moss");
  await expect(page.getByRole("radio", { name: /Moss/i })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  // Reload — the init script should re-apply the cookie value before paint.
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-palette", "moss");
  await expect(page.getByRole("radio", { name: /Moss/i })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  // Reset for subsequent tests.
  await page
    .context()
    .clearCookies({ name: "vio-palette" })
    .catch(() => {});
});

test("palette change persists when navigating to a different page", async ({
  page,
}) => {
  await page.goto("/en/admin");
  await page.getByRole("radio", { name: /Sapphire/i }).click();
  await page.goto("/en/home");
  await expect(page.locator("html")).toHaveAttribute(
    "data-palette",
    "sapphire",
  );

  await page
    .context()
    .clearCookies({ name: "vio-palette" })
    .catch(() => {});
});

test("renders the Belarusian admin hero at /be/admin", async ({ page }) => {
  await page.goto("/be/admin");
  await expect(
    page.getByRole("heading", { level: 1, name: /Палітра/i }),
  ).toBeVisible();
});
