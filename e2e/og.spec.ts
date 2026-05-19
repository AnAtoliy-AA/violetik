import { test, expect } from "@playwright/test";

test("/en/home emits canonical Open Graph + Twitter meta tags", async ({
  page,
}) => {
  await page.goto("/en/home");

  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    /Violetta/i,
  );
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    /private nail atelier/i,
  );
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
    "content",
    /Violetta Beauty/i,
  );
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
    "content",
    "en_US",
  );
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute(
    "content",
    /opengraph-image/,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  await expect(page.locator('link[rel="icon"]').first()).toBeAttached();
});

test("/be/home advertises Belarusian locale + description", async ({
  page,
}) => {
  await page.goto("/be/home");
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
    "content",
    "be_BY",
  );
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    /Прыватнае нэйл-атэлье/i,
  );
});

test("hreflang alternates link to every locale", async ({ page }) => {
  await page.goto("/en/home");
  for (const locale of ["en", "ru", "be"]) {
    await expect(
      page.locator(`link[rel="alternate"][hreflang="${locale}"]`),
    ).toHaveAttribute("href", new RegExp(`/${locale}$`));
  }
});

test("the dynamic OG image responds with image/png", async ({
  page,
  request,
}) => {
  await page.goto("/en/home");
  const url = await page
    .locator('meta[property="og:image"]')
    .first()
    .getAttribute("content");
  expect(url).toBeTruthy();
  const res = await request.get(url!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/image\/png/);
});
