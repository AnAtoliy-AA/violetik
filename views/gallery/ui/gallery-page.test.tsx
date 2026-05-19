import { describe, it, expect } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { vi } from "vitest";
import en from "@/messages/en.json";

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

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => true };
});

import { GalleryPage } from "./gallery-page";

const GALLERY_TAGS = ["Editorial", "Gel", "Chrome", "Lace", "Bridal"] as const;

function renderPage() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <GalleryPage />
    </NextIntlClientProvider>,
  );
}

function galleryCards() {
  return screen
    .getAllByRole("button")
    .filter((btn) =>
      (GALLERY_TAGS as readonly string[]).includes(
        btn.getAttribute("aria-label") ?? "",
      ),
    );
}

describe("GalleryPage", () => {
  it("renders all 8 gallery cards with the All filter active", () => {
    renderPage();
    expect(galleryCards()).toHaveLength(8);
  });

  it("filters to Chrome cards when the Chrome tab is selected", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("tab", { name: /^Chrome$/i }));
    const cards = galleryCards();
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.getAttribute("aria-label")).toBe("Chrome");
    }
  });

  it("opens a lightbox dialog when a card is clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(galleryCards()[0]);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // Eyebrow inside the lightbox interpolates "Set NN · <tag>"
    expect(within(dialog).getByText(/Set \d{2} ·/)).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /close/i }),
    ).toBeInTheDocument();
  });

});
