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
  it("renders three tier cards in canonical order", () => {
    renderPage();
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(3);
    expect(within(articles[0]).getByText("Petale")).toBeInTheDocument();
    expect(within(articles[1]).getByText("Violette")).toBeInTheDocument();
    expect(within(articles[2]).getByText("Atelier")).toBeInTheDocument();
  });

  it("marks the Violette tier as featured with the Most chosen tag", () => {
    renderPage();
    expect(screen.getByText(/Most chosen/i)).toBeInTheDocument();
  });

  it("shows monthly prices by default and switches to annual ×10", async () => {
    const user = userEvent.setup();
    renderPage();
    const violetteArticle = screen.getAllByRole("article")[1];
    expect(within(violetteArticle).getByText("€180")).toBeInTheDocument();
    expect(within(violetteArticle).getByText("/ month")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Annual/i }));
    expect(within(violetteArticle).getByText("€1800")).toBeInTheDocument();
    expect(within(violetteArticle).getByText("/ year")).toBeInTheDocument();
  });

  it("free tier renders Free instead of a price and a Stay free CTA", () => {
    renderPage();
    const petale = screen.getAllByRole("article")[0];
    expect(within(petale).getByText(/^Free$/)).toBeInTheDocument();
    expect(
      within(petale).getByRole("link", { name: /Stay free/i }),
    ).toBeInTheDocument();
  });

  it("paid tier CTAs interpolate the tier name", () => {
    renderPage();
    expect(
      screen.getByRole("link", { name: /Join Violette/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Join Atelier/i }),
    ).toBeInTheDocument();
  });
});
