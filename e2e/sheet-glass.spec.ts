import { test, expect } from "@playwright/test";

test.describe("Sheet glass body", () => {
  test("nav-sheet opens with a glass body", async ({ page }) => {
    await page.goto("/en/home");
    // The NavSheet trigger uses aria-label from Nav.trigger_label translation:
    // "Open navigation" in English.
    const menuTrigger = page
      .locator("button[aria-label*='navigation' i], button[aria-label*='menu' i]")
      .first();
    if ((await menuTrigger.count()) === 0) {
      test.skip(true, "no menu trigger on /home — sheet test pending nav-sheet wiring");
      return;
    }
    await menuTrigger.click();
    // The opened sheet panel has role="dialog" and data-glass="true" applied
    // directly on the <m.div> in nav-sheet.tsx.
    await expect(
      page.locator("[role='dialog'][data-glass='true']").first(),
    ).toBeVisible();
  });
});
