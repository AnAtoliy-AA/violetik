import { test, expect } from "@playwright/test";

test("manifest.webmanifest serves valid PWA JSON", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/application\/manifest\+json|application\/json/);
  const body = await res.json();
  expect(body.name).toBe("Violetta Beauty");
  expect(body.short_name).toBe("Violetta");
  expect(body.display).toBe("standalone");
  expect(body.background_color).toBe("#100612");
  expect(body.theme_color).toBe("#100612");
  expect(Array.isArray(body.icons)).toBe(true);
  expect(body.icons.length).toBeGreaterThanOrEqual(1);
  expect(body.icons[0].src).toBe("/icon.svg");
  const icons: Array<{ src: string; purpose?: string; sizes?: string }> =
    body.icons;
  expect(
    icons.some((i) => i.src === "/icon-192.png" && i.sizes === "192x192"),
  ).toBe(true);
  expect(
    icons.some((i) => i.src === "/icon-512.png" && i.sizes === "512x512"),
  ).toBe(true);
  expect(icons.some((i) => i.purpose === "maskable")).toBe(true);
});

test("home page emits the manifest link + theme-color meta", async ({ page }) => {
  await page.goto("/en/home");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    /manifest\.webmanifest$/,
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#100612",
  );
});
