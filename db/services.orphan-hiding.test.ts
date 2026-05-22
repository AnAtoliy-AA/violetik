import { describe, expect, it, vi } from "vitest";

// Mock the masters import so the orphan-hiding check sees an empty set
// (i.e., no published masters anywhere in the system). The
// listPublishedServices() function must then fall through to the
// unfiltered published list so first-run installs aren't dead.
vi.mock("./masters", () => ({
  getServiceIdsHavingAnyPublishedMaster: vi.fn().mockResolvedValue(new Set()),
}));
vi.mock("./index", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () =>
            Promise.resolve([
              { id: "signature", status: "published", sortOrder: 0 },
            ]),
        }),
      }),
    }),
  },
  schema: { services: { sortOrder: {}, status: {}, id: {} } },
}));

import { listPublishedServices } from "./services";

describe("listPublishedServices — zero-masters fall-through", () => {
  it("returns the unfiltered published list when no master is published", async () => {
    const rows = await listPublishedServices();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("signature");
  });
});
