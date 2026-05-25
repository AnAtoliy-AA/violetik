import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const resetDbClientMock = vi.fn();

vi.mock("./index", () => ({
  resetDbClient: resetDbClientMock,
}));

const makeDestroyedError = (): Error => {
  const err = new Error("Failed query");
  (err as Error & { cause: unknown }).cause = {
    code: "CONNECTION_DESTROYED",
  };
  return err;
};

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

  it("on primary timeout, recycles the pool AND retries the factory on the fresh pool", async () => {
    process.env.NODE_ENV = "development";
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { withDevTimeout } = await loadHelper();
    const factory = vi
      .fn()
      .mockImplementationOnce(() => new Promise(() => {})) // hangs forever
      .mockImplementationOnce(() => Promise.resolve("from-retry"));
    const promise = withDevTimeout(factory, "stuck", 100);
    vi.advanceTimersByTime(101);
    // Let microtasks run so the retry's Promise.resolve settles.
    await vi.advanceTimersByTimeAsync(0);
    await expect(promise).resolves.toBe("from-retry");
    expect(resetDbClientMock).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("rejects with DevQueryTimeoutError only if the post-reset retry also hangs past the hard cap", async () => {
    process.env.NODE_ENV = "development";
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { withDevTimeout, DevQueryTimeoutError } = await loadHelper();
    // Both attempts hang forever.
    const factory = vi.fn(() => new Promise(() => {}));
    const promise = withDevTimeout(factory, "double-stuck", 100);
    // Primary timer fires → reset + retry
    vi.advanceTimersByTime(101);
    // Hard timer fires at 100 + 10_000
    vi.advanceTimersByTime(10_000);
    await expect(promise).rejects.toBeInstanceOf(DevQueryTimeoutError);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(resetDbClientMock).toHaveBeenCalledTimes(1);
  });

  it("when one instance triggers reset, sibling instances retry immediately rather than waiting their own timer", async () => {
    process.env.NODE_ENV = "development";
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { withDevTimeout } = await loadHelper();

    // Sibling A: hangs forever on attempt 1, resolves on retry.
    const factoryA = vi
      .fn()
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockImplementationOnce(() => Promise.resolve("a-retry"));
    // Sibling B: same — hangs initially, resolves on retry.
    const factoryB = vi
      .fn()
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockImplementationOnce(() => Promise.resolve("b-retry"));

    // A has a tighter timer so it fires first.
    const a = withDevTimeout(factoryA, "a", 100);
    const b = withDevTimeout(factoryB, "b", 500);

    // A's primary timer fires at 100ms → reset + broadcast.
    vi.advanceTimersByTime(101);
    await vi.advanceTimersByTimeAsync(0);

    // B's primary timer would normally fire at 500ms, but the
    // broadcast at 100ms made it retry already.
    await expect(a).resolves.toBe("a-retry");
    await expect(b).resolves.toBe("b-retry");
    // B was retried before its own 500ms timer ever ran.
    expect(factoryB).toHaveBeenCalledTimes(2);
    // Only one pool reset (A's) — the broadcast didn't trigger another.
    expect(resetDbClientMock).toHaveBeenCalledTimes(1);
  });

  it("retries the factory once when the first attempt fails with CONNECTION_DESTROYED on .cause", async () => {
    process.env.NODE_ENV = "development";
    const { withDevTimeout } = await loadHelper();
    const factory = vi
      .fn()
      .mockImplementationOnce(() => Promise.reject(makeDestroyedError()))
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
    const factory = vi.fn(() => Promise.reject(makeDestroyedError()));
    await expect(withDevTimeout(factory, "twice", 5_000)).rejects.toThrow(
      "Failed query",
    );
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

  it("is a no-op in production — calls factory once, never races, never retries, registers no listener", async () => {
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
