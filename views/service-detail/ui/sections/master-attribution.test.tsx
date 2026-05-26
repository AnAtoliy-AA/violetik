import type { AnchorHTMLAttributes } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { Master } from "@/entities/master";

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

import { MasterAttribution } from "./master-attribution";

const master: Master = {
  id: "violetta",
  name: "Violetta",
  role: "Atelier master",
  bio: "",
  quote: "",
  years: 12,
  setsLabel: "1200 sets",
  sortOrder: 1,
  status: "published",
  serviceIds: ["sculpture"],
  telegramUsername: null,
};

function renderWithIntl(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("MasterAttribution", () => {
  it("renders master name, role, and a 'Reserve with V.' CTA pointing to booking", () => {
    renderWithIntl(
      <MasterAttribution master={master} serviceId="sculpture" />,
    );
    expect(screen.getByText("Violetta")).toBeInTheDocument();
    expect(screen.getByText("Atelier master")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /Reserve with V\./ });
    expect(cta).toHaveAttribute(
      "href",
      "/booking/service?selected=sculpture",
    );
  });
});
