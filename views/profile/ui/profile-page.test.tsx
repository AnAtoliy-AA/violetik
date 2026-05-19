import { describe, it, expect, vi } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { ProfilePage } from "./profile-page";

function renderPage() {
  return render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      <ProfilePage />
    </NextIntlClientProvider>,
  );
}

describe("ProfilePage", () => {
  it("renders the customer name, member tag, and joined year", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /Lara K\./ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Member · Violette/)).toBeInTheDocument();
    expect(screen.getByText(/Joined in 2024/)).toBeInTheDocument();
  });

  it("shows the next-visit card with the service name and countdown chip", () => {
    renderPage();
    const card = screen.getByRole("article", { name: /Next visit/i });
    expect(within(card).getByText("Couture Gel")).toBeInTheDocument();
    expect(within(card).getByText(/In 4 days/i)).toBeInTheDocument();
  });

  it("renders the quick-links nav with all four entries", () => {
    renderPage();
    const nav = screen.getByRole("navigation", { name: /Account links/i });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(4);
    expect(
      within(nav).getByRole("link", { name: /My bookings/i }),
    ).toHaveAttribute("href", "/booking/service");
    expect(
      within(nav).getByRole("link", { name: /Member card/i }),
    ).toHaveAttribute("href", "/membership");
  });

  it("renders four past visits with euro prices", () => {
    renderPage();
    const prices = screen.getAllByText(/^€\d+$/);
    expect(prices.length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("€95")).toBeInTheDocument();
    expect(screen.getByText("€195")).toBeInTheDocument();
    expect(screen.getByText("€110")).toBeInTheDocument();
  });
});
