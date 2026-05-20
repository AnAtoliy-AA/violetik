import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCalendarEvent, deleteCalendarEvent } from "./events";

describe("createCalendarEvent", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("POSTs to the events endpoint and returns the new event id", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "evt-abc" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const start = new Date("2026-05-19T08:00:00Z");
    const end = new Date("2026-05-19T09:15:00Z");
    const eventId = await createCalendarEvent({
      calendarId: "primary",
      accessToken: "ya29.x",
      summary: "Signature Manicure · v@example.com",
      start,
      end,
      timeZone: "Europe/Minsk",
      description: "Booking bk_1",
    });
    expect(eventId).toBe("evt-abc");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    );
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get("Authorization")).toBe("Bearer ya29.x");
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.summary).toBe("Signature Manicure · v@example.com");
    expect(body.start).toEqual({
      dateTime: start.toISOString(),
      timeZone: "Europe/Minsk",
    });
    expect(body.end).toEqual({
      dateTime: end.toISOString(),
      timeZone: "Europe/Minsk",
    });
  });

  it("throws on non-2xx", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("forbidden", { status: 403 }),
    );
    await expect(
      createCalendarEvent({
        calendarId: "primary",
        accessToken: "x",
        summary: "x",
        start: new Date(),
        end: new Date(),
        timeZone: "UTC",
      }),
    ).rejects.toThrow(/events insert.*403/);
  });
});

describe("deleteCalendarEvent", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("DELETEs the event endpoint and resolves on 204", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    await deleteCalendarEvent({
      calendarId: "primary",
      eventId: "evt-abc",
      accessToken: "ya29.x",
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events/evt-abc",
    );
    expect((init as RequestInit).method).toBe("DELETE");
  });

  it("does not throw when the event is already gone (404/410)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("not found", { status: 404 }),
    );
    await expect(
      deleteCalendarEvent({
        calendarId: "primary",
        eventId: "evt-gone",
        accessToken: "x",
      }),
    ).resolves.toBeUndefined();
  });

  it("throws on other non-2xx", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("nope", { status: 500 }),
    );
    await expect(
      deleteCalendarEvent({
        calendarId: "primary",
        eventId: "evt",
        accessToken: "x",
      }),
    ).rejects.toThrow(/events delete.*500/);
  });
});
