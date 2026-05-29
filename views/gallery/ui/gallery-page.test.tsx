import { describe, it, expect } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { vi } from "vitest";
import en from "@/messages/en.json";
import type { GalleryCategoryView, GalleryItemView } from "@/entities/gallery";

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
  usePathname: () => "/gallery",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => true };
});

import { GalleryPage } from "./gallery-page";
import { ToastProvider } from "@/shared/ui/toast";

const CATEGORIES: GalleryCategoryView[] = [
  { id: "editorial", name: "Editorial" },
  { id: "gel", name: "Gel" },
  { id: "chrome", name: "Chrome" },
  { id: "lace", name: "Lace" },
  { id: "bridal", name: "Bridal" },
];

const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

const ITEMS: GalleryItemView[] = [
  { id: "g1", categoryId: "chrome", categoryName: "Chrome", caption: null, palette: ["#c9a96e", "#7d3a6f"], h: 220 },
  { id: "g2", categoryId: "editorial", categoryName: "Editorial", caption: null, palette: ["#d9a3b6", "#1a0f1f"], h: 280 },
  { id: "g3", categoryId: "gel", categoryName: "Gel", caption: null, palette: ["#9d7bc7", "#3a2050"], h: 200 },
  { id: "g4", categoryId: "lace", categoryName: "Lace", caption: null, palette: ["#f3ead8", "#7d3a6f"], h: 260 },
  { id: "g5", categoryId: "chrome", categoryName: "Chrome", caption: null, palette: ["#e8cf99", "#2a1a30"], h: 240 },
  { id: "g6", categoryId: "editorial", categoryName: "Editorial", caption: null, palette: ["#7d3a6f", "#14091a"], h: 300 },
  { id: "g7", categoryId: "bridal", categoryName: "Bridal", caption: null, palette: ["#f3ead8", "#d9a3b6"], h: 220 },
  { id: "g8", categoryId: "gel", categoryName: "Gel", caption: null, palette: ["#9d7bc7", "#c9a96e"], h: 250 },
];

function renderPage() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastProvider>
        <GalleryPage categories={CATEGORIES} items={ITEMS} />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
}

function galleryCards() {
  return screen
    .getAllByRole("button")
    .filter((btn) =>
      CATEGORY_NAMES.includes(btn.getAttribute("aria-label") ?? ""),
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
    // Eyebrow inside the lightbox interpolates "Set NN · <category>"
    expect(within(dialog).getByText(/Set \d{2} ·/)).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /close/i }),
    ).toBeInTheDocument();
  });

  it("renders the empty state when there are no items", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ToastProvider>
          <GalleryPage categories={CATEGORIES} items={[]} />
        </ToastProvider>
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(en.Gallery.empty)).toBeInTheDocument();
  });
});
