import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
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
  usePathname: () => "/profile",
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(),
  getLocale: vi.fn(),
}));

vi.mock("@/db/vip-requests", () => ({
  getCurrentTier: vi.fn(),
}));

vi.mock("@/shared/lib/auth-server", () => ({
  getCurrentSessionUser: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/db/services", () => ({
  listAllServices: vi.fn(async () => [
    {
      id: "gel",
      categoryId: "gel",
      nameEn: "Couture Gel",
      nameRu: "Кутюр-гель",
      nameBe: "Кутюр-гель",
      blurbEn: "",
      blurbRu: "",
      blurbBe: "",
      includes: [],
      priceCents: 14500,
      durationMinutes: 120,
      sortOrder: 2,
      status: "published",
      createdAt: new Date(0),
      updatedAt: new Date(0),
      updatedBy: null,
    },
    {
      id: "signature",
      categoryId: "care",
      nameEn: "Signature Manicure",
      nameRu: "Сигнатурный маникюр",
      nameBe: "Сігнатурны манікюр",
      blurbEn: "",
      blurbRu: "",
      blurbBe: "",
      includes: [],
      priceCents: 9500,
      durationMinutes: 75,
      sortOrder: 1,
      status: "published",
      createdAt: new Date(0),
      updatedAt: new Date(0),
      updatedBy: null,
    },
    {
      id: "editorial",
      categoryId: "design",
      nameEn: "Editorial Art",
      nameRu: "Эдиториал-арт",
      nameBe: "Эдыторыял-арт",
      blurbEn: "",
      blurbRu: "",
      blurbBe: "",
      includes: [],
      priceCents: 19500,
      durationMinutes: 150,
      sortOrder: 3,
      status: "published",
      createdAt: new Date(0),
      updatedAt: new Date(0),
      updatedBy: null,
    },
    {
      id: "pedi",
      categoryId: "care",
      nameEn: "Spa Pedicure",
      nameRu: "Спа-педикюр",
      nameBe: "Спа-педыкюр",
      blurbEn: "",
      blurbRu: "",
      blurbBe: "",
      includes: [],
      priceCents: 11000,
      durationMinutes: 90,
      sortOrder: 5,
      status: "published",
      createdAt: new Date(0),
      updatedAt: new Date(0),
      updatedBy: null,
    },
  ]),
}));

import { getTranslations, getLocale } from "next-intl/server";
import { getCurrentTier } from "@/db/vip-requests";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { ProfilePage } from "./profile-page";

function makeT(messages: Record<string, unknown>) {
  function t(key: string, params?: Record<string, string | number>): string {
    const val = (messages as Record<string, string>)[key] ?? key;
    if (!params) return val;
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      val,
    );
  }
  return t;
}

async function renderPage() {
  const t = makeT(en.Profile);
  const tCountdown = makeT(en.Profile.countdown);
  const tLinks = makeT(en.Profile.quick_links);
  vi.mocked(getTranslations).mockImplementation(async (ns: unknown) => {
    if (ns === "Profile.countdown") return tCountdown as never;
    if (ns === "Profile.quick_links") return tLinks as never;
    return t as never;
  });
  vi.mocked(getLocale).mockResolvedValue("en");
  const page = await ProfilePage();
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {page}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(getCurrentSessionUser).mockReset();
  vi.mocked(getCurrentTier).mockReset();
});

describe("ProfilePage", () => {
  it("renders VIP pill when current tier is vip", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(getCurrentTier).mockResolvedValue({
      state: "vip",
      activeRequestId: "vipreq_a",
      expiresAt: new Date("2027-01-01T00:00:00Z"),
    });
    await renderPage();
    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.queryByText(/Pending VIP/i)).not.toBeInTheDocument();
  });

  it("renders Pending VIP pill when current tier is member-pending", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(getCurrentTier).mockResolvedValue({
      state: "member-pending",
      pendingRequestId: "vipreq_x",
    });
    await renderPage();
    expect(screen.getByText(/Pending VIP/i)).toBeInTheDocument();
    expect(screen.queryByText(/^VIP$/)).not.toBeInTheDocument();
  });

  it("renders no pill when current tier is member", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(getCurrentTier).mockResolvedValue({ state: "member" });
    await renderPage();
    expect(screen.queryByText(/^VIP$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pending VIP/i)).not.toBeInTheDocument();
  });

  it("renders the customer name and joined year", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /Lara K\./ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Joined in 2024/)).toBeInTheDocument();
  });

  it("shows the next-visit card with the service name and countdown chip", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
    await renderPage();
    const card = screen.getByRole("article", { name: /Next visit/i });
    expect(within(card).getByText("Couture Gel")).toBeInTheDocument();
    expect(within(card).getByText(/In 4 days/i)).toBeInTheDocument();
  });

  it("renders the quick-links nav with all four entries", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
    await renderPage();
    const nav = screen.getByRole("navigation", { name: /Account links/i });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(4);
    expect(
      within(nav).getByRole("link", { name: /My bookings/i }),
    ).toHaveAttribute("href", "/booking/service");
    expect(
      within(nav).getByRole("link", { name: /Member card/i }),
    ).toHaveAttribute("href", "/membership");
  });

  it("renders four past visits with euro prices", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
    await renderPage();
    const prices = screen.getAllByText(/^€\d+$/);
    expect(prices.length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("€95")).toBeInTheDocument();
    expect(screen.getByText("€195")).toBeInTheDocument();
    expect(screen.getByText("€110")).toBeInTheDocument();
  });
});
