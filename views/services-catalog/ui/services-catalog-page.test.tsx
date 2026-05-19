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
  usePathname: () => "/services",
}));

import { ServicesCatalogPage } from "./services-catalog-page";

function renderPage() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ServicesCatalogPage />
    </NextIntlClientProvider>,
  );
}

describe("ServicesCatalogPage", () => {
  it("renders the menu hero and all six services by default", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /^The menu\.$/ }),
    ).toBeInTheDocument();
    const ritualHeadings = screen.getAllByRole("heading", { level: 3 });
    expect(ritualHeadings).toHaveLength(6);
  });

  it("filters down to a single category when a chip is clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    const gelChip = screen.getByRole("tab", { name: /^Gel$/ });
    await user.click(gelChip);
    expect(gelChip).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
    ).toEqual(["Couture Gel"]);
  });

  it("restores the full list when All is reselected", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("tab", { name: /^Design$/ }));
    await user.click(screen.getByRole("tab", { name: /^All$/ }));
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6);
  });

  it("links each row to its service detail page", () => {
    renderPage();
    const link = screen.getByRole("link", { name: /Signature Manicure/i });
    expect(link).toHaveAttribute("href", "/services/signature");
  });

  it("plate numbers reflect the position within the filtered list", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("tab", { name: /^Care$/ }));
    // Three Care services: Signature, Spa Pedicure, Gentle Removal — plates 01/02/03
    const articles = screen.getAllByRole("article");
    expect(within(articles[0]).getByText("01")).toBeInTheDocument();
    expect(within(articles[1]).getByText("02")).toBeInTheDocument();
    expect(within(articles[2]).getByText("03")).toBeInTheDocument();
  });
});
