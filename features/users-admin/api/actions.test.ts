import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/lib/auth-server", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/db/users-admin", () => ({
  setUserRole: vi.fn(),
  setAdminNote: vi.fn(),
  grantVip: vi.fn(),
  revokeVip: vi.fn(),
  mergeUsers: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { requireAdmin } from "@/shared/lib/auth-server";
import {
  setUserRole,
  setAdminNote,
  grantVip,
  revokeVip,
  mergeUsers,
} from "@/db/users-admin";
import {
  setUserRoleAction,
  setAdminNoteAction,
  grantVipAction,
  revokeVipAction,
  mergeUsersAction,
} from "./actions";

beforeEach(() => {
  vi.mocked(requireAdmin).mockReset();
  vi.mocked(setUserRole).mockReset();
  vi.mocked(setAdminNote).mockReset();
  vi.mocked(grantVip).mockReset();
  vi.mocked(revokeVip).mockReset();
  vi.mocked(mergeUsers).mockReset();
});

describe("setUserRoleAction", () => {
  it("surfaces the gate's forbidden reason when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: "forbidden" });
    expect(await setUserRoleAction("tg:1", "admin")).toEqual({
      ok: false,
      reason: "forbidden",
    });
  });

  it("calls setUserRole and returns ok when admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: { id: "tg:a" },
    } as never);
    vi.mocked(setUserRole).mockResolvedValue({
      ok: true,
      user: { id: "tg:1" },
    } as never);
    const r = await setUserRoleAction("tg:1", "admin");
    expect(r).toEqual({ ok: true, id: "tg:1" });
    expect(setUserRole).toHaveBeenCalledWith("tg:1", "admin");
  });

  it("forwards last-admin guard", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: { id: "tg:a" },
    } as never);
    vi.mocked(setUserRole).mockResolvedValue({ ok: false, reason: "last-admin" });
    expect(await setUserRoleAction("tg:a", "customer")).toEqual({
      ok: false,
      reason: "last-admin",
    });
  });
});

describe("setAdminNoteAction", () => {
  it("returns unauthorized when no session", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: "unauthorized" });
    expect(await setAdminNoteAction("tg:1", "hi")).toEqual({
      ok: false,
      reason: "unauthorized",
    });
  });

  it("calls setAdminNote when admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: { id: "tg:a" },
    } as never);
    vi.mocked(setAdminNote).mockResolvedValue({ id: "tg:1" } as never);
    expect(await setAdminNoteAction("tg:1", "hello")).toEqual({
      ok: true,
      id: "tg:1",
    });
    expect(setAdminNote).toHaveBeenCalledWith("tg:1", "hello");
  });
});

describe("grantVipAction", () => {
  it("calls grantVip with admin id and forwards expiry", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: { id: "tg:admin" },
    } as never);
    vi.mocked(grantVip).mockResolvedValue({ id: "vipreq_x" } as never);
    const exp = new Date(Date.now() + 30 * 86400_000);
    expect(await grantVipAction({ userId: "tg:1", expiresAt: exp })).toEqual({
      ok: true,
      id: "vipreq_x",
    });
    expect(grantVip).toHaveBeenCalledWith({
      userId: "tg:1",
      expiresAt: exp,
      decidedBy: "tg:admin",
    });
  });

  it("supports lifetime grant (null expiry)", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: { id: "tg:admin" },
    } as never);
    vi.mocked(grantVip).mockResolvedValue({ id: "vipreq_x" } as never);
    expect(await grantVipAction({ userId: "tg:1", expiresAt: null })).toEqual({
      ok: true,
      id: "vipreq_x",
    });
    expect(grantVip).toHaveBeenCalledWith({
      userId: "tg:1",
      expiresAt: null,
      decidedBy: "tg:admin",
    });
  });
});

describe("revokeVipAction", () => {
  it("returns not-found when no active VIP", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: { id: "tg:a" },
    } as never);
    vi.mocked(revokeVip).mockResolvedValue(null);
    expect(await revokeVipAction("tg:1")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});

describe("mergeUsersAction", () => {
  it("passes through conflict shape unchanged", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: { id: "tg:admin" },
    } as never);
    const conflicts = {
      bothPendingVip: true,
      pendingTestimonialCollisions: ["m1"],
    };
    vi.mocked(mergeUsers).mockResolvedValue({
      ok: false,
      reason: "conflicts",
      conflicts,
    });
    const result = await mergeUsersAction({
      survivorId: "tg:1",
      loserId: "google:abc",
      overrides: {
        firstName: "survivor",
        lastName: "survivor",
        email: "survivor",
        photoUrl: "survivor",
      },
    });
    expect(result).toEqual({ ok: false, reason: "conflicts", conflicts });
  });

  it("returns the survivorId on success", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: { id: "tg:admin" },
    } as never);
    vi.mocked(mergeUsers).mockResolvedValue({
      ok: true,
      survivorId: "tg:1",
    });
    expect(
      await mergeUsersAction({
        survivorId: "tg:1",
        loserId: "google:abc",
        overrides: {
          firstName: "survivor",
          lastName: "survivor",
          email: "survivor",
          photoUrl: "survivor",
        },
      }),
    ).toEqual({ ok: true, survivorId: "tg:1" });
  });
});
