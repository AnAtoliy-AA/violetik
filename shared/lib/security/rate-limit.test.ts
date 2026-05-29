import { afterEach, describe, expect, it, vi } from "vitest";
import { rateLimit, __resetRateLimitStore } from "./rate-limit";

describe("rateLimit", () => {
  afterEach(() => {
    __resetRateLimitStore();
    vi.useRealTimers();
  });

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("k", { limit: 3, windowMs: 1000 })).toEqual({ ok: true });
    }
  });

  it("blocks the request that exceeds the limit and reports retryAfterMs", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    for (let i = 0; i < 3; i++) rateLimit("k", { limit: 3, windowMs: 1000 });

    vi.setSystemTime(400);
    const result = rateLimit("k", { limit: 3, windowMs: 1000 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryAfterMs).toBe(600);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    for (let i = 0; i < 3; i++) rateLimit("k", { limit: 3, windowMs: 1000 });
    expect(rateLimit("k", { limit: 3, windowMs: 1000 }).ok).toBe(false);

    vi.setSystemTime(1001);
    expect(rateLimit("k", { limit: 3, windowMs: 1000 })).toEqual({ ok: true });
  });

  it("tracks distinct keys independently", () => {
    for (let i = 0; i < 3; i++) rateLimit("a", { limit: 3, windowMs: 1000 });
    expect(rateLimit("a", { limit: 3, windowMs: 1000 }).ok).toBe(false);
    expect(rateLimit("b", { limit: 3, windowMs: 1000 })).toEqual({ ok: true });
  });
});
