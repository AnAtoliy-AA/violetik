import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/masters", () => ({
  listAllMasters: vi.fn().mockResolvedValue([]),
  listPublishedMasters: vi.fn().mockResolvedValue([]),
  getMasterById: vi.fn().mockResolvedValue(null),
  getServiceIdsForMaster: vi.fn().mockResolvedValue([]),
  getMasterIdsForService: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/db/studio-photos", () => ({
  getStudioPhoto: vi.fn().mockResolvedValue(null),
}));

import {
  loadMastersForLocale,
  loadMasterBySlugForLocale,
  loadPublishedMasterCount,
  loadEligibleMastersForService,
} from "./load";

describe("entities/master/api/load — empty DB", () => {
  it("loadMastersForLocale returns []", async () => {
    expect(await loadMastersForLocale("en")).toEqual([]);
  });
  it("loadMasterBySlugForLocale returns null", async () => {
    expect(await loadMasterBySlugForLocale("anyone", "en")).toBeNull();
  });
  it("loadPublishedMasterCount returns 0", async () => {
    expect(await loadPublishedMasterCount()).toBe(0);
  });
  it("loadEligibleMastersForService returns []", async () => {
    expect(await loadEligibleMastersForService("any", "en")).toEqual([]);
  });
});
