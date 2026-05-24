import { test, expect } from "@playwright/test";

// The profile page now requires a real session (replaces the previous
// mock-rendering pre-Task-15 behaviour). Playwright CI runs without
// TELEGRAM_BOT_TOKEN, so there's no sign-in fixture — v1 e2e covers
// only the anonymous-redirect contract. Authenticated-flow coverage
// lives at the unit + RTL layer (see views/profile/ui/profile-page.test.tsx).

test("anonymous visit to /en/profile redirects to /en/sign-in with callbackUrl", async ({
  page,
}) => {
  await page.goto("/en/profile");
  await expect(page).toHaveURL(/\/en\/sign-in/);
  expect(page.url()).toMatch(/callbackUrl=(\/en\/profile|%2Fen%2Fprofile)/);
});

test("anonymous visit to /by/profile redirects to /by/sign-in with callbackUrl", async ({
  page,
}) => {
  await page.goto("/by/profile");
  await expect(page).toHaveURL(/\/by\/sign-in/);
  expect(page.url()).toMatch(/callbackUrl=(\/by\/profile|%2Fby%2Fprofile)/);
});

test("legacy /be/* URL is 308-redirected to the /by equivalent", async ({
  page,
}) => {
  // Old bookmarks land here; the proxy redirects /be/* → /by/* with 308.
  // After the redirect, the unauthenticated /by/profile flow kicks in
  // and lands the user on /by/sign-in.
  await page.goto("/be/profile");
  await expect(page).toHaveURL(/\/by\/sign-in/);
});
