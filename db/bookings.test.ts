import { describe, expect, it } from "vitest";
import { listUserBookings, cancelBookingIfOpen, countPendingBookings } from "./bookings";

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

describe("countPendingBookings (no DB)", () => {
  it.skipIf(Boolean(process.env.DATABASE_URL))(
    "returns 0 when DATABASE_URL is unset",
    async () => {
      expect(await countPendingBookings()).toBe(0);
    },
  );
});
