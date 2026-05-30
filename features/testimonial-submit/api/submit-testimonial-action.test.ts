import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/auth-server", () => ({
  getCurrentSessionUser: vi.fn(),
}));
vi.mock("@/db/masters", () => ({
  getMasterById: vi.fn(),
}));
vi.mock("@/db/testimonials", () => ({
  createTestimonial: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { submitTestimonialAction } from "./submit-testimonial-action";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { getMasterById } from "@/db/masters";
import { createTestimonial } from "@/db/testimonials";
import { __resetRateLimitStore } from "@/shared/lib/security/rate-limit";

const mockSession = vi.mocked(getCurrentSessionUser);
const mockGetMaster = vi.mocked(getMasterById);
const mockCreate = vi.mocked(createTestimonial);

beforeEach(() => {
  vi.clearAllMocks();
  // The rate limiter holds module-level state; clear it so per-user
  // counters don't leak between cases (all cases reuse user tg:1).
  __resetRateLimitStore();
});

describe("submitTestimonialAction", () => {
  it("rejects unauthenticated callers", async () => {
    mockSession.mockResolvedValue(null);
    const out = await submitTestimonialAction({ masterId: "m1", body: "hi" });
    expect(out).toEqual({ ok: false, reason: "unauthenticated" });
  });

  it("rejects an empty body", async () => {
    mockSession.mockResolvedValue({ id: "tg:1" } as never);
    const out = await submitTestimonialAction({ masterId: "m1", body: "   " });
    expect(out).toEqual({ ok: false, reason: "body_required" });
  });

  it("rejects a body longer than 800 chars after trim", async () => {
    mockSession.mockResolvedValue({ id: "tg:1" } as never);
    const out = await submitTestimonialAction({
      masterId: "m1",
      body: "a".repeat(801),
    });
    expect(out).toEqual({ ok: false, reason: "body_too_long" });
  });

  it("rejects when the master is missing", async () => {
    mockSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetMaster.mockResolvedValue(null);
    const out = await submitTestimonialAction({ masterId: "x", body: "ok" });
    expect(out).toEqual({ ok: false, reason: "invalid_master" });
  });

  it("rejects when the master is not published", async () => {
    mockSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetMaster.mockResolvedValue({ id: "m1", status: "draft" } as never);
    const out = await submitTestimonialAction({ masterId: "m1", body: "ok" });
    expect(out).toEqual({ ok: false, reason: "invalid_master" });
  });

  it("maps duplicate_pending from createTestimonial", async () => {
    mockSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetMaster.mockResolvedValue({ id: "m1", status: "published" } as never);
    mockCreate.mockResolvedValue({ ok: false, reason: "duplicate_pending" });
    const out = await submitTestimonialAction({ masterId: "m1", body: "hi" });
    expect(out).toEqual({ ok: false, reason: "duplicate_pending" });
  });

  it("succeeds on a happy path", async () => {
    mockSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetMaster.mockResolvedValue({ id: "m1", status: "published" } as never);
    mockCreate.mockResolvedValue({
      ok: true,
      row: { id: "tst_abc", body: "hi" } as never,
    });
    const out = await submitTestimonialAction({ masterId: "m1", body: " hi " });
    expect(out).toEqual({ ok: true, id: "tst_abc" });
    expect(mockCreate).toHaveBeenCalledWith({
      userId: "tg:1",
      masterId: "m1",
      body: "hi",
      serviceId: null,
    });
  });

  it("rate-limits a user after too many submissions", async () => {
    mockSession.mockResolvedValue({ id: "tg:1" } as never);
    mockGetMaster.mockResolvedValue({ id: "m1", status: "published" } as never);
    mockCreate.mockResolvedValue({
      ok: true,
      row: { id: "tst_x", body: "hi" } as never,
    });
    // Limit is 5 per window; the 6th submission must be rejected.
    for (let i = 0; i < 5; i++) {
      const out = await submitTestimonialAction({ masterId: "m1", body: "hi" });
      expect(out.ok).toBe(true);
    }
    const blocked = await submitTestimonialAction({ masterId: "m1", body: "hi" });
    expect(blocked).toEqual({ ok: false, reason: "rate_limited" });
  });
});
