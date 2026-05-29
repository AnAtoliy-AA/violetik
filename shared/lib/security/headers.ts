/**
 * Site-wide HTTP security headers, consumed by `next.config.ts`'s
 * `headers()` for every route.
 *
 * CSP note: this app cannot use a nonce/strict-dynamic policy. The
 * Telegram Login Widget injects an external script from telegram.org and
 * an inline `data-onauth` handler, and the LocalBusiness JSON-LD is an
 * inline <script>; both require `'unsafe-inline'`. A nonce CSP would also
 * force every page into dynamic rendering. We instead keep `'unsafe-inline'`
 * for script/style but tightly restrict origins (connect/frame/object/
 * base-uri/form-action/frame-ancestors), which blocks data exfiltration,
 * form hijacking, framing/clickjacking, and plugin injection.
 */

/**
 * Builds the CSP string. In development, `'unsafe-eval'` is added to
 * `script-src`: React's dev runtime and Turbopack rely on eval() for HMR
 * and callstack reconstruction, and the browser blocks it without this.
 * It is never emitted in production (React never uses eval() there).
 */
export function buildCsp(isDev: boolean): string {
  const directives: Record<string, string> = {
    "default-src": "'self'",
    // 'unsafe-inline' required by the Telegram widget's inline onauth
    // handler and the JSON-LD block; telegram.org serves telegram-widget.js.
    // 'unsafe-eval' is dev-only (Turbopack/React HMR).
    "script-src": `'self' 'unsafe-inline' https://telegram.org${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    // 'unsafe-inline' required by Motion/Next runtime inline styles.
    "style-src": "'self' 'unsafe-inline'",
    // Avatars come from Telegram/Google CDNs and Vercel Blob; images are a
    // low XSS risk so any https source is permitted rather than enumerated.
    "img-src": "'self' blob: data: https:",
    "font-src": "'self' data:",
    // Same-origin only: analytics (/api/event) and booking slots are local.
    "connect-src": "'self'",
    // The Telegram login flow renders an oauth.telegram.org iframe.
    "frame-src": "https://oauth.telegram.org https://telegram.org",
    "worker-src": "'self'",
    "object-src": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "frame-ancestors": "'none'",
  };

  return [
    ...Object.entries(directives).map(([k, v]) => `${k} ${v}`),
    "upgrade-insecure-requests",
  ].join("; ");
}

const CSP = buildCsp(process.env.NODE_ENV !== "production");

export const SECURITY_HEADERS: ReadonlyArray<{ key: string; value: string }> = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Content-Security-Policy", value: CSP },
];
