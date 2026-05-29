# App Security Hardening — Design

**Date:** 2026-05-29
**Branch:** `feat/app-security-hardening` (off `develop`)
**Goal:** Harden the app against common web attacks, with emphasis on form/mutation abuse.

## Context

Audit of the existing posture found these strengths (leave untouched):

- Telegram auth is HMAC-SHA256 verified with `timingSafeEqual` ([auth.ts](../../../auth.ts)).
- `requireAdmin()` gates every admin server action ([shared/lib/auth-server.ts](../../../shared/lib/auth-server.ts)).
- Drizzle ORM parameterizes all SQL — no string-built queries, so no SQL injection.
- `submitBooking` already re-validates master eligibility server-side (anti-tampering).
- `POST /api/event` validates event names against an allow-list, caps batch size and payload keys.

Gaps this work closes:

1. **No HTTP security headers** — the app sends none. Missing clickjacking (X-Frame-Options),
   MIME-sniffing (nosniff), transport (HSTS), referrer, permissions, and CSP protection.
2. **No rate limiting** — public form actions and the analytics endpoint accept unlimited requests.
   Primary vector for spam bookings/testimonials/VIP requests and request-flood abuse.
3. **Uneven input validation** — `submitTestimonialAction` uses Zod, but `submitBooking` uses ad-hoc
   regex and `submitVipRequest` has no length cap on the free-text `note` (abuse/spam).

## Non-goals (YAGNI)

- **Distributed rate limiting** (Upstash/Vercel KV). The app runs at salon scale; in-memory limiting
  per instance is sufficient. Documented as the upgrade path if horizontally scaled.
- **CAPTCHA / Vercel BotID.** All mutating forms already require an authenticated session, which is the
  strongest bot gate available here. Revisit only if authenticated spam appears.
- **Nonce-based / strict-dynamic CSP.** Incompatible with this app: the Telegram Login Widget injects an
  external script and an inline `data-onauth="onTelegramAuth(user)"` handler, and the LocalBusiness
  JSON-LD is an inline `<script>`. Both require `'unsafe-inline'`. A nonce CSP would also force every
  page into dynamic rendering. Documented as a future hardening step if the widget is replaced.

## Design

### A. Security headers — `next.config.ts` `async headers()`

A single source-of-truth helper `shared/lib/security/headers.ts` exports `SECURITY_HEADERS` (array of
`{ key, value }`) consumed by `next.config.ts` for `source: "/(.*)"`.

| Header | Value | Defends against |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | protocol downgrade / SSL strip |
| `X-Frame-Options` | `DENY` | clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME confusion |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), browsing-topics=()` | unwanted feature/API access |
| `X-DNS-Prefetch-Control` | `on` | (perf; benign) |
| `Content-Security-Policy` | see below | XSS, data exfiltration, form hijack, clickjacking |

CSP (single line, origin-restricted, `'unsafe-inline'` retained for compatibility):

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://telegram.org;
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data: https:;
font-src 'self' data:;
connect-src 'self';
frame-src https://oauth.telegram.org https://telegram.org;
worker-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```

Rationale for the loosened directives: `script-src https://telegram.org` + `frame-src oauth.telegram.org`
are required by the login widget; `img-src https:` avoids whack-a-mole on Telegram/Google avatar CDNs
(images are low XSS risk); `'unsafe-inline'` for script/style is forced by the widget's inline handler,
the JSON-LD block, and Motion/Next inline styles. Everything else is tightened: external script/fetch
origins blocked, `form-action 'self'` blocks form hijacking, `frame-ancestors 'none'` blocks framing,
`object-src 'none'` blocks plugin injection.

### B. Rate limiting — `shared/lib/security/rate-limit.ts`

In-memory fixed-window limiter (mirrors the existing in-memory `slotCache` pattern). API:

```ts
function rateLimit(key: string, opts: { limit: number; windowMs: number }):
  { ok: true } | { ok: false; retryAfterMs: number };
```

- Map of `key -> { count, resetAt }`; lazily evicts expired entries on access.
- Pure and synchronous → trivially unit-testable with a fake clock (inject `now`).

Applied at the top of each public mutation:

| Caller | Key | Limit |
|---|---|---|
| `submitBooking` | `booking:<userId>` | 10 / 5 min |
| `submitTestimonialAction` | `testimonial:<userId>` | 5 / 10 min |
| `submitVipRequest` | `vip:<userId>` | 3 / 60 min |
| `POST /api/event` | `event:<ip>` | 100 / 1 min |

Each returns its existing typed failure shape extended with a `rate_limited` reason (no new error UI
required — forms already surface a generic failure toast; we add a localized "too many attempts" message).

### C. Validation hardening

- `submitBooking`: replace inline regex with a Zod schema (`serviceId`/`masterId` non-empty,
  `date` ISO `YYYY-MM-DD`, `time` `HH:MM`, `locale` in the supported set). Same `invalid_input` failure.
- `submitVipRequest`: Zod schema for `note` — trim, `max(500)`; over-length → `invalid_input`.

### D. Tests

- `shared/lib/security/rate-limit.test.ts` — allows under limit, blocks at limit, resets after window,
  isolates keys (fake clock).
- `shared/lib/security/headers.test.ts` — asserts presence + values of every required header and that the
  CSP contains the locked directives.
- Validation: extend/add unit tests for the booking and VIP schemas (reject bad date/time, over-length note).
- Verification: `npm run lint`, `npm test`, `npm run build` must pass before PR.

## Rollout

Single PR targeting `develop`. Headers and rate limits are additive and backward-compatible; no migration.
Post-merge, watch for CSP console violations in production and any avatar/login breakage (none expected).
