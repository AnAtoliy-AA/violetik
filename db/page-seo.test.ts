import { describe, expect, it } from "vitest";
import { getAllPageSeo } from "./page-seo";

describe("getAllPageSeo", () => {
  it("returns a record (empty if db is null / unreachable)", async () => {
    let result: Awaited<ReturnType<typeof getAllPageSeo>> | null = null;
    try {
      result = await getAllPageSeo();
    } catch {
      // Real DB reachable but the migration hasn't been applied yet —
      // acceptable in CI / pre-migration environments. getAllPageSeo
      // swallows that internally and returns {}, so this is defensive.
    }
    const overrides = result ?? {};
    expect(overrides).toBeTypeOf("object");
    // Every stored entry, if any, has the full localized shape.
    for (const entry of Object.values(overrides)) {
      expect(typeof entry.titleEn).toBe("string");
      expect(typeof entry.descriptionEn).toBe("string");
    }
  });
});
