import { describe, expect, it } from "vitest";
import { listApprovedTestimonials } from "./load-approved";

describe("listApprovedTestimonials (no DB)", () => {
  it.skipIf(Boolean(process.env.DATABASE_URL))(
    "returns an empty array when DATABASE_URL is unset",
    async () => {
      expect(await listApprovedTestimonials()).toEqual([]);
      expect(
        await listApprovedTestimonials({ masterId: "m1", limit: 5 }),
      ).toEqual([]);
    },
  );
});
