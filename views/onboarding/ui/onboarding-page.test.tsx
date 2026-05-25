import { describe, it, expect, vi } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

// next-intl's createNavigation pulls in next/navigation, which Vitest's
// jsdom project can't resolve under ESM. Stub the locale-aware Link with
// a plain anchor — routing isn't what these tests are exercising.
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

import { OnboardingPage } from "./onboarding-page";

function renderWithIntl() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <OnboardingPage />
    </NextIntlClientProvider>,
  );
}

describe("OnboardingPage", () => {
  it("starts on the first slide and shows the Forward button", () => {
    renderWithIntl();
    expect(screen.getByText("A studio of one")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Forward$/i }),
    ).toBeInTheDocument();
  });

  it("advances slides and swaps the CTA to Step inside on the last one", async () => {
    const user = userEvent.setup();
    renderWithIntl();
    await user.click(screen.getByRole("button", { name: /^Forward$/i }));
    expect(screen.getByText("Designed like couture")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Forward$/i }));
    expect(screen.getByText("Yours, by appointment")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Forward$/i })).toBeNull();
    expect(
      screen.getByRole("link", { name: /^Step inside$/i }),
    ).toBeInTheDocument();
  });

  it("allows jumping to a specific slide via the dot indicator", async () => {
    const user = userEvent.setup();
    renderWithIntl();
    const dots = screen.getAllByRole("tab");
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute("aria-selected", "true");
    await user.click(dots[2]);
    expect(dots[2]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Yours, by appointment")).toBeInTheDocument();
  });

  it("Skip-equivalent link points at /home", () => {
    renderWithIntl();
    expect(
      screen.getByRole("link", { name: /^Take me home$/i }),
    ).toHaveAttribute("href", "/home");
  });
});
