import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/shared/lib/auth-server", () => ({
  requireAdmin: vi.fn(),
}));
vi.mock("@/db/services-mutations", () => ({
  createCategory: vi.fn(async () => ({ ok: true })),
  updateCategory: vi.fn(async () => ({ ok: true })),
  archiveCategory: vi.fn(async () => ({ ok: true })),
  restoreCategory: vi.fn(async () => ({ ok: true })),
  countNonArchivedServicesInCategory: vi.fn(async () => 0),
  createService: vi.fn(async () => ({ ok: true })),
  updateService: vi.fn(async () => ({ ok: true })),
  archiveService: vi.fn(async () => ({ ok: true })),
  restoreService: vi.fn(async () => ({ ok: true })),
  reorderCategories: vi.fn(async () => ({ ok: true })),
  reorderServices: vi.fn(async () => ({ ok: true })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { requireAdmin } from "@/shared/lib/auth-server";
import * as mutations from "@/db/services-mutations";
import { createCategoryAction } from "./create-category";
import { createServiceAction } from "./create-service";
import { archiveCategoryAction } from "./archive-category";

const ADMIN = { id: "u_admin" };

const goodCategory = {
  id: "care",
  nameEn: "Care",
  nameRu: "Уход",
  nameBe: "Догляд",
  status: "published" as const,
};

const goodService = {
  id: "signature",
  categoryId: "care",
  nameEn: "Signature",
  nameRu: "С",
  nameBe: "С",
  blurbEn: "b",
  blurbRu: "b",
  blurbBe: "b",
  includes: [],
  priceCents: 9500,
  durationMinutes: 75,
  status: "published" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "1");
});

describe("services-admin actions", () => {
  it("rejects non-admins (TELEGRAM_BOT_TOKEN set)", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: false,
      reason: "forbidden",
    });
    const result = await createCategoryAction(goodCategory);
    expect(result.ok).toBe(false);
    expect(mutations.createCategory).not.toHaveBeenCalled();
  });

  it("accepts admins and forwards to the mutation layer", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: ADMIN as never,
    });
    const result = await createCategoryAction(goodCategory);
    expect(result.ok).toBe(true);
    expect(mutations.createCategory).toHaveBeenCalledWith(
      expect.objectContaining({ id: "care", updatedBy: "u_admin" }),
    );
  });

  it("rejects an empty locale name with a translatable error code", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: ADMIN as never,
    });
    const result = await createCategoryAction({
      ...goodCategory,
      nameRu: "",
    });
    expect(result.ok).toBe(false);
    expect(mutations.createCategory).not.toHaveBeenCalled();
  });

  it("rejects more than 8 bullets on a service create", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: ADMIN as never,
    });
    const tooMany = Array.from({ length: 9 }, () => ({
      en: "x",
      ru: "x",
      be: "x",
    }));
    const result = await createServiceAction({
      ...goodService,
      includes: tooMany,
    });
    expect(result.ok).toBe(false);
    expect(mutations.createService).not.toHaveBeenCalled();
  });

  it("archiveCategoryAction refuses when the category has non-archived services", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: ADMIN as never,
    });
    vi.mocked(mutations.countNonArchivedServicesInCategory).mockResolvedValue(3);
    const result = await archiveCategoryAction("care");
    expect(result.ok).toBe(false);
    expect(mutations.archiveCategory).not.toHaveBeenCalled();
  });
});
