import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchBusyWindows } from "./free-busy";

describe("fetchBusyWindows", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("POSTs freeBusy and returns parsed Date windows", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          calendars: {
            primary: {
              busy: [
                { start: "2026-05-19T10:00:00Z", end: "2026-05-19T11:00:00Z" },
                { start: "2026-05-19T13:30:00Z", end: "2026-05-19T14:30:00Z" },
              ],
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const out = await fetchBusyWindows({
      calendarId: "primary",
      rangeStart: new Date("2026-05-19T00:00:00Z"),
      rangeEnd: new Date("2026-05-19T23:59:59Z"),
      accessToken: "ya29.x",
    });
    expect(out).toHaveLength(2);
    expect(out[0]!.start.toISOString()).toBe("2026-05-19T10:00:00.000Z");
    expect(out[1]!.end.toISOString()).toBe("2026-05-19T14:30:00.000Z");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://www.googleapis.com/calendar/v3/freeBusy");
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get("Authorization")).toBe("Bearer ya29.x");
  });

  it("returns [] when Google reports no busy windows", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ calendars: { primary: { busy: [] } } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const out = await fetchBusyWindows({
      calendarId: "primary",
      rangeStart: new Date(),
      rangeEnd: new Date(),
      accessToken: "x",
    });
    expect(out).toEqual([]);
  });

  it("throws on non-2xx", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("nope", { status: 500 }),
    );
    await expect(
      fetchBusyWindows({
        calendarId: "primary",
        rangeStart: new Date(),
        rangeEnd: new Date(),
        accessToken: "x",
      }),
    ).rejects.toThrow(/freeBusy.*500/);
  });
});
