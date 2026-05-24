import { test, expect } from "@playwright/test";

test("renders the editorial 404 page on an unknown locale-scoped path", async ({
  page,
}) => {
  const response = await page.goto("/en/this-path-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: /not on the menu/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Return to the atelier/i }),
  ).toHaveAttribute("href", /\/en\/welcome$/);
});

test("404 page renders Belarusian copy at /be/*", async ({ page }) => {
  await page.goto("/be/missing-page");
  await expect(
    page.getByRole("heading", { level: 1, name: /няма ў меню/i }),
  ).toBeVisible();
});

test("sitemap.xml lists welcome and service-detail URLs for every locale", async ({
  request,
}) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  for (const locale of ["en", "ru", "by"]) {
    expect(xml).toContain(`/${locale}/welcome`);
    expect(xml).toContain(`/${locale}/services/signature`);
  }
  // Private routes excluded.
  expect(xml).not.toContain("/admin");
  expect(xml).not.toContain("/booking");
});

test("robots.txt disallows /admin and /booking, points at the sitemap", async ({
  request,
}) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/Disallow:.*\/admin/i);
  expect(body).toMatch(/Disallow:.*\/booking/i);
  expect(body).toMatch(/Sitemap:.*sitemap\.xml/i);
});
