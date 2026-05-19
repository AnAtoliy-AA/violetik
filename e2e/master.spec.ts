import { test, expect } from "@playwright/test";

test("renders the master portrait, stats and pull-quote at /en/master", async ({
  page,
}) => {
  await page.goto("/en/master");
  await expect(
    page.getByRole("heading", { level: 1, name: /Violetta/i }),
  ).toBeVisible();
  await expect(page.getByText(/A manicure is the smallest piece/i)).toBeVisible();
  await expect(page.getByText("11")).toBeVisible(); // years stat
  await expect(page.getByText("600+")).toBeVisible(); // sets stat
  await expect(
    page.getByRole("link", { name: /Reserve with Violetta/i }),
  ).toHaveAttribute("href", /\/services$/);
});

test("renders the three voice cards", async ({ page }) => {
  await page.goto("/en/master");
  // Three testimonials from STUDIO_DATA: Lara K., Iris M., Joelle P.
  await expect(page.getByText("Lara K.")).toBeVisible();
  await expect(page.getByText("Iris M.")).toBeVisible();
  await expect(page.getByText("Joelle P.")).toBeVisible();
});

test("back arrow returns to /home", async ({ page }) => {
  await page.goto("/en/master");
  await expect(page.getByRole("link", { name: /Go back/i })).toHaveAttribute(
    "href",
    /\/home$/,
  );
});

test("renders Belarusian voices eyebrow at /be/master", async ({ page }) => {
  await page.goto("/be/master");
  await expect(page.getByText(/^Галасы$/)).toBeVisible();
});
