import { describe, expect, it } from "vitest";
import { bucketBookings } from "./bucket-bookings";
import type { UserBookingRow } from "../model/types";

function row(
  overrides: Partial<UserBookingRow> & {
    id: string;
    scheduledFor: Date;
    status: UserBookingRow["status"];
  },
): UserBookingRow {
  return {
    userId: "tg:1",
    serviceId: "svc",
    masterId: null,
    durationMinutes: 60,
    gcalEventId: null,
    notes: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    masterNameEn: null,
    masterNameRu: null,
    masterNameBy: null,
    masterTelegramUsername: null,
    ...overrides,
  } as UserBookingRow;
}

describe("bucketBookings", () => {
  const now = new Date("2026-05-23T12:00:00Z");

  it("puts future pending/confirmed into upcoming and past completed into history", () => {
    const rows = [
      row({ id: "a", scheduledFor: new Date("2026-05-25T10:00:00Z"), status: "pending" }),
      row({ id: "b", scheduledFor: new Date("2026-05-24T10:00:00Z"), status: "confirmed" }),
      row({ id: "c", scheduledFor: new Date("2026-04-01T10:00:00Z"), status: "completed" }),
    ];
    const out = bucketBookings(rows, now);
    expect(out.upcoming.map((r) => r.id)).toEqual(["b", "a"]); // soonest-first
    expect(out.history.map((r) => r.id)).toEqual(["c"]);
  });

  it("excludes cancelled rows even if listUserBookings somehow returned them", () => {
    const rows = [
      row({ id: "x", scheduledFor: new Date("2026-05-25T10:00:00Z"), status: "cancelled" }),
    ];
    const out = bucketBookings(rows, now);
    expect(out.upcoming).toEqual([]);
    expect(out.history).toEqual([]);
  });

  it("treats a future completed row as history (defensive)", () => {
    const rows = [
      row({ id: "fc", scheduledFor: new Date("2026-05-25T10:00:00Z"), status: "completed" }),
    ];
    const out = bucketBookings(rows, now);
    expect(out.history.map((r) => r.id)).toEqual(["fc"]);
  });
});
