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
  Nav: {
    trigger_label: "Open menu",
    aria_label: "Atelier navigation",
    title: "Atelier",
    description: "Navigate the studio.",
    home: { label: "Home" },
    services: { label: "Menu" },
    gallery: { label: "Gallery" },
    masters: { label: "Masters" },
    membership: { label: "Membership" },
    book: { label: "Book" },
    profile: { label: "You" },
    notifications: { label: "Notifications" },
  },
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

  it("renders nodes passed via the actions slot", () => {
    renderHeader({
      actions: (
        <button type="button" aria-label="Refresh">
          Refresh
        </button>
      ),
    });
    expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
  });

  it("places actions before the locale switcher", () => {
    renderHeader({
      actions: (
        <button type="button" aria-label="Refresh">
          Refresh
        </button>
      ),
    });
    const refresh = screen.getByRole("button", { name: /refresh/i });
    const lang = screen.getByRole("radiogroup", { name: /language/i });
    expect(
      refresh.compareDocumentPosition(lang) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
