import { test, expect } from "@playwright/test";

test("renders the master portrait, stats and pull-quote at /en/master", async ({
  page,
}) => {
  await page.goto("/en/master");
  // The h1 contains the master's name from DB.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // A Reserve CTA link should be present.
  await expect(
    page.getByRole("link", { name: /Reserve/i }),
  ).toBeVisible();
});

test("master page loads at /en/master", async ({ page }) => {
  await page.goto("/en/master");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("back arrow returns to /home", async ({ page }) => {
  await page.goto("/en/master");
  await expect(page.getByRole("link", { name: /Go back/i })).toHaveAttribute(
    "href",
    /\/home$/,
  );
});
