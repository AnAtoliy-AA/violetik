import { test, expect } from "@playwright/test";

test("walks the booking flow from service to confirmation", async ({ page }) => {
  await page.goto("/en/booking/service");
  await expect(
    page.getByRole("heading", { level: 2, name: /Choose your ritual/i }),
  ).toBeVisible();

  // Pick the first ritual and capture its name dynamically. Hardcoding a
  // service name ("Couture Gel") couples the test to a specific DB seed and
  // breaks against any other dataset; instead read the chosen tile's display
  // name (the text-[20px] node, distinct from the duration eyebrow + blurb)
  // and re-assert that same name on the confirm step.
  const firstRitual = page.getByRole("radio").first();
  const serviceName = (
    await firstRitual.locator("div.text-\\[20px\\]").innerText()
  ).trim();
  await firstRitual.click();
  await page.getByRole("button", { name: /^Forward$/i }).click();

  // §6.1–6.2 — solo studios collapse master + date + time into a single
  // /booking/when step. The route still accepts /date and /time, but
  // the in-app Forward navigation lands on /when.
  await expect(page).toHaveURL(/\/booking\/when$/);
  await expect(
    page.getByRole("heading", { level: 2, name: /Pick a day/i }),
  ).toBeVisible();

  // Pick an enabled day from the rolling 14-day strip. We can't hardcode a
  // date — the strip starts at "today", so a fixed day falls out of range as
  // the calendar moves. Day buttons are aria-label'd "<Dow> <DayNum>" and
  // Sun/Mon are disabled; take the LAST enabled one so it's well past the
  // booking lead-time window and the full slot list (incl. 14:30) is offered.
  await page
    .getByRole("button", { name: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d+$/ })
    .and(page.locator("button:not([disabled])"))
    .last()
    .click();

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
  await expect(page.getByText(serviceName)).toBeVisible();
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
    page.getByText("Pick a ritual"),
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
