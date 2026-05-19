import { describe, it, expect, vi } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

const pathnameMock = vi.hoisted(() => ({ current: "/home" }));

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
  usePathname: () => pathnameMock.current,
}));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => true };
});

import { TabBar } from "./tab-bar";

function renderTabBar() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TabBar />
    </NextIntlClientProvider>,
  );
}

describe("TabBar", () => {
  it("renders four tab links in canonical order", () => {
    pathnameMock.current = "/home";
    renderTabBar();
    const nav = screen.getByRole("navigation");
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(4);
    expect(links[0]).toHaveAttribute("href", "/home");
    expect(links[1]).toHaveAttribute("href", "/services");
    expect(links[2]).toHaveAttribute("href", "/gallery");
    expect(links[3]).toHaveAttribute("href", "/profile");
  });

  it("marks the matching tab as aria-current when pathname matches", () => {
    pathnameMock.current = "/gallery";
    renderTabBar();
    const galleryLink = screen.getByRole("link", { current: "page" });
    expect(galleryLink).toHaveAttribute("href", "/gallery");
  });

  it("falls back to Home as active when no tab matches", () => {
    pathnameMock.current = "/services/some-id";
    renderTabBar();
    const active = screen.getByRole("link", { current: "page" });
    expect(active).toHaveAttribute("href", "/home");
  });
});
