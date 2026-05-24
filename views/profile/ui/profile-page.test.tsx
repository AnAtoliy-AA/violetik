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
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/db/vip-requests", () => ({
  getCurrentTier: vi.fn(),
}));

vi.mock("@/shared/lib/auth-server", () => ({
  getCurrentSessionUser: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/db/bookings", () => ({
  listUserBookings: vi.fn(),
  getBookingById: vi.fn(),
  cancelBookingIfOpen: vi.fn(),
}));

vi.mock("@/db/testimonials", () => ({
  listUserTestimonials: vi.fn(),
  createTestimonial: vi.fn(),
}));

vi.mock("@/db/masters", () => ({
  listPublishedMasters: vi.fn(),
  getMasterById: vi.fn(),
}));

vi.mock("@/db/site-settings", () => ({
  getSiteSettings: vi.fn(),
}));

vi.mock("@/db/google-tokens", () => ({
  getActiveGoogleToken: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/shared/lib/google-calendar", () => ({
  deleteCalendarEvent: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

vi.mock("@/entities/studio/api/load-with-photos", () => ({
  loadProfileWithPhoto: vi.fn(async () => ({
    name: "Lara K.",
    joined: 2024,
    palette: ["#d9a3b6", "#7d3a6f"] as const,
    avatar: undefined,
  })),
}));

vi.mock("@/db/services", () => ({
  listAllServices: vi.fn(async () => [
    {
      id: "gel",
      categoryId: "gel",
      nameEn: "Couture Gel",
      nameRu: "Кутюр-гель",
      nameBy: "Кутюр-гель",
      blurbEn: "",
      blurbRu: "",
      blurbBy: "",
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
      nameBy: "Сігнатурны манікюр",
      blurbEn: "",
      blurbRu: "",
      blurbBy: "",
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
      nameBy: "Эдыторыял-арт",
      blurbEn: "",
      blurbRu: "",
      blurbBy: "",
      includes: [],
      priceCents: 19500,
      durationMinutes: 150,
      sortOrder: 3,
      status: "published",
      createdAt: new Date(0),
      updatedAt: new Date(0),
      updatedBy: null,
    },
  ]),
}));

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentTier } from "@/db/vip-requests";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { listUserBookings } from "@/db/bookings";
import { listUserTestimonials } from "@/db/testimonials";
import { listPublishedMasters } from "@/db/masters";
import { getSiteSettings } from "@/db/site-settings";
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

function defaultSettings() {
  return {
    defaultPalette: "aubergine" as const,
    defaultLocale: "en" as const,
    priceOverrides: {},
    discountPercent: 0,
    discountActive: false,
    currency: "EUR" as const,
    addressEn: "",
    addressRu: "",
    addressBy: "",
    country: "BY",
    cityEn: "",
    cityRu: "",
    cityBy: "",
    timezone: "Europe/Minsk",
    latitude: null,
    longitude: null,
    mapVisible: false,
    telegramUsername: null,
    updatedAt: new Date(0).toISOString(),
  };
}

async function renderPage(locale = "en") {
  const t = makeT(en.Profile);
  const tLinks = makeT(en.Profile.quick_links);
  vi.mocked(getTranslations).mockImplementation(async (ns: unknown) => {
    if (ns === "Profile.quick_links") return tLinks as never;
    return t as never;
  });
  const page = await ProfilePage({ locale });
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {page}
    </NextIntlClientProvider>,
  );
}

function makeBooking(
  overrides: Partial<{
    id: string;
    userId: string;
    serviceId: string;
    masterId: string | null;
    scheduledFor: Date;
    durationMinutes: number;
    status: "pending" | "confirmed" | "completed" | "cancelled";
    gcalEventId: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    masterNameEn: string | null;
    masterNameRu: string | null;
    masterNameBy: string | null;
    masterTelegramUsername: string | null;
  }>,
) {
  return {
    id: "bk_1",
    userId: "u1",
    serviceId: "gel",
    masterId: "m1",
    scheduledFor: new Date(),
    durationMinutes: 120,
    status: "confirmed" as const,
    gcalEventId: null,
    notes: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    masterNameEn: "Violetta",
    masterNameRu: "Виолетта",
    masterNameBy: "Віалета",
    masterTelegramUsername: "violetta",
    ...overrides,
  };
}

const NOW_MS = Date.now();
const SIX_HOURS = 6 * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.mocked(getCurrentSessionUser).mockReset();
  vi.mocked(getCurrentTier).mockReset();
  vi.mocked(listUserBookings).mockReset();
  vi.mocked(listUserTestimonials).mockReset();
  vi.mocked(listPublishedMasters).mockReset();
  vi.mocked(getSiteSettings).mockReset();
  vi.mocked(redirect).mockClear();

  // Defaults: authenticated user, no tier, empty data.
  vi.mocked(getCurrentSessionUser).mockResolvedValue({
    id: "u1",
    telegramId: null,
    googleSub: null,
    email: null,
    username: "lara",
    firstName: "Lara",
    lastName: "K.",
    photoUrl: null,
    role: "customer",
    createdAt: new Date("2024-03-15T00:00:00Z"),
    lastSignInAt: null,
  } as never);
  vi.mocked(getCurrentTier).mockResolvedValue({ state: "member" });
  vi.mocked(listUserBookings).mockResolvedValue([]);
  vi.mocked(listUserTestimonials).mockResolvedValue([]);
  vi.mocked(listPublishedMasters).mockResolvedValue([
    {
      id: "m1",
      nameEn: "Violetta",
      nameRu: "Виолетта",
      nameBy: "Віалета",
      roleEn: "",
      roleRu: "",
      roleBy: "",
      bioEn: "",
      bioRu: "",
      bioBy: "",
      quoteEn: "",
      quoteRu: "",
      quoteBy: "",
      years: 10,
      setsLabel: "",
      telegramUsername: "violetta",
      sortOrder: 0,
      status: "published",
      createdAt: new Date(0),
      updatedAt: new Date(0),
    } as never,
  ]);
  vi.mocked(getSiteSettings).mockResolvedValue(defaultSettings() as never);
});

