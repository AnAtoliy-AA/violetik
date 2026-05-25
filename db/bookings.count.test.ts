import { describe, it, expect, vi } from "vitest";

vi.mock("./index", () => {
  const fakeDb = { select: vi.fn() };
  const schemaProxy = new Proxy(
    {},
    { get: () => new Proxy({}, { get: () => undefined }) },
  );
  return { db: fakeDb, schema: schemaProxy };
});

import { countPendingBookings } from "./bookings";
import { db } from "./index";

describe("countPendingBookings", () => {
  it("returns the count from the pending-status query", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 3 }]),
    };
    vi.mocked(db!.select).mockReturnValue(chain as never);
    expect(await countPendingBookings()).toBe(3);
  });
});
