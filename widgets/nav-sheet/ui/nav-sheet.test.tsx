import { describe, it, expect, vi } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
}));

import { NavSheet } from "./nav-sheet";

const messages = {
  Nav: {
    trigger_label: "Open navigation",
    close_label: "Close navigation",
    aria_label: "Atelier navigation",
    title: "Atelier",
    description: "Find a room, a ritual, or your own thread.",
    home: { label: "Home" },
    services: { label: "Menu" },
    gallery: { label: "Gallery" },
    masters: { label: "Masters" },
    membership: { label: "Membership" },
    book: { label: "Book a sitting" },
    profile: { label: "You" },
    notifications: { label: "Notifications" },
  },
};

function renderSheet() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <NavSheet />
    </NextIntlClientProvider>,
  );
}

describe("NavSheet", () => {
  it("renders a trigger with the correct aria label", () => {
    renderSheet();
    expect(
      screen.getByRole("button", { name: /open navigation/i }),
    ).toBeInTheDocument();
  });

  it("opens the sheet and shows every primary + visit destination", async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole("button", { name: /open navigation/i }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    for (const href of [
      "/home",
      "/services",
      "/gallery",
      "/master",
      "/membership",
      "/booking/service",
      "/profile",
      "/profile/notifications",
    ]) {
      expect(dialog.querySelector(`a[href="${href}"]`)).not.toBeNull();
    }
  });
});
