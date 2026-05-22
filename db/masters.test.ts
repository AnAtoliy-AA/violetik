import { describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({
  db: null,
  schema: {
    masters: {},
    masterServices: {},
  },
}));

import {
  listAllMasters,
  listPublishedMasters,
  getMasterById,
  getMasterIdsForService,
  getServiceIdsForMaster,
  getServiceIdsHavingAnyPublishedMaster,
} from "./masters";

describe("db/masters — db-null tolerance", () => {
  it("listAllMasters returns []", async () => {
    expect(await listAllMasters()).toEqual([]);
  });
  it("listPublishedMasters returns []", async () => {
    expect(await listPublishedMasters()).toEqual([]);
  });
  it("getMasterById returns null", async () => {
    expect(await getMasterById("x")).toBeNull();
  });
  it("getMasterIdsForService returns []", async () => {
    expect(await getMasterIdsForService("any")).toEqual([]);
  });
  it("getServiceIdsForMaster returns []", async () => {
    expect(await getServiceIdsForMaster("any")).toEqual([]);
  });
  it("getServiceIdsHavingAnyPublishedMaster returns empty set", async () => {
    expect((await getServiceIdsHavingAnyPublishedMaster()).size).toBe(0);
  });
});
