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

test("anonymous visit to /be/profile redirects to /be/sign-in with callbackUrl", async ({
  page,
}) => {
  await page.goto("/be/profile");
  await expect(page).toHaveURL(/\/be\/sign-in/);
  expect(page.url()).toMatch(/callbackUrl=(\/be\/profile|%2Fbe%2Fprofile)/);
});
