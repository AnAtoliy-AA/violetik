import { test, expect } from "@playwright/test";

test("renders the Signature Manicure detail at /en/services/signature", async ({
  page,
}) => {
  await page.goto("/en/services/signature");
  await expect(
    page.getByRole("heading", { level: 1, name: /Signature Manicure/i }),
  ).toBeVisible();
  await expect(page.getByText(/What it includes/i)).toBeVisible();
  await expect(page.getByText(/Recent in this style/i)).toBeVisible();
});

test("Reserve a chair link routes to /booking/service with the selected id", async ({
  page,
}) => {
  await page.goto("/en/services/gel");
  const cta = page.getByRole("link", { name: /Reserve a chair/i });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute(
    "href",
    /\/booking\/service\?selected=gel/,
  );
});

test("back arrow returns to the catalog", async ({ page }) => {
  await page.goto("/en/services/editorial");
  const back = page.getByRole("link", { name: /Go back/i });
  await expect(back).toHaveAttribute("href", /\/services$/);
});

test("renders the Belarusian copy at /be/services/signature", async ({ page }) => {
  await page.goto("/be/services/signature");
  await expect(page.getByText(/Што ўваходзіць/i)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Забраніраваць крэсла/i }),
  ).toBeVisible();
});

test("unknown service id returns 404", async ({ page }) => {
  const response = await page.goto("/en/services/does-not-exist");
  expect(response?.status()).toBe(404);
});
