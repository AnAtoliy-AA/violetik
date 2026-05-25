# Admin list refresh — design

**Date:** 2026-05-25
**Author:** brainstorming session

## Problem

Three admin list pages are server components with `dynamic = "force-dynamic"`:

- [app/[locale]/admin/vip-requests/page.tsx](../../../app/[locale]/admin/vip-requests/page.tsx) — pending VIP requests + active VIPs + recent expirations
- [app/[locale]/admin/bookings/page.tsx](../../../app/[locale]/admin/bookings/page.tsx) — all bookings, pending at the top
- [app/[locale]/admin/testimonials/page.tsx](../../../app/[locale]/admin/testimonials/page.tsx) — pending reviews + change requests + decided

Admin actions (approve, decline, confirm, …) use server actions with `revalidatePath`, so the list updates after the admin's own action. The gap: when a **user** submits a new request while an admin is sitting on the page, nothing updates until the admin hits browser-refresh. The admin can miss incoming work.

## Goal

Two refresh affordances, paired to per-page urgency:

- **Pattern A — manual** for vip-requests and testimonials (lower frequency, less time-critical). A small refresh icon-button placed in the page header. Clicking it calls `router.refresh()`. The page also auto-refreshes when the tab becomes visible (`document.visibilitychange`), so coming back to the tab after a few minutes shows current data without a click.
- **Pattern B — manual + polling badge** for bookings (time-sensitive — a slot can be racing another customer). Pattern A plus a 30-second background poll of a tiny pending-count endpoint. When the polled count exceeds the count rendered on initial server render, show a non-intrusive `"N new — refresh"` pill next to the icon-button. Clicking either the pill or the icon triggers `router.refresh()` and resets the baseline. Polling pauses while the tab is hidden.

The shared building block is a single `<RefreshButton/>` primitive in `shared/ui/`. The B-pattern's polling wrapper lives in `features/bookings-admin/`.

## Non-goals

- **No real-time push** (SSE / WebSockets / Server Push). Polling once every 30s is plenty for VIP request volume and is one `SELECT count(*)` per poll. Real-time can be revisited if the polling endpoint ever becomes hot.
- **No infinite scroll / virtualised lists.** Out of scope.
- **No reordering of list content on refresh.** `router.refresh()` already re-runs the RSC; the existing render order is the order admins see.
- **No notification when admin is on a *different* page** (e.g., browser tab notification, system notification). Could be revisited later; out of scope here.
- **No configurable poll interval.** 30 s is hard-coded as `BOOKINGS_POLL_INTERVAL_MS = 30_000`.

## Design

### New shared primitives

**1. `shared/ui/refresh-button/` — `<RefreshButton/>`**

Client component. Renders a 38×38 round icon-button matching the existing `circleButtonClass` in [widgets/app-header/ui/app-header.tsx](../../../widgets/app-header/ui/app-header.tsx) (back / menu buttons). A small refresh SVG icon, aria-label from a translation passed by the parent.

Props:

```ts
export interface RefreshButtonProps {
  /** Accessible label, e.g. translated "Refresh". */
  ariaLabel: string;
  /** Optional callback fired after router.refresh(). Used by the polling wrapper to reset its baseline. */
  onRefresh?: () => void;
  /** Disable the visibility-change auto-refresh (the polling wrapper handles it on its own). Default: false. */
  disableVisibilityRefresh?: boolean;
}
```

Behaviour:

- Click → `router.refresh()`, then call `onRefresh?.()`. While the refresh promise is pending, set an internal `pending` state so the icon shows a subtle spin animation; clear on settle.
- `useEffect` registers a `visibilitychange` listener: when `document.visibilityState === "visible"`, call `router.refresh()`. Unless `disableVisibilityRefresh` is set. The listener is removed on unmount.

This component is **the only place** that calls `router.refresh()`. The pill wrapper triggers refresh by calling the button's behaviour (see component composition below).

**2. `shared/ui/new-items-pill/` — `<NewItemsPill/>`**

Stateless presentational client component.

Props:

```ts
export interface NewItemsPillProps {
  count: number;       // > 0; parent decides when to render
  label: string;       // translated, e.g. "{n} new — refresh"
  onClick: () => void;
}
```

Renders a small rounded pill (`font-mono text-[10px] uppercase tracking-[0.18em]`) styled to match the existing gold/accent eyebrow language already used on admin pages. Button element (not a `<div>`), focusable, keyboard-activatable.

### Feature wrapper

**3. `features/bookings-admin/ui/bookings-refresh.tsx` — `<BookingsRefreshControls/>`**

Client component that composes `<RefreshButton/>` + `<NewItemsPill/>` and owns the polling logic.

Props:

```ts
export interface BookingsRefreshControlsProps {
  initialPendingCount: number;       // server-rendered baseline
  ariaRefreshLabel: string;          // translated "Refresh"
  newPendingLabel: (n: number) => string; // translated "{n} new — refresh"
}
```

State:

