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

  it("resolves with the factory's value when it settles in time", async () => {
    process.env.NODE_ENV = "development";
    const { withDevTimeout } = await loadHelper();
    const result = withDevTimeout(() => Promise.resolve(42), "ok");
    await expect(result).resolves.toBe(42);
    expect(resetDbClientMock).not.toHaveBeenCalled();
  });

  it("rejects with DevQueryTimeoutError once the threshold elapses", async () => {
    process.env.NODE_ENV = "development";
    const { withDevTimeout, DevQueryTimeoutError } = await loadHelper();
    const result = withDevTimeout(() => new Promise(() => {}), "stuck", 100);
    vi.advanceTimersByTime(101);
    await expect(result).rejects.toBeInstanceOf(DevQueryTimeoutError);
  });

  it("recycles the postgres pool when the timeout fires", async () => {
    process.env.NODE_ENV = "development";
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { withDevTimeout } = await loadHelper();
    const result = withDevTimeout(() => new Promise(() => {}), "stuck", 100);
    vi.advanceTimersByTime(101);
    await expect(result).rejects.toThrow();
    expect(resetDbClientMock).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent timeouts so the pool is reset once per burst", async () => {
    process.env.NODE_ENV = "development";
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { withDevTimeout } = await loadHelper();
    const a = withDevTimeout(() => new Promise(() => {}), "a", 100);
    const b = withDevTimeout(() => new Promise(() => {}), "b", 100);
    const c = withDevTimeout(() => new Promise(() => {}), "c", 100);
    vi.advanceTimersByTime(101);
    await Promise.allSettled([a, b, c]);
    expect(resetDbClientMock).toHaveBeenCalledTimes(1);
  });

  it("retries the factory once when the first attempt fails with CONNECTION_DESTROYED", async () => {
    process.env.NODE_ENV = "development";
    const { withDevTimeout } = await loadHelper();
    const factory = vi
      .fn()
      .mockImplementationOnce(() => {
        const err = new Error("Failed query");
        (err as Error & { cause: unknown }).cause = {
          code: "CONNECTION_DESTROYED",
        };
        return Promise.reject(err);
      })
      .mockImplementationOnce(() => Promise.resolve("from-retry"));
    const result = await withDevTimeout(factory, "retry-test", 5_000);
    expect(result).toBe("from-retry");
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("detects CONNECTION_DESTROYED on the error itself (not just .cause)", async () => {
    process.env.NODE_ENV = "development";
    const { withDevTimeout } = await loadHelper();
    const factory = vi
      .fn()
      .mockImplementationOnce(() => {
        const err = new Error("write CONNECTION_DESTROYED") as Error & {
          code: string;
        };
        err.code = "CONNECTION_DESTROYED";
        return Promise.reject(err);
      })
      .mockImplementationOnce(() => Promise.resolve(7));
    const result = await withDevTimeout(factory, "retry-direct", 5_000);
    expect(result).toBe(7);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("does not retry more than once — a second CONNECTION_DESTROYED propagates", async () => {
    process.env.NODE_ENV = "development";
    const { withDevTimeout } = await loadHelper();
    const makeErr = () => {
      const err = new Error("Failed query");
      (err as Error & { cause: unknown }).cause = {
        code: "CONNECTION_DESTROYED",
      };
      return Promise.reject(err);
    };
    const factory = vi.fn(makeErr);
    await expect(
      withDevTimeout(factory, "twice", 5_000),
    ).rejects.toThrow("Failed query");
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("propagates non-CONNECTION_DESTROYED rejections without retrying", async () => {
    process.env.NODE_ENV = "development";
    const { withDevTimeout } = await loadHelper();
    const factory = vi
      .fn()
      .mockImplementationOnce(() => Promise.reject(new Error("boom")));
    await expect(withDevTimeout(factory, "rej", 5_000)).rejects.toThrow("boom");
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("is a no-op in production — calls factory once, never races, never retries", async () => {
    process.env.NODE_ENV = "production";
    const { withDevTimeout, DevQueryTimeoutError } = await loadHelper();
    let resolveInner: (value: string) => void = () => {};
    const inner = new Promise<string>((res) => {
      resolveInner = res;
    });
    const factory = vi.fn(() => inner);
    const racing = withDevTimeout(factory, "prod", 100);
    vi.advanceTimersByTime(60_000);
    resolveInner("done");
    const value = await racing;
    expect(value).toBe("done");
    expect(factory).toHaveBeenCalledTimes(1);
    expect(DevQueryTimeoutError).toBeDefined();
    expect(resetDbClientMock).not.toHaveBeenCalled();
  });
});
