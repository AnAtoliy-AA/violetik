import { test, expect } from "@playwright/test";

test("walks the booking flow from service to confirmation", async ({ page }) => {
  await page.goto("/en/booking/service");
  await expect(
    page.getByRole("heading", { level: 2, name: /Choose your ritual/i }),
  ).toBeVisible();

  // Pick a ritual
  await page.getByRole("radio", { name: /Couture Gel/i }).click();
  await page.getByRole("button", { name: /^Forward$/i }).click();

  await expect(page).toHaveURL(/\/booking\/date$/);
  await expect(
    page.getByRole("heading", { level: 2, name: /Pick a day/i }),
  ).toBeVisible();

  // Pick the second Tuesday in the strip (2026-05-26)
  await page.getByRole("button", { name: /Tue 26/i }).click();
  await page.getByRole("button", { name: /^Forward$/i }).click();

  await expect(page).toHaveURL(/\/booking\/time$/);

  // Pick 14:30 (not reserved). Wait for the slot grid to be stable —
  // it re-renders after async data loads and Playwright otherwise sees
  // the button detach between resolve and click.
  const slot = page.getByRole("button", { name: /14:30/i });
  await slot.waitFor({ state: "visible" });
  await slot.click();
  await page.getByRole("button", { name: /^Forward$/i }).click();

  await expect(page).toHaveURL(/\/booking\/confirm$/);
  await expect(
    page.getByRole("heading", { level: 2, name: /A quiet review/i }),
  ).toBeVisible();
  await expect(page.getByText("Couture Gel")).toBeVisible();
  await expect(page.getByText("14:30")).toBeVisible();

  // Submit (Phase 2 microcopy: "Confirm"). The post-submit landing
  // depends on env: without an Auth.js session submitBooking redirects
  // to /sign-in; with a session it lands on /booking/confirmation.
  // Either landing means we left the confirm step successfully.
  await page.getByRole("button", { name: /^Confirm$/i }).click();
  await expect(page).toHaveURL(
    /\/(sign-in\?callbackUrl=|booking\/confirmation)/,
  );
});

test("Continue is disabled until a ritual is chosen", async ({ page }) => {
  await page.goto("/en/booking/service");
  await expect(
    page.getByRole("link", { name: /Pick a ritual/i }),
  ).toBeVisible();
});

test("seeds the service from ?selected= query param", async ({ page }) => {
  await page.goto("/en/booking/service?selected=editorial");
  await expect(
    page.getByRole("radio", { name: /Editorial Art/i }),
  ).toHaveAttribute("aria-checked", "true");
});

test("unknown booking step returns 404", async ({ page }) => {
  const response = await page.goto("/en/booking/not-a-step");
  expect(response?.status()).toBe(404);
});