- `baseline` — starts at `initialPendingCount`, resets to current latest poll after a refresh
- `latest` — last successful poll result; on mount, equals `initialPendingCount`
- Derived: `delta = Math.max(0, latest - baseline)`. Render pill iff `delta > 0`.

Polling effect (single `useEffect`):

- On mount, start a `setInterval` of `BOOKINGS_POLL_INTERVAL_MS` (30 s).
- Each tick: only fetch if `document.visibilityState === "visible"`. Hit `GET /api/admin/bookings/pending-count`; on `200`, parse `{ count }` and update `latest`. On any non-200 or network error, log to `console.warn` and skip (no toast, no retry storm).
- Also do an immediate fetch on mount (no waiting 30 s for first signal).
- Cleanup clears the interval.

Visibility-change handler (single `useEffect`):

- When `document.visibilityState` transitions to `"visible"`, call the **refresh handler** (same path as a button click) — i.e., `router.refresh()` + baseline reset. The B-pattern's visibility behaviour matches the A-pattern: returning to the tab refreshes the list, period. The pill is for the case where the tab is open and the admin is staring at it.
- Cleanup removes the listener.

`<RefreshButton/>` is rendered with `disableVisibilityRefresh` so the wrapper owns visibility behaviour end-to-end (otherwise both would fire on focus).

Refresh handler:

- Calls `router.refresh()` (proxied through `<RefreshButton/>`).
- On settle, sets `baseline = latest` so the pill disappears.

Component layout:

```
<div className="flex items-center gap-2">
  {delta > 0 ? <NewItemsPill count={delta} label={…} onClick={refresh} /> : null}
  <RefreshButton ariaLabel={ariaRefreshLabel} onRefresh={resetBaseline} disableVisibilityRefresh />
</div>
```

### API route

**4. `app/api/admin/bookings/pending-count/route.ts`**

```ts
export async function GET(): Promise<Response> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    const status = gate.reason === "unauthorized" ? 401 : 403;
    return Response.json({ error: gate.reason }, { status });
  }
  const count = await countPendingBookings();
  return Response.json({ count }, {
    headers: { "Cache-Control": "no-store" },
  });
}
```

`countPendingBookings()` is a new tiny helper in [db/bookings.ts](../../../db/bookings.ts) — a single `SELECT count(*) FROM bookings WHERE status='pending'`, wrapped in `withDevTimeout`. Returns `0` if `db` is null (matches the existing `if (!db) return null` pattern style, but `0` is the meaningful zero-state).

### Widget change

**5. `widgets/app-header/ui/app-header.tsx` — `actions` slot**

Add a single optional prop and render slot:

```ts
export interface AppHeaderProps extends HTMLAttributes<HTMLElement> {
  // …existing…
  /** Extra controls rendered in the right zone, before LocaleSwitcher. */
  actions?: ReactNode;
}
```

Right-zone JSX becomes:

```tsx
<div className="flex items-center gap-2">
  {actions}
  <LocaleSwitcher />
  {menu}
</div>
```

No behavioural change when `actions` is undefined. Existing call sites are untouched.

### Page wiring

**6. `app/[locale]/admin/vip-requests/page.tsx`**

```tsx
<AppHeader
  back="/admin"
  title={t("meta_title")}
  admin
  actions={<RefreshButton ariaLabel={t("cta_refresh")} />}
/>
```

**7. `app/[locale]/admin/testimonials/page.tsx`** — same shape, using `AdminTestimonials.cta_refresh`.

**8. `app/[locale]/admin/bookings/page.tsx`**

The page already runs `await listBookingsForAdmin()`. Derive `initialPendingCount` from that array (`bookings.filter(b => b.status === "pending").length`) so there's no extra DB call on the page render itself:

```tsx
<AppHeader
  back="/admin"
  title={t("meta_title")}
  admin
  actions={
    <BookingsRefreshControls
      initialPendingCount={pendingCount}
      ariaRefreshLabel={t("cta_refresh")}
      newPendingLabel={(n) => t("n_new_pending", { n })}
    />
  }
/>
```

### Translation keys

Per locale (`en`, `ru`, `be`):

- `AdminBookings.cta_refresh` — "Refresh"
- `AdminBookings.n_new_pending` — "{n} new — refresh"
- `AdminVipRequests.cta_refresh` — "Refresh"
- `AdminTestimonials.cta_refresh` — "Refresh"

Exact translation copy can be polished during implementation.

## Component placement (FSD)

| File | Layer | Why |
|---|---|---|
| `shared/ui/refresh-button/` | shared | Generic UI primitive, no business logic. Reusable. |
| `shared/ui/new-items-pill/` | shared | Generic UI primitive. |
| `features/bookings-admin/ui/bookings-refresh.tsx` | features | Bookings-specific wiring of polling + endpoint URL + i18n. |
| `app/api/admin/bookings/pending-count/route.ts` | app (API) | Matches existing API convention ([app/api/booking/slots/route.ts](../../../app/api/booking/slots/route.ts)). |
| `db/bookings.ts` — `countPendingBookings()` | db | Existing module. |

