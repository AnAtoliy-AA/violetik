import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const resetDbClientMock = vi.fn();

vi.mock("./index", () => ({
  resetDbClient: resetDbClientMock,
}));

describe("withDevTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetDbClientMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  });

  async function loadHelper() {
    return import("./dev-timeout");
  }

  it("resolves with the inner promise's value when it settles in time", async () => {
    process.env.NODE_ENV = "development";
    const { withDevTimeout } = await loadHelper();
    const result = withDevTimeout(Promise.resolve(42), "ok");
    await expect(result).resolves.toBe(42);
    expect(resetDbClientMock).not.toHaveBeenCalled();
  });

  it("rejects with DevQueryTimeoutError once the threshold elapses", async () => {
    process.env.NODE_ENV = "development";
    const { withDevTimeout, DevQueryTimeoutError } = await loadHelper();
    const result = withDevTimeout(new Promise(() => {}), "stuck", 100);
    vi.advanceTimersByTime(101);
    await expect(result).rejects.toBeInstanceOf(DevQueryTimeoutError);
  });

  it("recycles the postgres pool when the timeout fires", async () => {
    process.env.NODE_ENV = "development";
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { withDevTimeout } = await loadHelper();
    const result = withDevTimeout(new Promise(() => {}), "stuck", 100);
    vi.advanceTimersByTime(101);
    await expect(result).rejects.toThrow();
    expect(resetDbClientMock).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent timeouts so the pool is reset once per burst", async () => {
    process.env.NODE_ENV = "development";
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { withDevTimeout } = await loadHelper();
    const a = withDevTimeout(new Promise(() => {}), "a", 100);
    const b = withDevTimeout(new Promise(() => {}), "b", 100);
    const c = withDevTimeout(new Promise(() => {}), "c", 100);
    vi.advanceTimersByTime(101);
    await Promise.allSettled([a, b, c]);
    expect(resetDbClientMock).toHaveBeenCalledTimes(1);
  });

  it("propagates the inner promise's rejection even after the timeout fires", async () => {
    process.env.NODE_ENV = "development";
    const { withDevTimeout } = await loadHelper();
    const inner = Promise.reject(new Error("boom"));
    inner.catch(() => {});
    await expect(withDevTimeout(inner, "rej")).rejects.toThrow("boom");
    expect(resetDbClientMock).not.toHaveBeenCalled();
  });

  it("is a no-op in production — never races, never rejects on its own", async () => {
    process.env.NODE_ENV = "production";
    const { withDevTimeout, DevQueryTimeoutError } = await loadHelper();
    let resolveInner: (value: string) => void = () => {};
    const inner = new Promise<string>((res) => {
      resolveInner = res;
    });
    const racing = withDevTimeout(inner, "prod", 100);
    vi.advanceTimersByTime(60_000);
    resolveInner("done");
    const value = await racing;
    expect(value).toBe("done");
    expect(DevQueryTimeoutError).toBeDefined();
    expect(resetDbClientMock).not.toHaveBeenCalled();
  });
});
