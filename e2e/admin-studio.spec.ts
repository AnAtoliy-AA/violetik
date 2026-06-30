import { test, expect } from "@playwright/test";

// Mirrors e2e/admin-services.spec.ts and e2e/admin-masters.spec.ts.
// When TELEGRAM_BOT_TOKEN is unset (default CI + local dev), the
// /admin/* routes are open. Once the token lands, requireAdmin()
// activates and the route redirects to /sign-in — no admin fixture
// is wired yet.
test.skip(
  Boolean(process.env.TELEGRAM_BOT_TOKEN),
  "admin auth fixture not yet wired",
);

test("admin can configure the studio location and the home page reflects it", async ({
  page,
}) => {
  await page.goto("/en/admin/studio");

  await page.getByLabel(/city.*english/i).fill("Borisov");
  await page.getByLabel(/city.*russian/i).fill("Борисов");
  await page.getByLabel(/city.*belarusian/i).fill("Барысаў");
  await page.getByLabel(/latitude/i).fill("54.231");
  await page.getByLabel(/longitude/i).fill("28.491");

  // Show-map checkbox only enables once coords are filled.
  const showMap = page.getByRole("checkbox", { name: /show map/i });
  await expect(showMap).toBeEnabled();
  await showMap.check();

  await page.getByRole("button", { name: /save/i }).click();
  await expect(page.getByText(/saved/i)).toBeVisible();

  // `/en` is a /welcome redirect — the home (with the footer + map widget)
  // lives at `/en/home`.
  await page.goto("/en/home");
  await expect(
    page.getByRole("link", { name: /get directions/i }),
  ).toBeVisible();
  await expect(
    page.locator("iframe[src*='openstreetmap.org/export/embed.html']"),
  ).toBeVisible();
  // City appears in the address line.
  await expect(page.getByText(/Borisov/).first()).toBeVisible();
});
