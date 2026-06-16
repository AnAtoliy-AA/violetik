import { test, expect } from "@playwright/test";

test("/en/home emits canonical Open Graph + Twitter meta tags", async ({
  page,
}) => {
  await page.goto("/en/home");

  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    /Violetta/i,
  );
  // Tolerates both the static "private nail atelier" description and the
  // city-templated form (e.g. "Editorial nail design in Borisov…") that
  // Site.meta_description_with_city emits once the admin sets a city.
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    /nail (atelier|design)|beauty/i,
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

test("/by/home advertises Belarusian locale + description", async ({
  page,
}) => {
  await page.goto("/by/home");
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
    "content",
    "be_BY",
  );
  // Tolerates both the static "Прыватнае нэйл-атэлье" description and the
  // city-templated form ("Студыя дызайну пазногцяў…") once admin sets a city.
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    /Прыватнае нэйл-атэлье|Студыя дызайну пазногцяў/i,
  );
});

test("hreflang alternates link to every locale", async ({ page }) => {
  await page.goto("/en/home");
  // hreflang uses BCP-47 language tags via LOCALE_TO_LANG. The URL
  // prefix is the internal locale id ("by"), but the language tag
  // emitted in <link rel="alternate"> for that prefix is "be-BY".
  const PAIRS: ReadonlyArray<readonly [string, string]> = [
    ["en", "en"],
    ["ru", "ru"],
    ["by", "be-BY"],
  ];
  for (const [prefix, lang] of PAIRS) {
    await expect(
      page.locator(`link[rel="alternate"][hreflang="${lang}"]`),
    ).toHaveAttribute("href", new RegExp(`/${prefix}$`));
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
  const res = await request.get(new URL(url!).pathname);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/image\/png/);
});
