import { describe, expect, it } from "vitest";
import { listUserBookings, cancelBookingIfOpen } from "./bookings";

describe("listUserBookings (no DB)", () => {
  it.skipIf(Boolean(process.env.DATABASE_URL))(
    "returns an empty array when DATABASE_URL is unset",
    async () => {
      const rows = await listUserBookings("tg:1");
      expect(rows).toEqual([]);
    },
  );
});

describe("cancelBookingIfOpen (no DB)", () => {
  it.skipIf(Boolean(process.env.DATABASE_URL))(
    "returns null when DATABASE_URL is unset",
    async () => {
      const out = await cancelBookingIfOpen("bk_doesnotmatter");
      expect(out).toBeNull();
    },
  );
});
