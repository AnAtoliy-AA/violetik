import { describe, it, expect, vi } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { ServiceCard } from "@/entities/service";
import type { Service, ServiceCategoryRef } from "@/entities/service";
import {
  DEFAULT_SITE_SETTINGS,
  resolvePrice,
} from "@/entities/site-settings";

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
  useRouter: () => ({ replace: vi.fn() }),
}));

import { ServicesCatalogPage } from "./services-catalog-page";

const categories: ServiceCategoryRef[] = [
  { id: "care", name: "Care" },
  { id: "gel", name: "Gel" },
  { id: "design", name: "Design" },
  { id: "form", name: "Form" },
];

function makeService(
  id: string,
  categoryId: string,
  name: string,
  priceMajor: number,
  sortOrder: number,
): Service {
  const category = categories.find((c) => c.id === categoryId)!;
  return {
    id,
    category,
    name,
    blurb: `${name} blurb.`,
    includes: [],
    price: priceMajor,
    priceCents: priceMajor * 100,
    displayPrice: `€${priceMajor}`,
    duration: "75 min",
    durationMinutes: 75,
    sortOrder,
  };
}

const services: Service[] = [
  makeService("signature", "care", "Signature Manicure", 95, 1),
  makeService("gel", "gel", "Couture Gel", 145, 2),
  makeService("editorial", "design", "Editorial Art", 195, 3),
  makeService("extensions", "form", "Glass Extensions", 240, 4),
  makeService("pedi", "care", "Spa Pedicure", 110, 5),
  makeService("removal", "care", "Gentle Removal", 40, 6),
];

function renderPage() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ServicesCatalogPage services={services} categories={categories} />
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
    // Three Care services in fixture: Signature, Spa Pedicure, Gentle Removal — plates 01/02/03
    const articles = screen.getAllByRole("article");
    expect(within(articles[0]).getByText("01")).toBeInTheDocument();
    expect(within(articles[1]).getByText("02")).toBeInTheDocument();
    expect(within(articles[2]).getByText("03")).toBeInTheDocument();
  });
});

describe("ServiceCard <-> resolvePrice wiring", () => {
  it("renders <s>€base</s> alongside the discounted price when discount is active", () => {
    const settings = {
      ...DEFAULT_SITE_SETTINGS,
      discountPercent: 20,
      discountActive: true,
    };
    const gel = services.find((s) => s.id === "gel")!;
    const resolved = resolvePrice("service:gel", gel.price, settings);
    render(<ServiceCard service={gel} resolvedPrice={resolved} />);
    // 145 * 0.8 = 116
    expect(screen.getByText("€116")).toBeInTheDocument();
    expect(screen.getByText("€145").tagName).toBe("S");
  });
});