## Testing

### Unit (Vitest)

- **`shared/ui/refresh-button/ui/refresh-button.test.tsx`**
  - Click calls `router.refresh()` (mock `useRouter` from `@/i18n/navigation`).
  - `onRefresh` callback fires after `router.refresh()` resolves.
  - `visibilitychange` to `"visible"` triggers `router.refresh()`.
  - `disableVisibilityRefresh` suppresses the listener.

- **`shared/ui/new-items-pill/ui/new-items-pill.test.tsx`**
  - Renders the label.
  - Click invokes `onClick`.
  - Keyboard activation (Enter, Space) invokes `onClick`.

- **`features/bookings-admin/ui/bookings-refresh.test.tsx`** — uses `vi.useFakeTimers()` and stubs `global.fetch`:
  - On mount, immediately fetches `/api/admin/bookings/pending-count`.
  - On interval tick (advance 30 s), fetches again.
  - When response count > baseline, pill appears with correct delta.
  - Clicking the pill calls `router.refresh()` and the pill disappears (baseline reset).
  - When `document.visibilityState === "hidden"`, the interval tick is a no-op.
  - When tab becomes visible after being hidden, an immediate fetch is fired.
  - Failed fetch (non-200 or thrown) logs to `console.warn` but does not throw or stop the interval.

- **`app/api/admin/bookings/pending-count/route.test.ts`**
  - Returns 401 with the `unauthorized` reason when no session.
  - Returns 401 with `forbidden` when not admin.
  - Returns `{ count: n }` for an admin with `n` mocked from `countPendingBookings`.

- **`db/bookings.test.ts`** — add `countPendingBookings` test (in line with how existing list tests are structured).

- **`widgets/app-header/ui/app-header.test.tsx`** — extend existing test to assert that an `actions` node is rendered in the right zone, and that the back / menu / locale-switcher continue to render correctly.

### Storybook

- `shared/ui/refresh-button/ui/refresh-button.stories.tsx` — default + with `disableVisibilityRefresh`.
- `shared/ui/new-items-pill/ui/new-items-pill.stories.tsx` — counts 1, 5, 99.
- `widgets/app-header/ui/app-header.stories.tsx` — extend existing story with an `actions` variant.

(Stories also run as tests via `vitest`'s `storybook` project per [vitest.config.ts](../../../vitest.config.ts).)

### Manual

- Open two browsers signed in as the same admin. In browser A, submit a booking request as a customer (separate session). Browser B's admin page should show `"1 new — refresh"` within ~30 s. Click → list updates.
- Open the admin bookings page, switch to another tab for >30 s, switch back. The page should refresh automatically without showing a pill (because the page was hidden, no poll fired; on visibility, we hit refresh-on-focus which re-renders the list).
- vip-requests + testimonials: open page, leave it for >1 min, in another session add a new pending row, click the refresh icon → list updates. Switch away and back → updates without click.

## Edge cases

- **Polling endpoint slower than 30 s** — `fetch` does not abort; if a tick is mid-flight when the next interval fires, both run concurrently. The harm is a single redundant query. We do not stack a queue or use AbortController for the first cut.
- **`router.refresh()` from inside an effect** — React may warn about state updates during render if the visibility listener fires on the very first mount before paint. The listener is registered inside `useEffect`, so it cannot fire before mount. Safe.
- **Tab hidden when count changes** — by design, we do not poll. When the tab becomes visible, we do an immediate `router.refresh()` (refresh-on-focus) which re-renders the whole list including pending. The pill briefly flashes if the immediate poll completes before refresh — acceptable; the click target works either way.
- **`db` is `null` in tests / dev with no DB** — `countPendingBookings` returns `0`. The endpoint returns `{ count: 0 }`. The pill never appears. No errors.
- **i18n key missing in one locale** — caught at next-intl build time. Standard.
- **`<RefreshButton/>` outside a Next.js router context** — the visibility listener will be a no-op (no router); but Storybook needs `useRouter` to be mockable. The shared button accepts `useRouter` from `@/i18n/navigation`; Storybook provides a `NextIntlClientProvider` already. We add a `parameters.nextjs.router` mock in the story.

## Risk

Low. All additions are net-new files except for three:

- `widgets/app-header/ui/app-header.tsx` — additive optional prop, no existing call sites change.
- `db/bookings.ts` — new export, no existing changes.
- Three `app/[locale]/admin/*/page.tsx` files — one new prop on `<AppHeader/>`.

No DB schema changes. No env var changes. The polling endpoint is `requireAdmin()`-gated, so it's not a public surface.

## What stays the same

- All existing server actions (`approveVipRequest`, `confirmBooking`, …) keep using `revalidatePath` for the admin's own actions.
- `dynamic = "force-dynamic"` on all admin pages.
- `AppHeader` default behaviour (no `actions` prop = identical to today).
- All non-admin pages are unaffected.
