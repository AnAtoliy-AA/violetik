import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";

vi.mock("../api/actions", () => ({
  submitVipRequest: vi.fn(),
  cancelVipRequest: vi.fn(),
}));

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

import { VipCardCta } from "./vip-card-cta";

describe("VipCardCta", () => {
  it("visitor state shows a sign-in link with next=/membership", () => {
    render(
      <VipCardCta
        state={{ kind: "visitor", locale: "en" }}
        labels={{
          signIn: "Sign in to apply",
          join: "Join VIP",
          cancel: "Cancel request",
          youreVip: "You're a VIP",
        }}
      />,
    );
    const link = screen.getByRole("link", { name: /sign in to apply/i });
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("/sign-in?next=/membership"),
    );
  });

  it("member state shows a Join VIP submit button", () => {
    render(
      <VipCardCta
        state={{ kind: "member" }}
        labels={{
          signIn: "Sign in",
          join: "Join VIP",
          cancel: "Cancel request",
          youreVip: "You're a VIP",
        }}
      />,
    );
    expect(
      screen.getByRole("button", { name: /join vip/i }),
    ).toBeInTheDocument();
  });

  it("pending state shows a Cancel request button", () => {
    render(
      <VipCardCta
        state={{ kind: "pending" }}
        labels={{
          signIn: "Sign in",
          join: "Join VIP",
          cancel: "Cancel request",
          youreVip: "You're a VIP",
        }}
      />,
    );
    expect(
      screen.getByRole("button", { name: /cancel request/i }),
    ).toBeInTheDocument();
  });

  it("vip state shows a disabled label with expiry", () => {
    render(
      <VipCardCta
        state={{ kind: "vip", expiresAt: new Date("2026-07-01T00:00:00Z") }}
        labels={{
          signIn: "Sign in",
          join: "Join VIP",
          cancel: "Cancel request",
          youreVip: "You're a VIP",
        }}
      />,
    );
    expect(screen.getByText(/you're a vip/i)).toBeInTheDocument();
  });
});
