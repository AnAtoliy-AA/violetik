import { test, expect } from "@playwright/test";

// The auth gate only activates when TELEGRAM_BOT_TOKEN is set on the
// server. CI runs without it, so /admin stays open and the sign-in
// page shows the "not configured" notice — both states need to render
// without errors.

test("sign-in page renders the hero copy on /en/sign-in", async ({ page }) => {
  await page.goto("/en/sign-in");
  await expect(
    page.getByRole("heading", { level: 1, name: /Step inside/i }),
  ).toBeVisible();
  // Either the TG widget container OR the not-configured notice — one
  // of them must be present.
  const widget = page.locator("script[data-telegram-login]");
  const googleBtn = page.getByRole("button", { name: /continue with google/i });
  const notice = page.getByText(/SIGN-IN NOT YET CONFIGURED/i);
  await expect(widget.or(googleBtn).or(notice).first())
    .toBeVisible({ visible: true })
    .catch(async () => {
      const widgetCount = await widget.count();
      const googleCount = await googleBtn.count();
      const noticeCount = await notice.count();
      expect(widgetCount + googleCount + noticeCount).toBeGreaterThan(0);
    });
});

test("sign-in page renders Belarusian copy at /be/sign-in", async ({ page }) => {
  await page.goto("/be/sign-in");
  await expect(
    page.getByRole("heading", { level: 1, name: /Увайсці ў атэлье/i }),
  ).toBeVisible();
});

test("Auth.js handlers respond on /api/auth/session", async ({ request }) => {
  const res = await request.get("/api/auth/session");
  expect(res.status()).toBe(200);
  // Auth.js returns `null` when there's no active session (CI: no signed
  // payload), or a `{ user, expires }` object when there is one. Either
  // is a healthy response — what we want to catch is the 500 that
  // Auth.js throws when AUTH_SECRET is missing.
  const body = (await res.json()) as null | { user?: unknown };
  expect(body === null || typeof body === "object").toBe(true);
});
