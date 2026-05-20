const EVENTS_ENDPOINT = (calendarId: string) =>
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

export async function createCalendarEvent(args: {
  calendarId: string;
  accessToken: string;
  summary: string;
  start: Date;
  end: Date;
  timeZone: string;
  description?: string;
}): Promise<string> {
  const res = await fetch(EVENTS_ENDPOINT(args.calendarId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: args.summary,
      description: args.description,
      start: { dateTime: args.start.toISOString(), timeZone: args.timeZone },
      end: { dateTime: args.end.toISOString(), timeZone: args.timeZone },
      transparency: "opaque",
    }),
  });
  if (!res.ok) {
    throw new Error(
      `events insert failed: ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as { id: string };
  return json.id;
}

/**
 * Best-effort delete. Treats 404/410 as success (event already gone)
 * so the caller can use this as a fire-and-forget cleanup on cancel.
 */
export async function deleteCalendarEvent(args: {
  calendarId: string;
  eventId: string;
  accessToken: string;
}): Promise<void> {
  const url = `${EVENTS_ENDPOINT(args.calendarId)}/${encodeURIComponent(args.eventId)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${args.accessToken}` },
  });
  if (res.status === 204 || res.status === 200) return;
  if (res.status === 404 || res.status === 410) return;
  throw new Error(`events delete failed: ${res.status} ${await res.text()}`);
}
