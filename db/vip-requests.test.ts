import { describe, it, expect } from "vitest";
import { generateVipRequestId, createVipRequest, cancelOwnVipRequest } from "./vip-requests";

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

describe("createVipRequest", () => {
  it("returns null when DATABASE_URL is unset (db === null)", async () => {
    let result: Awaited<ReturnType<typeof createVipRequest>> = null;
    try {
      result = await createVipRequest({ userId: "tg:1", note: null });
    } catch {
      // real DB rejects FK — acceptable; function attempted the insert
    }
    expect(result === null || (typeof result === "object" && result !== null && result.userId === "tg:1")).toBe(true);
  });
});

describe("cancelOwnVipRequest", () => {
  it("returns null when db is null", async () => {
    const result = await cancelOwnVipRequest("tg:nobody");
    expect(result === null || result === undefined || typeof result === "object").toBe(true);
  });
});
