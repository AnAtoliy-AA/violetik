/**
 * Next.js instrumentation entry point. Runs once per server worker at
 * startup. Kept intentionally thin: any Node-only work goes in a
 * dynamically-imported child module so the Edge runtime's static
 * analyzer doesn't trip over `process.on` etc. (a runtime guard alone
 * isn't enough — the warning fires at compile time).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
