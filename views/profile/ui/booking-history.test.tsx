import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

import { getTranslations } from "next-intl/server";
import { listUserBookings } from "@/db/bookings";
import { BookingHistory } from "./booking-history";

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

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const NOW_MS = Date.now();

async function renderHistory(locale = "en") {
  vi.mocked(getTranslations).mockResolvedValue(makeT(en.Profile) as never);
  const tree = await BookingHistory({ userId: "u1", locale });
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

describe("BookingHistory", () => {
  it("renders the history section with a past completed booking", async () => {
    vi.mocked(listUserBookings).mockResolvedValue([
      {
        id: "bk_past",
        userId: "u1",
        serviceId: "editorial",
        masterId: "m1",
        scheduledFor: new Date(NOW_MS - THIRTY_DAYS),
        durationMinutes: 150,
        status: "completed",
        gcalEventId: null,
        notes: null,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        masterNameEn: "Violetta",
        masterNameRu: "Виолетта",
        masterNameBy: "Віалета",
        masterTelegramUsername: "violetta",
      },
    ]);
    await renderHistory();
    expect(screen.getByText("Editorial Art")).toBeInTheDocument();
  });

  it("renders the empty-history copy when there are no completed bookings", async () => {
    await renderHistory();
    expect(screen.getByText(/No past visits yet/i)).toBeInTheDocument();
  });
});
