import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(),
}));

vi.mock("@/db/bookings", () => ({
  listUserBookings: vi.fn(async () => []),
  getBookingById: vi.fn(),
  cancelBookingIfOpen: vi.fn(),
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
  ]),
}));

vi.mock("@/db/site-settings", () => ({
  getSiteSettings: vi.fn(async () => ({
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
  })),
}));

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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

import { getTranslations } from "next-intl/server";
import { listUserBookings } from "@/db/bookings";
import { UpcomingBookings } from "./upcoming-bookings";

function makeT(messages: Record<string, unknown>) {
  return (key: string, params?: Record<string, string | number>): string => {
    const val = (messages as Record<string, string>)[key] ?? key;
    if (!params) return val;
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      val,
    );
  };
}

function makeBooking(over: Record<string, unknown> = {}) {
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
    ...over,
  };
}

const NOW_MS = Date.now();
const SIX_HOURS = 6 * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

async function renderUpcoming(locale = "en") {
  vi.mocked(getTranslations).mockResolvedValue(makeT(en.Profile) as never);
  const tree = await UpcomingBookings({ userId: "u1", locale });
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {tree}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(listUserBookings).mockReset();
  vi.mocked(listUserBookings).mockResolvedValue([]);
});

describe("UpcomingBookings", () => {
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
    await renderUpcoming();
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
    await renderUpcoming();
    expect(screen.getByText("Signature Manicure")).toBeInTheDocument();
    const cancelButtons = screen.getAllByRole("button", {
      name: /Cancel visit/i,
    });
    expect(cancelButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the empty-upcoming copy when there are no upcoming bookings", async () => {
    await renderUpcoming();
    expect(screen.getByText(/No upcoming visits\./i)).toBeInTheDocument();
  });
});
