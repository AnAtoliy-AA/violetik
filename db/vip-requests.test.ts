import { describe, it, expect } from "vitest";
import { generateVipRequestId } from "./vip-requests";

describe("generateVipRequestId", () => {
  it("returns a vipreq_-prefixed id with 16 hex chars", () => {
    const id = generateVipRequestId();
    expect(id).toMatch(/^vipreq_[0-9a-f]{16}$/);
  });

  it("returns distinct values across calls", () => {
    const a = generateVipRequestId();
    const b = generateVipRequestId();
    expect(a).not.toBe(b);
  });
});
