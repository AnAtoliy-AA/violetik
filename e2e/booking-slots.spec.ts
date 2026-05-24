import { test, expect } from "@playwright/test";

// CI runs without GOOGLE_* env vars, so the slot API returns the
// static fallback. The first render uses BOOKING_TIMES as the
// SSR/initial-state fallback (the store is empty on direct visit
// to /en/booking/time so the useEffect short-circuits). Either way,
// the slot grid renders at least one button — that's what we assert.

test("booking time step renders slots without Google credentials", async ({
  page,
}) => {
  await page.goto("/en/booking/time");
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  const slotButton = page.locator('div.grid button:has-text(":")').first();
  await expect(slotButton).toBeVisible({ timeout: 10_000 });
});
