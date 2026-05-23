import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { SiteFooter } from "./site-footer";

const messages = {
  SiteFooter: { credit_prefix: "Created with Love by" },
};

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SiteFooter", () => {
  it("renders translated credit prefix and brand link", () => {
    renderWithIntl(<SiteFooter />);
    expect(screen.getByText(/Created with Love by/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Arcadeum Games Studio/i });
    expect(link).toHaveAttribute("href", "https://arcadeum.games");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel") ?? "").toMatch(/noopener/);
  });
});