describe("ProfilePage", () => {
  it("renders VIP pill when current tier is vip", async () => {
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
    vi.mocked(getCurrentTier).mockResolvedValue({
      state: "member-pending",
      pendingRequestId: "vipreq_x",
    });
    await renderPage();
    expect(screen.getByText(/Pending VIP/i)).toBeInTheDocument();
    expect(screen.queryByText(/^VIP$/)).not.toBeInTheDocument();
  });

  it("renders no pill when current tier is member", async () => {
    await renderPage();
    expect(screen.queryByText(/^VIP$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pending VIP/i)).not.toBeInTheDocument();
  });

  it("renders the user's display name and joined year", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /Lara K\./ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Joined in 2024/)).toBeInTheDocument();
  });

  it("shows the soonest upcoming booking in the spotlight with a Telegram contact link (under 24h)", async () => {
    vi.mocked(listUserBookings).mockResolvedValue([
      makeBooking({
        id: "bk_soon",
        scheduledFor: new Date(NOW_MS + SIX_HOURS),
        serviceId: "gel",
      }),
      makeBooking({
        id: "bk_later",
        scheduledFor: new Date(NOW_MS + FORTY_EIGHT_HOURS),
        serviceId: "signature",
      }),
    ]);
    await renderPage();
    const card = screen.getByRole("article", { name: /Next visit/i });
    expect(within(card).getByText("Couture Gel")).toBeInTheDocument();
    const contactLink = within(card).getByRole("link", {
      name: /Contact Violetta on Telegram/i,
    });
    expect(contactLink).toHaveAttribute("href", "https://t.me/violetta");
    expect(
      within(card).queryByRole("button", { name: /Cancel visit/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the second-upcoming row with a Cancel button (>24h away)", async () => {
    vi.mocked(listUserBookings).mockResolvedValue([
      makeBooking({
        id: "bk_soon",
        scheduledFor: new Date(NOW_MS + SIX_HOURS),
        serviceId: "gel",
      }),
      makeBooking({
        id: "bk_later",
        scheduledFor: new Date(NOW_MS + FORTY_EIGHT_HOURS),
        serviceId: "signature",
      }),
    ]);
    await renderPage();
    expect(screen.getByText("Signature Manicure")).toBeInTheDocument();
    const cancelButtons = screen.getAllByRole("button", {
      name: /Cancel visit/i,
    });
    expect(cancelButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the empty-upcoming copy when there are no upcoming bookings", async () => {
    await renderPage();
    expect(screen.getByText(/No upcoming visits\./i)).toBeInTheDocument();
  });

  it("renders the history section with a past completed booking", async () => {
    vi.mocked(listUserBookings).mockResolvedValue([
      makeBooking({
        id: "bk_past",
        scheduledFor: new Date(NOW_MS - THIRTY_DAYS),
        status: "completed",
        serviceId: "editorial",
      }),
    ]);
    await renderPage();
    expect(screen.getByText("Editorial Art")).toBeInTheDocument();
  });

  it("renders the quick-links nav with all four entries", async () => {
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

  it("renders the testimonial form and the empty 'my testimonials' state", async () => {
    await renderPage();
    expect(
      screen.getByRole("button", { name: /^Submit$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Share a few words about a master\./i),
    ).toBeInTheDocument();
  });

  it("redirects unauthenticated visitors to the sign-in page", async () => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue(null);
    await expect(renderPage("en")).rejects.toThrow(
      "REDIRECT:/en/sign-in?callbackUrl=/en/profile",
    );
    expect(redirect).toHaveBeenCalledWith(
      "/en/sign-in?callbackUrl=/en/profile",
    );
  });
});
