import { it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/bookings", () => ({
  listPendingBookingsWithGcalEvent: vi.fn(),
  setBookingStatus: vi.fn(),
}));
vi.mock("@/db/google-tokens", () => ({
  getActiveGoogleToken: vi.fn(),
  updateLastRefresh: vi.fn(),
}));
vi.mock("@/shared/lib/google-calendar", () => ({
  getCalendarEvent: vi.fn(),
  refreshAccessToken: vi.fn(),
}));
vi.mock("@/shared/lib/notifications", () => ({
  dispatchNotification: vi.fn(),
}));

import { GET } from "./route";
import {
  listPendingBookingsWithGcalEvent,
  setBookingStatus,
} from "@/db/bookings";
import { getActiveGoogleToken } from "@/db/google-tokens";
import {
  getCalendarEvent,
  refreshAccessToken,
} from "@/shared/lib/google-calendar";

const ORIGINAL_ENV = process.env;
beforeEach(() => {
  vi.resetAllMocks();
  process.env = { ...ORIGINAL_ENV, NODE_ENV: "development" };
});

function makeReq(headers: Record<string, string> = {}): Request {
  return new Request("https://x/api/cron/booking-gcal-sync", { headers });
}

const makeBooking = (overrides: Record<string, unknown> = {}) => ({
  id: "bk_1",
  userId: "u_1",
  gcalEventId: "evt_1",
  serviceId: "svc_1",
  masterId: "m_1",
  scheduledFor: new Date("2026-06-01T10:00:00Z"),
  durationMinutes: 60,
  status: "pending" as const,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeToken = () => ({
  userId: "admin",
  email: "admin@example.com",
  refreshToken: "r",
  calendarId: "primary",
  scope: "calendar",
  connectedAt: new Date(),
  lastRefreshAt: null,
});

it("returns 401 in production without the cron secret", async () => {
  process.env = { ...ORIGINAL_ENV, NODE_ENV: "production", CRON_SECRET: "s" };
  const res = await GET(makeReq());
  expect(res.status).toBe(401);
});

it("confirms a booking whose event is confirmed", async () => {
  vi.mocked(listPendingBookingsWithGcalEvent).mockResolvedValue([
    makeBooking(),
  ]);
  vi.mocked(getActiveGoogleToken).mockResolvedValue(makeToken());
  vi.mocked(refreshAccessToken).mockResolvedValue({
    accessToken: "tok",
    expiresIn: 3600,
    scope: "calendar",
  });
  vi.mocked(getCalendarEvent).mockResolvedValue({ status: "confirmed" });

  const res = await GET(makeReq());
  const json = await res.json();
  expect(setBookingStatus).toHaveBeenCalledWith("bk_1", "confirmed");
  expect(json.confirmed).toBe(1);
});

it("leaves a tentative event pending", async () => {
  vi.mocked(listPendingBookingsWithGcalEvent).mockResolvedValue([
    makeBooking({ scheduledFor: new Date() }),
  ]);
  vi.mocked(getActiveGoogleToken).mockResolvedValue(makeToken());
  vi.mocked(refreshAccessToken).mockResolvedValue({
    accessToken: "tok",
    expiresIn: 3600,
    scope: "calendar",
  });
  vi.mocked(getCalendarEvent).mockResolvedValue({ status: "tentative" });

  const res = await GET(makeReq());
  const json = await res.json();
  expect(setBookingStatus).not.toHaveBeenCalled();
  expect(json.confirmed).toBe(0);
});
