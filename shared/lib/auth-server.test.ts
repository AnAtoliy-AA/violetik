import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/users", () => ({ getUserById: vi.fn() }));

import { auth } from "@/auth";
import { getUserById } from "@/db/users";
import { requireAdmin, getCurrentSessionUser } from "./auth-server";

beforeEach(() => {
  vi.mocked(auth).mockReset();
  vi.mocked(getUserById).mockReset();
});

describe("requireAdmin", () => {
  it('returns {ok:false, reason:"unauthorized"} when no session', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const r = await requireAdmin();
    expect(r).toEqual({ ok: false, reason: "unauthorized" });
  });

  it('returns {ok:false, reason:"forbidden"} when role !== "admin"', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "tg:1" } } as never);
    vi.mocked(getUserById).mockResolvedValue({
      id: "tg:1",
      role: "customer",
    } as never);
    const r = await requireAdmin();
    expect(r).toEqual({ ok: false, reason: "forbidden" });
  });

  it("returns {ok:true, user} when role === 'admin'", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "tg:1" } } as never);
    vi.mocked(getUserById).mockResolvedValue({
      id: "tg:1",
      role: "admin",
    } as never);
    const r = await requireAdmin();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.user.role).toBe("admin");
  });
});

describe("getCurrentSessionUser", () => {
  it("returns null when not signed in", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    expect(await getCurrentSessionUser()).toBeNull();
  });

  it("returns the user row for signed-in session", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "tg:1" } } as never);
    vi.mocked(getUserById).mockResolvedValue({
      id: "tg:1",
      role: "customer",
    } as never);
    const u = await getCurrentSessionUser();
    expect(u?.id).toBe("tg:1");
  });
});
