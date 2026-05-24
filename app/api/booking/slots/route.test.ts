import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/google-tokens", () => ({
  getActiveGoogleToken: vi.fn(async () => null),
  updateLastRefresh: vi.fn(async () => undefined),
}));
vi.mock("@/db/bookings", () => ({
  listActiveBookingsFrom: vi.fn(async () => []),
}));

import { GET } from "./route";
import { slotCache } from "./cache";
import { getActiveGoogleToken } from "@/db/google-tokens";

describe("GET /api/booking/slots", () => {
  beforeEach(() => {
    slotCache.clear();
    vi.restoreAllMocks();
    vi.stubEnv("NEXT_PUBLIC_BOOKING_TIMEZONE", "Europe/Minsk");
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "sec");
  });

  it("falls back to static slots when no token row exists", async () => {
    vi.mocked(getActiveGoogleToken).mockResolvedValueOnce(null);
    const res = await GET(
      new Request(
        "https://x.test/api/booking/slots?date=2026-05-19&serviceId=signature",
      ),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { source: string; slots: string[] };
    expect(json.source).toBe("static");
    expect(json.slots.length).toBeGreaterThan(0);
    expect(json.slots[0]).toBe("10:00");
  });

  it("returns slots derived from freeBusy when a token exists", async () => {
    vi.mocked(getActiveGoogleToken).mockResolvedValueOnce({
      userId: "tg:1",
      email: "v@x",
      refreshToken: "1//y",
      calendarId: "primary",
      scope: "openid",
      connectedAt: new Date(),
      lastRefreshAt: new Date(Date.now() - 10 * 60_000),
    } as never);

    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "fresh",
            expires_in: 3599,
            scope: "openid",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            calendars: {
              primary: {
                busy: [
                  {
                    start: "2026-05-19T07:00:00Z",
                    end: "2026-05-19T08:00:00Z",
                  },
                ],
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const res = await GET(
      new Request(
        "https://x.test/api/booking/slots?date=2026-05-19&serviceId=signature",
      ),
    );
    const json = (await res.json()) as { source: string; slots: string[] };
    expect(json.source).toBe("gcal");
    expect(json.slots).not.toContain("10:00");
    expect(json.slots).toContain("11:00");
  });
});
