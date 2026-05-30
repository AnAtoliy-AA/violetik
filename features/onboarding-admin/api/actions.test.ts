import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/shared/lib/auth-server", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/db/onboarding-mutations", () => ({
  createOnboardingSlide: vi.fn(async () => ({ ok: true })),
  updateOnboardingSlide: vi.fn(async () => ({ ok: true })),
  deleteOnboardingSlide: vi.fn(async () => ({ deletedSrc: null })),
  reorderOnboardingSlides: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/db/onboarding", () => ({ getOnboardingSlideById: vi.fn(async () => null) }));
vi.mock("@/shared/lib/photo-storage", () => ({
  deletePhotoFromStorage: vi.fn(async () => {}),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { requireAdmin } from "@/shared/lib/auth-server";
import * as mutations from "@/db/onboarding-mutations";
import {
  createOnboardingSlideAction,
  deleteOnboardingSlideAction,
  reorderOnboardingSlidesAction,
} from "./slide-actions";

const good = {
  id: "atelier",
  eyebrowEn: "01",
  eyebrowRu: "01",
  eyebrowBy: "01",
  titleEn: "t",
  titleRu: "t",
  titleBy: "t",
  bodyEn: "b",
  bodyRu: "b",
  bodyBy: "b",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "1");
  vi.mocked(requireAdmin).mockResolvedValue({
    ok: true,
    user: { id: "u_admin" },
  } as never);
});

describe("onboarding slide actions", () => {
  it("creates a valid slide", async () => {
    expect(await createOnboardingSlideAction(good)).toEqual({ ok: true });
    expect(mutations.createOnboardingSlide).toHaveBeenCalledOnce();
  });

  it("rejects a missing locale field", async () => {
    const r = await createOnboardingSlideAction({ ...good, titleRu: "" });
    expect(r.ok).toBe(false);
    expect(mutations.createOnboardingSlide).not.toHaveBeenCalled();
  });

  it("blocks unauthenticated admins", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: false,
      reason: "forbidden",
    } as never);
    expect(await createOnboardingSlideAction(good)).toEqual({
      ok: false,
      error: "forbidden",
    });
  });

  it("deletes a slide", async () => {
    expect(await deleteOnboardingSlideAction("atelier")).toEqual({ ok: true });
    expect(mutations.deleteOnboardingSlide).toHaveBeenCalledWith("atelier");
  });

  it("validates the reorder payload", async () => {
    expect(await reorderOnboardingSlidesAction(42)).toEqual({
      ok: false,
      error: "invalid_order",
    });
    expect(await reorderOnboardingSlidesAction(["a"])).toEqual({ ok: true });
  });
});
