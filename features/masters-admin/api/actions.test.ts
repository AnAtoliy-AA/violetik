import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/shared/lib/auth-server", () => ({
  requireAdmin: vi.fn(),
}));
vi.mock("@/db/masters-mutations", () => ({
  createMaster: vi.fn(async () => ({ ok: true })),
  updateMaster: vi.fn(async () => ({ ok: true })),
  archiveMaster: vi.fn(async () => ({ ok: true })),
  restoreMaster: vi.fn(async () => ({ ok: true })),
  reorderMasters: vi.fn(async () => ({ ok: true })),
  setMasterServices: vi.fn(async () => ({ ok: true })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { requireAdmin } from "@/shared/lib/auth-server";
import * as mutations from "@/db/masters-mutations";
import { createMasterAction } from "./create-master";
import { updateMasterAction } from "./update-master";
import { archiveMasterAction } from "./archive-master";

const ADMIN = { id: "u_admin" };

const goodMaster = {
  id: "violetta",
  nameEn: "Violetta",
  nameRu: "Виолетта",
  nameBe: "Віялета",
  roleEn: "Master",
  roleRu: "Мастер",
  roleBe: "Майстра",
  bioEn: "EN bio",
  bioRu: "RU bio",
  bioBe: "BE bio",
  quoteEn: "EN quote",
  quoteRu: "RU quote",
  quoteBe: "BE quote",
  years: 11,
  sortOrder: 0,
  status: "published" as const,
  serviceIds: ["signature"],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "1");
});

describe("masters-admin actions", () => {
  it("rejects non-admins (TELEGRAM_BOT_TOKEN set)", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: false,
      reason: "forbidden",
    });
    const result = await createMasterAction(goodMaster);
    expect(result.ok).toBe(false);
    expect(mutations.createMaster).not.toHaveBeenCalled();
  });

  it("accepts admins and forwards to the mutation layer + specialty linker", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: ADMIN as never,
    });
    const result = await createMasterAction(goodMaster);
    expect(result.ok).toBe(true);
    expect(mutations.createMaster).toHaveBeenCalledWith(
      expect.objectContaining({ id: "violetta" }),
    );
    expect(mutations.setMasterServices).toHaveBeenCalledWith("violetta", [
      "signature",
    ]);
  });

  it("rejects an empty locale name with a translatable error code", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: ADMIN as never,
    });
    const result = await createMasterAction({ ...goodMaster, nameRu: "" });
    expect(result.ok).toBe(false);
    expect(mutations.createMaster).not.toHaveBeenCalled();
  });

  it("updateMasterAction strips id and forwards the patch", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: ADMIN as never,
    });
    const { id: _id, ...patch } = goodMaster;
    void _id;
    const result = await updateMasterAction("violetta", patch);
    expect(result.ok).toBe(true);
    expect(mutations.updateMaster).toHaveBeenCalled();
  });

  it("archiveMasterAction surfaces the upcoming-bookings guard", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      user: ADMIN as never,
    });
    vi.mocked(mutations.archiveMaster).mockResolvedValueOnce({
      ok: false,
      error: "master_has_upcoming_bookings",
      blockingCount: 2,
    });
    const result = await archiveMasterAction("violetta");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("master_has_upcoming_bookings");
      // @ts-expect-error blockingCount is in the union branch
      expect(result.blockingCount).toBe(2);
    }
  });
});
