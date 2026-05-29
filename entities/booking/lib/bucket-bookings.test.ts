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

  it("puts cancelled rows into history, newest first", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const older = row({
      id: "bk_old_cancel",
      status: "cancelled",
      scheduledFor: new Date("2025-12-10T10:00:00Z"),
    });
    const newer = row({
      id: "bk_new_cancel",
      status: "cancelled",
      scheduledFor: new Date("2025-12-20T10:00:00Z"),
    });
    const result = bucketBookings([older, newer], now);
    expect(result.upcoming).toHaveLength(0);
    expect(result.history.map((r) => r.id)).toEqual([
      "bk_new_cancel",
      "bk_old_cancel",
    ]);
  });

  it("interleaves cancelled and completed in history by date desc", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const completed = row({
      id: "bk_done",
      status: "completed",
      scheduledFor: new Date("2025-12-15T10:00:00Z"),
    });
    const cancelled = row({
      id: "bk_cx",
      status: "cancelled",
      scheduledFor: new Date("2025-12-25T10:00:00Z"),
    });
    const result = bucketBookings([completed, cancelled], now);
    expect(result.history.map((r) => r.id)).toEqual(["bk_cx", "bk_done"]);
  });

  it("treats a future completed row as history (defensive)", () => {
    const rows = [
      row({ id: "fc", scheduledFor: new Date("2026-05-25T10:00:00Z"), status: "completed" }),
    ];
    const out = bucketBookings(rows, now);
    expect(out.history.map((r) => r.id)).toEqual(["fc"]);
  });
});
