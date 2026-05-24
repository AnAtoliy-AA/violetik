import { describe, expect, it } from "vitest";
import {
  createTestimonial,
  listUserTestimonials,
  generateTestimonialId,
} from "./testimonials";

describe("generateTestimonialId", () => {
  it("produces a tst_ prefix and 16 hex chars", () => {
    const id = generateTestimonialId();
    expect(id).toMatch(/^tst_[0-9a-f]{16}$/);
  });
  it("produces unique ids across calls", () => {
    const a = generateTestimonialId();
    const b = generateTestimonialId();
    expect(a).not.toBe(b);
  });
});

describe("createTestimonial (no DB)", () => {
  it.skipIf(Boolean(process.env.DATABASE_URL))(
    "returns null when DATABASE_URL is unset",
    async () => {
      const row = await createTestimonial({
        userId: "tg:1",
        masterId: "m1",
        body: "Hello",
      });
      expect(row).toBeNull();
    },
  );
});

describe("listUserTestimonials (no DB)", () => {
  it.skipIf(Boolean(process.env.DATABASE_URL))(
    "returns an empty array when DATABASE_URL is unset",
    async () => {
      const rows = await listUserTestimonials("tg:1");
      expect(rows).toEqual([]);
    },
  );
});

import {
  listTestimonialsByStatus,
  decideTestimonial,
  countPendingTestimonials,
} from "./testimonials";

describe("listTestimonialsByStatus (no DB)", () => {
  it.skipIf(Boolean(process.env.DATABASE_URL))(
    "returns an empty array when DATABASE_URL is unset",
    async () => {
      expect(await listTestimonialsByStatus("pending")).toEqual([]);
      expect(await listTestimonialsByStatus("approved")).toEqual([]);
      expect(await listTestimonialsByStatus("rejected")).toEqual([]);
    },
  );
});

describe("decideTestimonial (no DB)", () => {
  it.skipIf(Boolean(process.env.DATABASE_URL))(
    "returns null when DATABASE_URL is unset",
    async () => {
      expect(
        await decideTestimonial({
          id: "tst_1",
          action: "approve",
          decidedBy: "tg:1",
        }),
      ).toBeNull();
      expect(
        await decideTestimonial({
          id: "tst_1",
          action: "reject",
          decidedBy: "tg:1",
        }),
      ).toBeNull();
    },
  );
});

describe("countPendingTestimonials (no DB)", () => {
  it.skipIf(Boolean(process.env.DATABASE_URL))(
    "returns 0 when DATABASE_URL is unset",
    async () => {
      expect(await countPendingTestimonials()).toBe(0);
    },
  );
});
