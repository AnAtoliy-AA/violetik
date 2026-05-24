/**
 * Node-only side-effects executed at server startup. Imported lazily
 * from `instrumentation.ts` so the Edge bundle never sees
 * `process.on` (Next 16's edge-runtime static analyzer warns even
 * when the call is behind a runtime guard).
 *
 * Registers a process-level unhandledRejection handler scoped to
 * known-benign `postgres-js` errors:
 *
 *  - 57014 (statement_timeout)   — query canceled server-side
 *  - ECONNRESET / CONNECTION_ENDED — pooled conn dropped (often during HMR)
 *
 * Every caller of `db` already wraps queries in try/catch and falls
 * back gracefully (see db/site-settings.ts). The unhandled rejection
 * comes from `postgres-js`'s internal promise chain — a dangling
 * promise that's not the one the awaited query returned. Suppressing
 * it keeps dev logs readable and stops Node from killing the worker
 * under --unhandled-rejections=strict, without masking real bugs:
 * unknown rejections are still printed.
 */

export {};

const REGISTERED = Symbol.for("violetik:pg-unhandled-rejection-handler");

type WithCode = { code?: unknown } | null | undefined;

function shouldSuppress(reason: unknown): boolean {
  const code = (reason as WithCode)?.code;
  return code === "57014" || code === "ECONNRESET" || code === "CONNECTION_ENDED";
}

const flagged = process as unknown as Record<symbol, boolean>;
if (!flagged[REGISTERED]) {
  flagged[REGISTERED] = true;

  process.on("unhandledRejection", (reason) => {
    if (shouldSuppress(reason)) {
      const message = reason instanceof Error ? reason.message : String(reason);
      console.warn("[pg] suppressed unhandled rejection:", message);
      return;
    }
    console.error("Unhandled promise rejection:", reason);
  });
}
