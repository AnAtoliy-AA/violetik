import { describe, it, expect } from "vitest";
import { hasRecentBookingReminder } from "./notification-log";

describe("hasRecentBookingReminder", () => {
  it("returns false for a booking with no log entries", async () => {
    expect(
      await hasRecentBookingReminder("bk_does_not_exist_xyz"),
    ).toBe(false);
  });
});
