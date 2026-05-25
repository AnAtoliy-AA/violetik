import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/lib/auth-server", () => ({
  requireAdmin: vi.fn(),
}));
vi.mock("@/db/bookings", () => ({
  countPendingBookings: vi.fn(),
}));

import { GET } from "./route";
import { requireAdmin } from "@/shared/lib/auth-server";
import { countPendingBookings } from "@/db/bookings";

describe("GET /api/admin/bookings/pending-count", () => {
  beforeEach(() => {
    vi.mocked(requireAdmin).mockReset();
    vi.mocked(countPendingBookings).mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: false,
      reason: "unauthorized",
    });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("returns 403 when authenticated but not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: false,
      reason: "forbidden",
    });
    const res = await GET();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("returns { count } for an admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: { id: "u1" } as never,
    });
    vi.mocked(countPendingBookings).mockResolvedValue(7);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ count: 7 });
  });
});
