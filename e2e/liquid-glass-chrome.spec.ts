import { test, expect } from "@playwright/test";

test.describe("Liquid glass chrome", () => {
  test("app header and tab bar render with data-glass on /home", async ({ page }) => {
    await page.goto("/en/home");
    // AppHeader uses GlassSurface as="header" which emits data-glass="true"
    await expect(page.locator("header[data-glass='true']").first()).toBeVisible();
    // Tab bar dock is a GlassSurface inside the Primary navigation nav
    await expect(
      page.locator("nav[aria-label='Primary navigation'] [data-glass='true']").first(),
    ).toBeVisible();
  });

  // NOTE: data-palette is written server-side in app/[locale]/layout.tsx via
  // settings.defaultPalette — there is no client-side palette switcher that
  // writes to document.documentElement. Per spec §0, palette QA is out of scope
  // for this E2E layer; it is covered by the unit/Storybook suite instead.
});
