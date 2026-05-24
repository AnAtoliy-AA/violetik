import { describe, it, expect, vi } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

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
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn() }),
}));

import { AppHeader } from "./app-header";

const messages = {
  LocaleSwitcher: { label: "Language", en: "English", ru: "Russian", by: "Belarusian" },
};

function renderHeader(props?: React.ComponentProps<typeof AppHeader>) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AppHeader {...props} />
    </NextIntlClientProvider>,
  );
}

describe("AppHeader", () => {
  it("renders the wordmark and a labelled menu button", () => {
    renderHeader();
    expect(screen.getByText("Violetta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open menu/i })).toBeInTheDocument();
  });

  it("uses a custom ariaMenuLabel when provided", () => {
    renderHeader({ ariaMenuLabel: "Show navigation" });
    expect(
      screen.getByRole("button", { name: /show navigation/i }),
    ).toBeInTheDocument();
  });

  it("renders a back link instead of the wordmark when back is set", () => {
    renderHeader({ back: "/services" });
    expect(screen.queryByText("Violetta")).not.toBeInTheDocument();
    const back = screen.getByRole("link", { name: /go back/i });
    expect(back).toHaveAttribute("href", "/services");
  });

  it("uses a custom ariaBackLabel when provided", () => {
    renderHeader({ back: "/services", ariaBackLabel: "Back to catalog" });
    expect(
      screen.getByRole("link", { name: /back to catalog/i }),
    ).toBeInTheDocument();
  });

  it("centres a title when provided", () => {
    renderHeader({ title: "PLATE · 02" });
    expect(screen.getByText("PLATE · 02")).toBeInTheDocument();
  });

  it("allows replacing the menu button entirely via the menuButton slot", () => {
    renderHeader({
      menuButton: (
        <button type="button" aria-label="Custom action">
          Custom
        </button>
      ),
    });
    expect(
      screen.queryByRole("button", { name: /open menu/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /custom action/i }),
    ).toBeInTheDocument();
  });

  it("includes the LocaleSwitcher", () => {
    renderHeader();
    expect(screen.getByRole("radiogroup", { name: /language/i })).toBeInTheDocument();
  });
});
