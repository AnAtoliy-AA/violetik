import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvent,
  setCalendarEventStatus,
} from "./events";

afterEach(() => vi.restoreAllMocks());

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
    }),
  );
}

describe("createCalendarEvent", () => {
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

  it("sends the requested event status in the body", async () => {
    const spy = mockFetch(200, { id: "evt_1" });
    await createCalendarEvent({
      calendarId: "primary",
      accessToken: "tok",
      summary: "s",
      start: new Date("2026-06-01T10:00:00Z"),
      end: new Date("2026-06-01T11:00:00Z"),
      timeZone: "Europe/Warsaw",
      status: "tentative",
    });
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.status).toBe("tentative");
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

describe("getCalendarEvent", () => {
  it("returns the event status on 200", async () => {
    mockFetch(200, { id: "evt_1", status: "confirmed" });
    const evt = await getCalendarEvent({
      calendarId: "primary",
      eventId: "evt_1",
      accessToken: "tok",
    });
    expect(evt?.status).toBe("confirmed");
  });

  it("returns null on 404/410", async () => {
    mockFetch(404, "gone");
    const evt = await getCalendarEvent({
      calendarId: "primary",
      eventId: "evt_x",
      accessToken: "tok",
    });
    expect(evt).toBeNull();
  });

  it("throws on other errors", async () => {
    mockFetch(500, "boom");
    await expect(
      getCalendarEvent({
        calendarId: "primary",
        eventId: "evt_1",
        accessToken: "tok",
      }),
    ).rejects.toThrow();
  });
});

describe("setCalendarEventStatus", () => {
  it("PATCHes the event status", async () => {
    const spy = mockFetch(200, { id: "evt_1", status: "confirmed" });
    await setCalendarEventStatus({
      calendarId: "primary",
      eventId: "evt_1",
      accessToken: "tok",
      status: "confirmed",
    });
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string).status).toBe("confirmed");
  });
});
