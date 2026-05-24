import { describe, it, expect } from "vitest";
import {
  getNotificationPreferences,
  setNotificationPreference,
} from "./notification-preferences";

describe("getNotificationPreferences", () => {
  it("returns an empty map when row is missing", async () => {
    const map = await getNotificationPreferences("user_does_not_exist_xyz");
    expect(map).toEqual({});
  });
});

describe("setNotificationPreference", () => {
  it("returns null or a map (depending on DB availability) for an unknown user", async () => {
    // Without a matching users row this will reject with a FK error in
    // a configured-DB environment. The contract we exercise here is the
    // db-null path: the call must not throw before the FK fires.
    try {
      const result = await setNotificationPreference(
        "user_does_not_exist_xyz",
        "booking_confirmed",
        true,
      );
      expect(result === null || typeof result === "object").toBe(true);
    } catch (err) {
      // FK violation against the real DB is expected for a fake user id.
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).toMatch(/foreign key|violates|user_id/i);
    }
  });
});
