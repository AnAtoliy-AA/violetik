import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/lib/auth-server", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/db/testimonials", () => ({ decideTestimonial: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { requireAdmin } from "@/shared/lib/auth-server";
import { decideTestimonial } from "@/db/testimonials";
import { revalidatePath } from "next/cache";
import { approveTestimonial, rejectTestimonial } from "./actions";

beforeEach(() => {
  vi.mocked(requireAdmin).mockReset();
  vi.mocked(decideTestimonial).mockReset();
  vi.mocked(revalidatePath).mockReset();
});

describe("approveTestimonial", () => {
  it("returns {ok:false, reason:'unauthorized'} when not signed in", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: "unauthorized" });
    expect(await approveTestimonial("tst_1")).toEqual({
      ok: false,
      reason: "unauthorized",
    });
  });

  it("returns {ok:false, reason:'forbidden'} for non-admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: "forbidden" });
    expect(await approveTestimonial("tst_1")).toEqual({
      ok: false,
      reason: "forbidden",
    });
  });

  it("returns {ok:false, reason:'not-found'} when decideTestimonial returns null", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, user: { id: "tg:a" } } as never);
    vi.mocked(decideTestimonial).mockResolvedValue(null);
    expect(await approveTestimonial("tst_1")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });

  it("calls decideTestimonial with action='approve' and revalidates on success", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, user: { id: "tg:a" } } as never);
    vi.mocked(decideTestimonial).mockResolvedValue({ id: "tst_1" } as never);
    expect(await approveTestimonial("tst_1")).toEqual({ ok: true, id: "tst_1" });
    expect(decideTestimonial).toHaveBeenCalledWith({
      id: "tst_1",
      action: "approve",
      decidedBy: "tg:a",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

describe("rejectTestimonial", () => {
  it("calls decideTestimonial with action='reject' on success", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, user: { id: "tg:a" } } as never);
    vi.mocked(decideTestimonial).mockResolvedValue({ id: "tst_1" } as never);
    expect(await rejectTestimonial("tst_1")).toEqual({ ok: true, id: "tst_1" });
    expect(decideTestimonial).toHaveBeenCalledWith({
      id: "tst_1",
      action: "reject",
      decidedBy: "tg:a",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("returns {ok:false, reason:'not-found'} when row is already decided", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, user: { id: "tg:a" } } as never);
    vi.mocked(decideTestimonial).mockResolvedValue(null);
    expect(await rejectTestimonial("tst_1")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});
