import { test, expect } from "@playwright/test";

// With only one published master (Violetta, from the Phase 1 seed) the
// master step is expected to auto-skip the moment the customer arrives
// with a serviceId in the booking store. We deep-link via the service
// step's URL flow (set the service, navigate to /booking/master).
test("master step auto-skips when only one master is eligible", async ({
  page,
}) => {
  // Land on the service step.
  await page.goto("/en/booking/service");
  // Pick the seeded "signature" service. The ServiceStep persists the
  // selection in the booking store. We can't drive the store directly
  // from Playwright, so seed it via sessionStorage before navigating to
  // /booking/master to stabilise the test.
  await page.evaluate(() => {
    sessionStorage.setItem(
      "violetta-booking",
      JSON.stringify({
        state: {
          serviceId: "signature",
          masterId: null,
          date: null,
          time: null,
        },
        version: 0,
      }),
    );
  });
  await page.goto("/en/booking/master");
  // The user may briefly visit /booking/master before MasterStep's
  // useEffect calls router.replace("/booking/date"). toHaveURL auto-
  // retries until the URL settles, so the assertion absorbs the bounce.
  // Do NOT assert that /booking/master is never visited.
  await expect(page).toHaveURL(/\/booking\/date(\?.*)?$/);
});

// Skipped until a second published master is seeded.
test.skip(true, "needs second-master seed");
test("master step shows the picker with two eligible masters", async ({
  page,
}) => {
  await page.goto("/en/booking/service");
  await page.getByRole("button", { name: /Signature/i }).click();
  await expect(page).toHaveURL(/\/booking\/master$/);
  await page.getByRole("button", { name: /Violetta/i }).click();
  await page.getByRole("link", { name: /next/i }).click();
  await expect(page).toHaveURL(/\/booking\/date$/);
});
