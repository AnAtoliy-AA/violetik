import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/auth-server", () => ({
  getCurrentSessionUser: vi.fn(),
}));
vi.mock("@/db/bookings", () => ({
  getBookingById: vi.fn(),
  cancelBookingIfOpen: vi.fn(),
}));
vi.mock("@/db/google-tokens", () => ({
  getActiveGoogleToken: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/shared/lib/google-calendar", () => ({
  deleteCalendarEvent: vi.fn(),
  refreshAccessToken: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { cancelBookingAction } from "./cancel-booking-action";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { getBookingById, cancelBookingIfOpen } from "@/db/bookings";
import { getActiveGoogleToken } from "@/db/google-tokens";
import {
  deleteCalendarEvent,
  refreshAccessToken,
} from "@/shared/lib/google-calendar";
import { revalidatePath } from "next/cache";
import type { Booking } from "@/db/schema";

const mockGetSession = vi.mocked(getCurrentSessionUser);
const mockGetBooking = vi.mocked(getBookingById);
const mockCancelIfOpen = vi.mocked(cancelBookingIfOpen);
const mockGetGoogleToken = vi.mocked(getActiveGoogleToken);
const mockRefresh = vi.mocked(refreshAccessToken);
const mockDeleteEvent = vi.mocked(deleteCalendarEvent);
const mockRevalidate = vi.mocked(revalidatePath);

function aBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "bk_1",
    userId: "tg:1",
    serviceId: "svc",
    masterId: null,
    scheduledFor: new Date(Date.now() + 48 * 60 * 60 * 1000),
    durationMinutes: 60,
    status: "confirmed",
    gcalEventId: null,
    notes: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("cancelBookingAction", () => {
  it("rejects unauthenticated callers", async () => {
    mockGetSession.mockResolvedValue(null);
    const out = await cancelBookingAction("bk_1");
    expect(out).toEqual({ ok: false, reason: "unauthenticated" });
  });

  it("returns not_found when the booking is missing", async () => {
    mockGetSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetBooking.mockResolvedValue(null);
    const out = await cancelBookingAction("bk_nope");
    expect(out).toEqual({ ok: false, reason: "not_found" });
  });

  it("rejects when the caller is not the booking owner", async () => {
    mockGetSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetBooking.mockResolvedValue(aBooking({ userId: "tg:other" }));
    const out = await cancelBookingAction("bk_1");
    expect(out).toEqual({ ok: false, reason: "not_owner" });
  });

  it("rejects when the booking is already cancelled", async () => {
    mockGetSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetBooking.mockResolvedValue(aBooking({ status: "cancelled" }));
    const out = await cancelBookingAction("bk_1");
    expect(out).toEqual({ ok: false, reason: "already_cancelled" });
  });

  it("rejects when the booking is already completed", async () => {
    mockGetSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetBooking.mockResolvedValue(aBooking({ status: "completed" }));
    const out = await cancelBookingAction("bk_1");
    expect(out).toEqual({ ok: false, reason: "already_cancelled" });
  });

  it("rejects with too_late inside the 24h window", async () => {
    mockGetSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetBooking.mockResolvedValue(
      aBooking({
        scheduledFor: new Date(Date.now() + 12 * 60 * 60 * 1000),
      }),
    );
    const out = await cancelBookingAction("bk_1");
    expect(out).toEqual({ ok: false, reason: "too_late" });
  });

  it("succeeds for an open booking >24h away (no GCal event) and revalidates", async () => {
    mockGetSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetBooking.mockResolvedValue(aBooking());
    mockCancelIfOpen.mockResolvedValue(aBooking({ status: "cancelled" }));
    const out = await cancelBookingAction("bk_1");
    expect(out).toEqual({ ok: true });
    expect(mockCancelIfOpen).toHaveBeenCalledWith("bk_1");
    expect(mockRevalidate).toHaveBeenCalledWith("/", "layout");
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it("attempts GCal cleanup when the cancelled row has a gcalEventId", async () => {
    process.env.GOOGLE_CLIENT_ID = "cid";
    process.env.GOOGLE_CLIENT_SECRET = "csec";
    mockGetSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetBooking.mockResolvedValue(aBooking({ gcalEventId: "evt_1" }));
    mockCancelIfOpen.mockResolvedValue(
      aBooking({ status: "cancelled", gcalEventId: "evt_1" }),
    );
    mockGetGoogleToken.mockResolvedValue({
      userId: "tg:1",
      email: "a@example.com",
      refreshToken: "rt",
      calendarId: "cal",
      scope: "events",
      connectedAt: new Date(0),
      lastRefreshAt: null,
    });
    mockRefresh.mockResolvedValue({
      accessToken: "at",
      expiresAt: new Date(Date.now() + 3600_000),
    } as never);
    mockDeleteEvent.mockResolvedValue(undefined);

    const out = await cancelBookingAction("bk_1");
    expect(out).toEqual({ ok: true });
    expect(mockDeleteEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "evt_1", calendarId: "cal", accessToken: "at" }),
    );
  });

  it("still returns ok:true when GCal cleanup throws (best-effort)", async () => {
    process.env.GOOGLE_CLIENT_ID = "cid";
    process.env.GOOGLE_CLIENT_SECRET = "csec";
    mockGetSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetBooking.mockResolvedValue(aBooking({ gcalEventId: "evt_1" }));
    mockCancelIfOpen.mockResolvedValue(
      aBooking({ status: "cancelled", gcalEventId: "evt_1" }),
    );
    mockGetGoogleToken.mockResolvedValue({
      userId: "tg:1",
      email: "a@example.com",
      refreshToken: "rt",
      calendarId: "cal",
      scope: "events",
      connectedAt: new Date(0),
      lastRefreshAt: null,
    });
    mockRefresh.mockRejectedValue(new Error("network"));

    const out = await cancelBookingAction("bk_1");
    expect(out).toEqual({ ok: true });
  });

  it("returns already_cancelled when the conditional update affects zero rows (race)", async () => {
    mockGetSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetBooking.mockResolvedValue(aBooking());
    mockCancelIfOpen.mockResolvedValue(null);
    const out = await cancelBookingAction("bk_1");
    expect(out).toEqual({ ok: false, reason: "already_cancelled" });
  });
});
