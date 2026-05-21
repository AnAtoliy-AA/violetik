import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/vip-requests", () => ({
  getCurrentTier: vi.fn(),
  createVipRequest: vi.fn(),
  cancelOwnVipRequest: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/auth";
import {
  getCurrentTier,
  createVipRequest,
  cancelOwnVipRequest,
} from "@/db/vip-requests";
import { submitVipRequest, cancelVipRequest } from "./actions";

beforeEach(() => {
  vi.mocked(auth).mockReset();
  vi.mocked(getCurrentTier).mockReset();
  vi.mocked(createVipRequest).mockReset();
  vi.mocked(cancelOwnVipRequest).mockReset();
});

describe("submitVipRequest", () => {
  it("returns {ok:false, reason:'unauthorized'} when not signed in", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    expect(await submitVipRequest({ note: null })).toEqual({
      ok: false,
      reason: "unauthorized",
    });
  });

  it("returns {ok:false, reason:'pending-exists'} when user already has pending", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "tg:1" } } as never);
    vi.mocked(getCurrentTier).mockResolvedValue({
      state: "member-pending",
      pendingRequestId: "vipreq_x",
    });
    expect(await submitVipRequest({ note: null })).toEqual({
      ok: false,
      reason: "pending-exists",
      id: "vipreq_x",
    });
  });

  it("returns {ok:false, reason:'already-vip'} when active VIP", async () => {
    const exp = new Date(Date.now() + 30 * 86400_000);
    vi.mocked(auth).mockResolvedValue({ user: { id: "tg:1" } } as never);
    vi.mocked(getCurrentTier).mockResolvedValue({
      state: "vip",
      activeRequestId: "vipreq_a",
      expiresAt: exp,
    });
    expect(await submitVipRequest({ note: null })).toEqual({
      ok: false,
      reason: "already-vip",
      expiresAt: exp,
    });
  });

  it("creates a row and returns {ok:true, id} when allowed", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "tg:1" } } as never);
    vi.mocked(getCurrentTier).mockResolvedValue({ state: "member" });
    vi.mocked(createVipRequest).mockResolvedValue({
      id: "vipreq_new",
      userId: "tg:1",
      status: "pending",
      note: null,
      expiresAt: null,
      decidedAt: null,
      decidedBy: null,
      declineReason: null,
      createdAt: new Date(),
    });
    const r = await submitVipRequest({ note: "hi" });
    expect(r).toEqual({ ok: true, id: "vipreq_new" });
    expect(createVipRequest).toHaveBeenCalledWith({ userId: "tg:1", note: "hi" });
  });
});

describe("cancelVipRequest", () => {
  it("returns {ok:false, reason:'unauthorized'} when not signed in", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    expect(await cancelVipRequest()).toEqual({
      ok: false,
      reason: "unauthorized",
    });
  });

  it("returns {ok:false, reason:'no-pending'} when nothing to cancel", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "tg:1" } } as never);
    vi.mocked(cancelOwnVipRequest).mockResolvedValue(null);
    expect(await cancelVipRequest()).toEqual({ ok: false, reason: "no-pending" });
  });

  it("returns {ok:true} when cancelled", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "tg:1" } } as never);
    vi.mocked(cancelOwnVipRequest).mockResolvedValue({ id: "vipreq_x" } as never);
    expect(await cancelVipRequest()).toEqual({ ok: true, id: "vipreq_x" });
  });
});
