import type { BusyWindow } from "./types";

const FREE_BUSY_ENDPOINT = "https://www.googleapis.com/calendar/v3/freeBusy";

export async function fetchBusyWindows(args: {
  calendarId: string;
  rangeStart: Date;
  rangeEnd: Date;
  accessToken: string;
}): Promise<BusyWindow[]> {
  const res = await fetch(FREE_BUSY_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: args.rangeStart.toISOString(),
      timeMax: args.rangeEnd.toISOString(),
      items: [{ id: args.calendarId }],
    }),
  });
  if (!res.ok) {
    throw new Error(
      `freeBusy request failed: ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as {
    calendars: Record<string, { busy: { start: string; end: string }[] }>;
  };
  const entry = json.calendars[args.calendarId] ?? { busy: [] };
  return entry.busy.map((b) => ({
    start: new Date(b.start),
    end: new Date(b.end),
  }));
}
