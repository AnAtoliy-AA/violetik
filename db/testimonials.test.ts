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
  it("returns null when DATABASE_URL is unset", async () => {
    if (process.env.DATABASE_URL) return; // skip when DB is configured
    const row = await createTestimonial({
      userId: "tg:1",
      masterId: "m1",
      body: "Hello",
    });
    expect(row).toBeNull();
  });
});

describe("listUserTestimonials (no DB)", () => {
  it("returns an empty array when DATABASE_URL is unset", async () => {
    if (process.env.DATABASE_URL) return;
    const rows = await listUserTestimonials("tg:1");
    expect(rows).toEqual([]);
  });
});
