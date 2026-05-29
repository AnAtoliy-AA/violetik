import type { AnchorHTMLAttributes } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ResolvedPrice } from "@/entities/site-settings";
import messages from "@/messages/en.json";

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

import { StickyCta } from "./sticky-cta";

const resolved: ResolvedPrice = { base: 50, effective: 50, hasDiscount: false };

function wrap(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe("StickyCta", () => {
  it("formats the price in the active currency and locale", () => {
    render(
      wrap(
        <StickyCta
          serviceId="correction"
          resolvedPrice={resolved}
          currency="BYN"
          locale="be"
        />,
      ),
    );
    // The BYN price must not render with a hardcoded euro sign.
    expect(screen.queryByText(/€/)).toBeNull();
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it("defaults to EUR for legacy callers that omit currency", () => {
    render(wrap(<StickyCta serviceId="correction" resolvedPrice={resolved} />));
    expect(screen.getByText("€50")).toBeInTheDocument();
  });
});
