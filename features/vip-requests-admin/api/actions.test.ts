import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/lib/auth-server", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/db/vip-requests", () => ({
  decideVipRequest: vi.fn(),
  downgradeVipRequest: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { requireAdmin } from "@/shared/lib/auth-server";
import { decideVipRequest, downgradeVipRequest } from "@/db/vip-requests";
import { approveRequest, declineRequest, downgradeVip } from "./actions";

beforeEach(() => {
  vi.mocked(requireAdmin).mockReset();
  vi.mocked(decideVipRequest).mockReset();
  vi.mocked(downgradeVipRequest).mockReset();
});

describe("approveRequest", () => {
  it("returns {ok:false, reason:'forbidden'} when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: "forbidden" });
    expect(
      await approveRequest({
        id: "vipreq_x",
        expiresAt: new Date(),
      }),
    ).toEqual({ ok: false, reason: "forbidden" });
  });

  it("calls decideVipRequest with action='approve' when admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, user: { id: "tg:a" } } as never);
    vi.mocked(decideVipRequest).mockResolvedValue({ id: "vipreq_x" } as never);
    const exp = new Date(Date.now() + 30 * 86400_000);
    const r = await approveRequest({ id: "vipreq_x", expiresAt: exp });
    expect(r).toEqual({ ok: true, id: "vipreq_x" });
    expect(decideVipRequest).toHaveBeenCalledWith({
      id: "vipreq_x",
      action: "approve",
      decidedBy: "tg:a",
      expiresAt: exp,
    });
  });
});

describe("declineRequest", () => {
  it("calls decideVipRequest with action='decline' when admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, user: { id: "tg:a" } } as never);
    vi.mocked(decideVipRequest).mockResolvedValue({ id: "vipreq_x" } as never);
    const r = await declineRequest({ id: "vipreq_x", reason: "spam" });
    expect(r).toEqual({ ok: true, id: "vipreq_x" });
    expect(decideVipRequest).toHaveBeenCalledWith({
      id: "vipreq_x",
      action: "decline",
      decidedBy: "tg:a",
      declineReason: "spam",
    });
  });
});

describe("downgradeVip", () => {
  it("returns {ok:false, reason:'forbidden'} when not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: "forbidden" });
    expect(await downgradeVip("vipreq_x")).toEqual({ ok: false, reason: "forbidden" });
  });
  it("calls downgradeVipRequest when admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, user: { id: "tg:a" } } as never);
    vi.mocked(downgradeVipRequest).mockResolvedValue({ id: "vipreq_x" } as never);
    expect(await downgradeVip("vipreq_x")).toEqual({ ok: true, id: "vipreq_x" });
  });
});
