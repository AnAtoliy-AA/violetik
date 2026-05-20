import { describe, it, expect, vi } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

import { MembershipPage } from "./membership-page";

function renderPage() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <MembershipPage />
    </NextIntlClientProvider>,
  );
}

describe("MembershipPage", () => {
  it("renders two tier cards in canonical order", () => {
    renderPage();
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(2);
    expect(within(articles[0]).getByText("Member")).toBeInTheDocument();
    expect(within(articles[1]).getByText("VIP")).toBeInTheDocument();
  });

  it("marks the VIP tier as featured with the Most chosen tag", () => {
    renderPage();
    expect(screen.getByText(/Most chosen/i)).toBeInTheDocument();
  });

  it("shows monthly prices by default and switches to annual ×10", async () => {
    const user = userEvent.setup();
    renderPage();
    const vipArticle = screen.getAllByRole("article")[1];
    expect(within(vipArticle).getByText("€180")).toBeInTheDocument();
    expect(within(vipArticle).getByText("/ month")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Annual/i }));
    expect(within(vipArticle).getByText("€1800")).toBeInTheDocument();
    expect(within(vipArticle).getByText("/ year")).toBeInTheDocument();
  });

  it("free tier renders Free instead of a price and a Stay free CTA", () => {
    renderPage();
    const memberCard = screen.getAllByRole("article")[0];
    expect(within(memberCard).getByText(/^Free$/)).toBeInTheDocument();
    expect(
      within(memberCard).getByRole("link", { name: /Stay free/i }),
    ).toBeInTheDocument();
  });

  it("paid tier CTAs interpolate the tier name", () => {
    renderPage();
    expect(
      screen.getByRole("link", { name: /Join VIP/i }),
    ).toBeInTheDocument();
  });
});
