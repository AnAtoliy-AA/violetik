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

test("voices section is hidden when no approved testimonials exist", async ({
  page,
}) => {
  // The STUDIO_DATA mock testimonials were removed when admin moderation
  // landed; voices now come from the DB and CI has none approved.
  // The section + its eyebrow ("Voices" EN / "Галасы" BE) should be absent.
  await page.goto("/en/master");
  await expect(page.getByText(/^Voices$/)).toHaveCount(0);
});

test("back arrow returns to /home", async ({ page }) => {
  await page.goto("/en/master");
  await expect(page.getByRole("link", { name: /Go back/i })).toHaveAttribute(
    "href",
    /\/home$/,
  );
});
