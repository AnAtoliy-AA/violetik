import type { AnchorHTMLAttributes } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { Service } from "@/entities/service";

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

import { PairsWellWith } from "./pairs-well-with";

function service(id: string, name: string, sortOrder: number): Service {
  return {
    id,
    category: { id: "gel", name: "Gel" },
    name,
    blurb: "",
    includes: [],
    price: 0,
    priceCents: 0,
    displayPrice: "€0",
    duration: "60 min",
    durationMinutes: 60,
    sortOrder,
  };
}

function renderWithIntl(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("PairsWellWith", () => {
  it("returns null when there are no pairs", () => {
    const { container } = renderWithIntl(<PairsWellWith pairs={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one tile per sibling with a link to that service", () => {
    renderWithIntl(
      <PairsWellWith
        pairs={[
          service("a", "First", 1),
          service("b", "Second", 2),
        ]}
      />,
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /First/ });
    expect(link).toHaveAttribute("href", "/services/a");
  });
});
