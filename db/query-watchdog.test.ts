import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { installQueryWatchdog } from "./index";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

// Build a fake postgres-js client that's just enough to exercise the
// watchdog: `unsafe(...)` returns a thenable that exposes `cancel()`
// and can be settled (or left hanging) on demand. The real PendingQuery
// has many more methods but the watchdog only touches `.then` and
// `.cancel`.
type Pending<T> = Promise<T> & { cancel: ReturnType<typeof vi.fn> };

function makePending<T>(): {
  pending: Pending<T>;
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
  cancel: ReturnType<typeof vi.fn>;
} {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const cancel = vi.fn();
  const pending = Object.assign(promise, { cancel }) as Pending<T>;
  return { pending, resolve, reject, cancel };
}

function makeFakePg(unsafe: (...args: unknown[]) => unknown) {
  // Cast through unknown — the real PgClient has many more methods but
  // the watchdog only patches `unsafe`. Keeping the surface minimal
  // makes the test independent of postgres-js internals.
  return { unsafe } as unknown as Parameters<typeof installQueryWatchdog>[0];
}

describe("installQueryWatchdog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  });

  it("cancels a query that hasn't settled within 15s in dev", async () => {
    process.env.NODE_ENV = "development";
    const { pending, cancel } = makePending<unknown>();
    const pg = makeFakePg(() => pending);
    installQueryWatchdog(pg);

    // Trigger a query — schedules the 15s watchdog.
    void pg.unsafe("select 1");
    expect(cancel).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(15_000);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("does not cancel a query that settles before the watchdog fires", async () => {
    process.env.NODE_ENV = "development";
    const { pending, resolve, cancel } = makePending<number>();
    const pg = makeFakePg(() => pending);
    installQueryWatchdog(pg);

    const result = pg.unsafe("select 1");
    resolve(42);
    // Let the .then handler clear the timer.
    await vi.advanceTimersByTimeAsync(0);
    await result;

    // Advance well past the watchdog — cancel must NOT have fired.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(cancel).not.toHaveBeenCalled();
  });

  it("does not cancel a query that rejects before the watchdog fires", async () => {
    process.env.NODE_ENV = "development";
    const { pending, reject, cancel } = makePending<unknown>();
    const pg = makeFakePg(() => pending);
    installQueryWatchdog(pg);

    const result = pg.unsafe("select 1");
    reject(new Error("boom"));
    await vi.advanceTimersByTimeAsync(0);
    await expect(result as Promise<unknown>).rejects.toThrow("boom");

    await vi.advanceTimersByTimeAsync(60_000);
    expect(cancel).not.toHaveBeenCalled();
  });

  it("is a no-op in production: original unsafe is preserved, watchdog never schedules", async () => {
    process.env.NODE_ENV = "production";
    const { pending, cancel } = makePending<unknown>();
    const originalUnsafe = vi.fn(() => pending);
    const pg = makeFakePg(originalUnsafe);
    installQueryWatchdog(pg);

    // Same function identity → not patched.
    expect(pg.unsafe).toBe(originalUnsafe);

    void pg.unsafe("select 1");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(cancel).not.toHaveBeenCalled();
  });

  it("schedules an independent watchdog per call (so one slow query doesn't shadow another)", async () => {
    process.env.NODE_ENV = "development";
    const a = makePending<unknown>();
    const b = makePending<unknown>();
    let call = 0;
    const pg = makeFakePg(() => (call++ === 0 ? a.pending : b.pending));
    installQueryWatchdog(pg);

    void pg.unsafe("first");
    // Advance 10s, then issue a second query — its 15s timer should
    // run independently of the first.
    await vi.advanceTimersByTimeAsync(10_000);
    void pg.unsafe("second");

    // 5s more → first query's 15s timer fires, b's 15s hasn't.
    await vi.advanceTimersByTimeAsync(5_000);
    expect(a.cancel).toHaveBeenCalledTimes(1);
    expect(b.cancel).not.toHaveBeenCalled();

    // 10s more (20s total since `second`) → b's watchdog fires.
    await vi.advanceTimersByTimeAsync(10_000);
    expect(b.cancel).toHaveBeenCalledTimes(1);
  });
});
