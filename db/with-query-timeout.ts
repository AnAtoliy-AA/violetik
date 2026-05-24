/**
 * Wraps a database query promise with a client-side timeout.
 *
 * Why: the Supabase Transaction pooler (port 6543) discards
 * `statement_timeout` settings sent by the client, so the only timeout
 * that actually fires is the server-side default (currently 2 minutes
 * on the `postgres` role). For queries on the SSR hot path (e.g.
 * `getSiteSettings` in the layout / proxy), a single hung query can
 * block a page render for 2 minutes. This helper enforces a client-
 * side bound so callers can fall back to defaults sooner.
 *
 * The underlying query is *not* canceled when the timeout fires — the
 * postgres-js promise keeps running in the background and may resolve
 * or reject later. That dangling rejection is swallowed by the
 * unhandledRejection handler registered in `instrumentation.ts`.
 */
export class QueryTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`Query "${label}" exceeded ${timeoutMs}ms client-side timeout`);
    this.name = "QueryTimeoutError";
  }
}

export function withQueryTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new QueryTimeoutError(label, timeoutMs)),
      timeoutMs,
    );
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
    // Attach a no-op catch to the original promise so that, if it
    // rejects after we've already returned via the timeout branch, the
    // rejection isn't reported as unhandled.
    promise.catch(() => {});
  });
}
