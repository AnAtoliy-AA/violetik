import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

const pathnameMock = vi.fn<() => string>(() => "/master/violetta");
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => pathnameMock(),
}));

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
  it("renders translated credit prefix and brand link on non-TabBar routes", () => {
    pathnameMock.mockReturnValue("/master/violetta");
    renderWithIntl(<SiteFooter />);
    expect(screen.getByText(/Created with Love by/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Arcadeum Games Studio/i });
    expect(link).toHaveAttribute("href", "https://arcadeum.games");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel") ?? "").toMatch(/noopener/);
  });

  it.each(["/home", "/services", "/gallery", "/profile"])(
    "hides itself on the TabBar route %s",
    (path) => {
      pathnameMock.mockReturnValue(path);
      const { container } = renderWithIntl(<SiteFooter />);
      expect(container.firstChild).toBeNull();
    },
  );
});
