import { describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({
  db: null,
  schema: {
    masters: {},
    masterServices: {},
    bookings: {},
  },
}));

import {
  createMaster,
  archiveMaster,
  countUpcomingBookingsForMaster,
  setServiceMasters,
} from "./masters-mutations";

describe("db/masters-mutations — db-null tolerance", () => {
  it("createMaster returns db_unavailable", async () => {
    expect(
      await createMaster({
        id: "x",
        nameEn: "X",
        nameRu: "X",
        nameBy: "X",
        roleEn: "r",
        roleRu: "r",
        roleBy: "r",
        bioEn: "b",
        bioRu: "b",
        bioBy: "b",
        quoteEn: "q",
        quoteRu: "q",
        quoteBy: "q",
        years: 0,
        sortOrder: 0,
        status: "draft",
      }),
    ).toEqual({ ok: false, error: "db_unavailable" });
  });
  it("archiveMaster returns db_unavailable", async () => {
    expect(await archiveMaster("x")).toEqual({
      ok: false,
      error: "db_unavailable",
    });
  });
  it("countUpcomingBookingsForMaster returns 0 with no db", async () => {
    expect(await countUpcomingBookingsForMaster("x")).toBe(0);
  });
  it("setServiceMasters returns db_unavailable", async () => {
    expect(await setServiceMasters("svc", ["m1"])).toEqual({
      ok: false,
      error: "db_unavailable",
    });
  });
});
