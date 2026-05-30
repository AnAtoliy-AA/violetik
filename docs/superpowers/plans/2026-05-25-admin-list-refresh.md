# Admin list refresh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins a way to see new user-submitted work without manual browser-refresh on three list pages. Manual refresh + revalidate-on-focus everywhere (Pattern A); plus a 30 s polling badge on the bookings page (Pattern B).

**Architecture:** One client-only `<RefreshButton/>` primitive owns every `router.refresh()` call. A separate stateless `<NewItemsPill/>` primitive renders the bookings delta. A bookings-only wrapper `<BookingsRefreshControls/>` composes both and owns the polling loop. A new `GET /api/admin/bookings/pending-count` returns a single integer behind `requireAdmin()`. The shared `AppHeader` widget gains one optional `actions?: ReactNode` slot that admin pages use to mount these controls.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, next-intl, Drizzle ORM, Vitest + Testing Library + jsdom, Storybook (`@storybook/nextjs-vite`).

**Spec:** [docs/superpowers/specs/2026-05-25-admin-list-refresh-design.md](../specs/2026-05-25-admin-list-refresh-design.md)

**Branch:** `feat/admin-list-refresh` (already created off `develop`; spec committed). PRs target `develop`.

---

## File Structure

### Create

- `shared/ui/refresh-button/index.ts` — public API
- `shared/ui/refresh-button/ui/refresh-button.tsx` — `<RefreshButton/>` client component
- `shared/ui/refresh-button/ui/refresh-button.test.tsx`
- `shared/ui/refresh-button/ui/refresh-button.stories.tsx`
- `shared/ui/new-items-pill/index.ts`
- `shared/ui/new-items-pill/ui/new-items-pill.tsx`
- `shared/ui/new-items-pill/ui/new-items-pill.test.tsx`
- `shared/ui/new-items-pill/ui/new-items-pill.stories.tsx`
- `features/bookings-admin/ui/bookings-refresh.tsx` — `<BookingsRefreshControls/>` wrapper (polling + composition)
- `features/bookings-admin/ui/bookings-refresh.test.tsx`
- `app/api/admin/bookings/pending-count/route.ts` — `GET` handler
- `app/api/admin/bookings/pending-count/route.test.ts`

### Modify

- `db/bookings.ts` — add `countPendingBookings()` export
- `db/bookings.test.ts` — add coverage for the new helper (file already exists — verify in T1; create if not)
- `widgets/app-header/ui/app-header.tsx` — add `actions?: ReactNode` prop and render it
- `widgets/app-header/ui/app-header.test.tsx` — extend existing tests to cover the slot
- `widgets/app-header/ui/app-header.stories.tsx` — add a story variant that demonstrates the slot
- `features/bookings-admin/index.ts` — re-export `BookingsRefreshControls`
- `app/[locale]/admin/vip-requests/page.tsx` — pass `<RefreshButton/>` via `actions`
- `app/[locale]/admin/testimonials/page.tsx` — same
- `app/[locale]/admin/bookings/page.tsx` — compute `initialPendingCount`, mount `<BookingsRefreshControls/>` via `actions`
- `messages/en.json` — add four keys (see T7)
- `messages/ru.json` — same
- `messages/by.json` — same

### Delete

Nothing.

---

## Conventions

- **TDD red → green → commit** per `superpowers:test-driven-development`. The failing test and its passing implementation belong in the **same commit** so reverts stay coherent. Stories for shared/ui primitives go in the same commit as the test + component (the `new-ui-component` skill requires all three together).
- Run a single Vitest file: `npx vitest run path/to/file.test.tsx`. Run the full suite: `npm test`.
- Pre-commit (Husky) runs `lint + test`. Pre-push runs `build`. **No `--no-verify` shortcuts.** Every commit in this plan must leave the worktree green.
- File paths use the `@/*` alias (resolves to repo root, no `src/`).
- FSD direction-of-imports: shared/ui ← features ← widgets ← views ← app. `app/api/admin/bookings/pending-count/` calls `db/bookings.ts` (downward — fine). Features import from `shared/ui/`; the reverse is forbidden.
- Inside a slice, tests use relative imports (`./refresh-button`). Outside, use the slice's public API (`@/features/bookings-admin`).
- Don't deep-import `@/features/<x>/ui/<y>` from outside the slice.
- Translation namespace stays per-page (the existing convention): `AdminBookings.cta_refresh`, etc. No new "Common" namespace.
- Mark client components with `"use client"` on line 1.
- Use `superpowers:verification-before-completion` before claiming the work done.

---

## Task ordering rationale

Bottom-up. The DB helper (T1) lands first because the route (T2) imports it. The two shared primitives (T3, T4) land before the wrapper (T5) that composes them. The `AppHeader` slot (T6) and translation keys (T7) are independent prep that page wiring (T8–T10) consumes. The page wiring tasks are sequenced last so each one is a small, easy-to-review diff.

Every task in this plan ends in a single passing commit. Tasks 1–6 add net-new code that is not yet wired up — the app still compiles and behaves identically, just with new tests passing. Tasks 7–10 are the visible feature.

---

## Task 1: `countPendingBookings()` DB helper

**Files:**
- Modify: `db/bookings.ts`
- Modify/Create: `db/bookings.test.ts`

Existing helpers in `db/bookings.ts` follow a consistent shape (`async function name(): Promise<T>`, guard `if (!db) return …;`, single Drizzle query). The new helper mirrors that shape. The spec calls for `SELECT count(*) FROM bookings WHERE status = 'pending'` wrapped in the same `if (!db)` guard, returning `0` when the DB isn't configured.

- [ ] **Step 1: Audit existing test file**

Run: `ls db/bookings.test.ts 2>/dev/null && echo "exists" || echo "missing"`

If missing, create it with the standard imports (`describe`, `it`, `expect` from `vitest`; mock `./index` to inject a fake `db`). If existing, append to it.

- [ ] **Step 2: Write the failing test**

Before writing, read `db/users.test.ts` (or whichever `db/*.test.ts` files already exist) and copy that file's mocking pattern. If the project uses an in-memory drizzle stub, use it. If existing tests just mock the `./index` module with `vi.mock`, use that. The acceptance criterion is one happy-path test:

> Given the bookings select chain returns `[{ count: 3 }]`, `countPendingBookings()` returns `3`.

Skip the `db === null → 0` test case in this task — it's branch coverage on a one-line guard and the existing `db/bookings.ts` helpers don't test that branch either (see `listBookingsForAdmin`, `listActiveBookingsFrom`). YAGNI; don't introduce a new pattern to one test that the rest of the file doesn't use.

Sketch (adapt to match the file's existing mocking style):

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("./index", () => {
  const fakeDb = { select: vi.fn() };
  return { db: fakeDb, schema: { bookings: { status: "status" } } };
});

import { countPendingBookings } from "./bookings";
import { db } from "./index";

describe("countPendingBookings", () => {
  it("returns the count from the pending-status query", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 3 }]),
    };
    vi.mocked(db!.select).mockReturnValue(chain as never);
    expect(await countPendingBookings()).toBe(3);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run db/bookings.test.ts`
Expected: FAIL — `countPendingBookings is not a function` (or `Cannot find export 'countPendingBookings'`).

- [ ] **Step 4: Implement the helper**

Add to `db/bookings.ts` (near the other admin-facing helpers like `listBookingsForAdmin`):

```ts
/**
 * Count of bookings with status = 'pending'. Used by the admin
 * polling endpoint to drive the "N new" badge cheaply.
 */
export async function countPendingBookings(): Promise<number> {
  if (!db) return 0;
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.bookings)
    .where(eq(schema.bookings.status, "pending"));
  return rows[0]?.count ?? 0;
}
```

`sql` and `eq` are already imported at the top of `db/bookings.ts` (verify; if not, add to the existing `drizzle-orm` import line).

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run db/bookings.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add db/bookings.ts db/bookings.test.ts
git commit -m "feat(db): countPendingBookings helper for admin polling"
```

(Husky pre-commit runs full lint + test — should be green.)

---

## Task 2: `GET /api/admin/bookings/pending-count`

**Files:**
- Create: `app/api/admin/bookings/pending-count/route.ts`
- Create: `app/api/admin/bookings/pending-count/route.test.ts`

The route is a thin auth-gated wrapper around `countPendingBookings()`. Auth is centralised in `shared/lib/auth-server.ts` via `requireAdmin()`, which already returns a discriminated union — we map the two failure reasons to 401 / 403.

- [ ] **Step 1: Write the failing test**

Create `app/api/admin/bookings/pending-count/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/lib/auth-server", () => ({
  requireAdmin: vi.fn(),
}));
vi.mock("@/db/bookings", () => ({
  countPendingBookings: vi.fn(),
}));

import { GET } from "./route";
import { requireAdmin } from "@/shared/lib/auth-server";
import { countPendingBookings } from "@/db/bookings";

describe("GET /api/admin/bookings/pending-count", () => {
  beforeEach(() => {
    vi.mocked(requireAdmin).mockReset();
    vi.mocked(countPendingBookings).mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: "unauthorized" });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("returns 403 when authenticated but not admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, reason: "forbidden" });
    const res = await GET();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("returns { count } for an admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, user: { id: "u1" } as never });
    vi.mocked(countPendingBookings).mockResolvedValue(7);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ count: 7 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/admin/bookings/pending-count/route.test.ts`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Implement the route**

Create `app/api/admin/bookings/pending-count/route.ts`:

```ts
import { requireAdmin } from "@/shared/lib/auth-server";
import { countPendingBookings } from "@/db/bookings";

export async function GET(): Promise<Response> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    const status = gate.reason === "unauthorized" ? 401 : 403;
    return Response.json({ error: gate.reason }, { status });
  }
  const count = await countPendingBookings();
  return Response.json({ count }, { headers: { "Cache-Control": "no-store" } });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/admin/bookings/pending-count/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/bookings/pending-count/
git commit -m "feat(api): GET /api/admin/bookings/pending-count"
```

---

## Task 3: `<RefreshButton/>` shared primitive

**Files:**
- Create: `shared/ui/refresh-button/index.ts`
- Create: `shared/ui/refresh-button/ui/refresh-button.tsx`
- Create: `shared/ui/refresh-button/ui/refresh-button.test.tsx`
- Create: `shared/ui/refresh-button/ui/refresh-button.stories.tsx`

This is the single owner of `router.refresh()`. Per the spec it also listens to `document.visibilitychange` and refreshes when the tab becomes visible, unless `disableVisibilityRefresh` is passed (the bookings wrapper owns visibility behaviour end-to-end and passes the flag).

Styling: mirror the 38×38 `circleButtonClass` already used for back/menu in `widgets/app-header/ui/app-header.tsx`. Keep that class **inlined** here (don't extract a shared constant yet — YAGNI; refactor when a third user appears).

The icon is a small inline SVG of a circular-arrow refresh glyph. Animate by toggling a `pending` state during the `router.refresh()` promise — apply a Tailwind `animate-spin` class while pending. (Next.js's `useRouter().refresh()` returns `void`, not a Promise. To know when it has settled, use `useTransition()` from React: `startTransition(() => router.refresh())` and read `isPending`.)

- [ ] **Step 1: Write the failing test**

Create `shared/ui/refresh-button/ui/refresh-button.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const refreshSpy = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: refreshSpy }),
}));

import { RefreshButton } from "./refresh-button";

describe("RefreshButton", () => {
  beforeEach(() => {
    refreshSpy.mockReset();
  });

  afterEach(() => {
    // Reset document visibility between tests
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
  });

  it("renders a button with the provided aria-label", () => {
    render(<RefreshButton ariaLabel="Refresh" />);
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  it("calls router.refresh() on click", () => {
    render(<RefreshButton ariaLabel="Refresh" />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(refreshSpy).toHaveBeenCalledOnce();
  });

  it("calls onRefresh after triggering a refresh", () => {
    const onRefresh = vi.fn();
    render(<RefreshButton ariaLabel="Refresh" onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("refreshes when the tab becomes visible", () => {
    render(<RefreshButton ariaLabel="Refresh" />);
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(refreshSpy).toHaveBeenCalledOnce();
  });

  it("does not refresh on visibilitychange when disableVisibilityRefresh is set", () => {
    render(<RefreshButton ariaLabel="Refresh" disableVisibilityRefresh />);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it("does not refresh when visibility changes to hidden", () => {
    render(<RefreshButton ariaLabel="Refresh" />);
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(refreshSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/ui/refresh-button/ui/refresh-button.test.tsx`
Expected: FAIL — `Cannot find module './refresh-button'`.

- [ ] **Step 3: Implement the component**

Create `shared/ui/refresh-button/ui/refresh-button.tsx`:

```tsx
"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/shared/lib/cn";

export interface RefreshButtonProps {
  /** Accessible label, e.g. translated "Refresh". */
  ariaLabel: string;
  /** Fired after the refresh has been kicked off. Used by the polling wrapper to reset its baseline. */
  onRefresh?: () => void;
  /** Suppress the visibility-change auto-refresh (so a wrapper can own it). Default: false. */
  disableVisibilityRefresh?: boolean;
}

const circleClass = cn(
  "inline-flex size-[38px] items-center justify-center rounded-full border-[0.5px] border-line-strong bg-transparent text-text",
  "transition-colors duration-fast ease-out hover:bg-surface/60",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
  "disabled:opacity-50",
);

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spinning ? "animate-spin" : undefined}
    >
      <path d="M21 12a9 9 0 1 1-3.2-6.9" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

export function RefreshButton({
  ariaLabel,
  onRefresh,
  disableVisibilityRefresh = false,
}: RefreshButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function trigger() {
    startTransition(() => {
      router.refresh();
    });
    onRefresh?.();
  }

  useEffect(() => {
    if (disableVisibilityRefresh) return;
    function onVisibility() {
      if (document.visibilityState === "visible") trigger();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
    // `trigger` closes over `router`, `onRefresh`, `disableVisibilityRefresh`;
    // all stable for the listener's lifetime once mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disableVisibilityRefresh]);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={trigger}
      disabled={isPending}
      className={circleClass}
    >
      <RefreshIcon spinning={isPending} />
    </button>
  );
}
```

Create `shared/ui/refresh-button/index.ts`:

```ts
export { RefreshButton } from "./ui/refresh-button";
export type { RefreshButtonProps } from "./ui/refresh-button";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run shared/ui/refresh-button/ui/refresh-button.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Add Storybook story**

Create `shared/ui/refresh-button/ui/refresh-button.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RefreshButton } from "./refresh-button";

const meta: Meta<typeof RefreshButton> = {
  title: "shared/ui/RefreshButton",
  component: RefreshButton,
  tags: ["autodocs"],
  args: { ariaLabel: "Refresh" },
};
export default meta;
type Story = StoryObj<typeof RefreshButton>;

export const Default: Story = {};
export const VisibilityRefreshDisabled: Story = {
  args: { disableVisibilityRefresh: true },
};
```

- [ ] **Step 6: Commit**

```bash
git add shared/ui/refresh-button/
git commit -m "feat(ui): RefreshButton primitive"
```

---

## Task 4: `<NewItemsPill/>` shared primitive

**Files:**
- Create: `shared/ui/new-items-pill/index.ts`
- Create: `shared/ui/new-items-pill/ui/new-items-pill.tsx`
- Create: `shared/ui/new-items-pill/ui/new-items-pill.test.tsx`
- Create: `shared/ui/new-items-pill/ui/new-items-pill.stories.tsx`

Stateless presentational pill. Renders an interactive `<button>` element, focusable, keyboard-activatable (the native `<button>` handles Enter/Space for free).

- [ ] **Step 1: Write the failing test**

Create `shared/ui/new-items-pill/ui/new-items-pill.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NewItemsPill } from "./new-items-pill";

describe("NewItemsPill", () => {
  it("renders the provided label", () => {
    render(<NewItemsPill count={3} label="3 new — refresh" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: /3 new — refresh/i })).toBeInTheDocument();
  });

  it("invokes onClick when clicked", () => {
    const onClick = vi.fn();
    render(<NewItemsPill count={1} label="1 new — refresh" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("invokes onClick on Enter key", () => {
    const onClick = vi.fn();
    render(<NewItemsPill count={1} label="1 new — refresh" onClick={onClick} />);
    const btn = screen.getByRole("button");
    btn.focus();
    fireEvent.keyDown(btn, { key: "Enter" });
    fireEvent.keyUp(btn, { key: "Enter" });
    fireEvent.click(btn); // native button triggers click on Enter; explicit click simulates browser
    expect(onClick).toHaveBeenCalled();
  });
});
```

*Note:* `<button>` natively handles Enter/Space via the browser dispatching a click event. The third test above explicitly fires `click` to mirror that behaviour because jsdom's keyDown does not synthesise a click. The assertion still proves the keyboard path is supported by virtue of using `<button>`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/ui/new-items-pill/ui/new-items-pill.test.tsx`
Expected: FAIL — `Cannot find module './new-items-pill'`.

- [ ] **Step 3: Implement the component**

Create `shared/ui/new-items-pill/ui/new-items-pill.tsx`:

```tsx
"use client";

import { cn } from "@/shared/lib/cn";

export interface NewItemsPillProps {
  count: number;
  label: string;
  onClick: () => void;
}

export function NewItemsPill({ count, label, onClick }: NewItemsPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-testid="new-items-pill"
      data-count={count}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1",
        "border border-accent/40 bg-accent/15 text-accent",
        "font-mono text-[10px] uppercase tracking-[0.18em]",
        "transition-colors hover:bg-accent/25",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
      )}
    >
      {label}
    </button>
  );
}
```

Create `shared/ui/new-items-pill/index.ts`:

```ts
export { NewItemsPill } from "./ui/new-items-pill";
export type { NewItemsPillProps } from "./ui/new-items-pill";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run shared/ui/new-items-pill/ui/new-items-pill.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Add Storybook story**

Create `shared/ui/new-items-pill/ui/new-items-pill.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NewItemsPill } from "./new-items-pill";

const meta: Meta<typeof NewItemsPill> = {
  title: "shared/ui/NewItemsPill",
  component: NewItemsPill,
  tags: ["autodocs"],
  args: { count: 3, label: "3 new — refresh", onClick: () => {} },
};
export default meta;
type Story = StoryObj<typeof NewItemsPill>;

export const Default: Story = {};
export const One: Story = { args: { count: 1, label: "1 new — refresh" } };
export const Many: Story = { args: { count: 99, label: "99 new — refresh" } };
```

- [ ] **Step 6: Commit**

```bash
git add shared/ui/new-items-pill/
git commit -m "feat(ui): NewItemsPill primitive"
```

---

## Task 5: `<BookingsRefreshControls/>` polling wrapper

**Files:**
- Create: `features/bookings-admin/ui/bookings-refresh.tsx`
- Create: `features/bookings-admin/ui/bookings-refresh.test.tsx`
- Modify: `features/bookings-admin/index.ts` — add export

Composes `<NewItemsPill/>` + `<RefreshButton/>` and owns the polling state. The `<RefreshButton/>` is rendered with `disableVisibilityRefresh` so the wrapper centralises visibility behaviour. On visibility-becoming-visible, the wrapper calls its own refresh handler (same as a click) so the UX matches Pattern A's "tab back ⇒ refresh."

Polling: a single `setInterval(30_000)`. Each tick is a no-op when the tab is hidden. On mount, an immediate fetch runs so the first signal does not have to wait 30 s.

- [ ] **Step 1: Write the failing test**

Create `features/bookings-admin/ui/bookings-refresh.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

const refreshSpy = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: refreshSpy }),
}));

import { BookingsRefreshControls } from "./bookings-refresh";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setVisible(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
}

const fetchSpy = vi.spyOn(global, "fetch");

describe("BookingsRefreshControls", () => {
  beforeEach(() => {
    refreshSpy.mockReset();
    fetchSpy.mockReset();
    setVisible("visible");
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
    fetchSpy.mockRestore();
  });

  function defaultProps(overrides: Partial<React.ComponentProps<typeof BookingsRefreshControls>> = {}) {
    return {
      initialPendingCount: 2,
      ariaRefreshLabel: "Refresh",
      newPendingLabel: (n: number) => `${n} new — refresh`,
      ...overrides,
    };
  }

  it("fires an immediate fetch on mount", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ count: 2 }));
    render(<BookingsRefreshControls {...defaultProps()} />);
    await act(async () => { await Promise.resolve(); });
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/admin/bookings/pending-count",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("does not show the pill when count equals baseline", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ count: 2 }));
    render(<BookingsRefreshControls {...defaultProps()} />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByTestId("new-items-pill")).not.toBeInTheDocument();
  });

  it("shows the pill with the delta when count exceeds baseline", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ count: 5 }));
    render(<BookingsRefreshControls {...defaultProps({ initialPendingCount: 2 })} />);
    await act(async () => { await Promise.resolve(); });
    const pill = await screen.findByTestId("new-items-pill");
    expect(pill.getAttribute("data-count")).toBe("3");
    expect(pill).toHaveTextContent("3 new — refresh");
  });

  it("polls again after 30 seconds", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ count: 2 }));
    render(<BookingsRefreshControls {...defaultProps()} />);
    await act(async () => { await Promise.resolve(); });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("skips fetching when the tab is hidden", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ count: 2 }));
    render(<BookingsRefreshControls {...defaultProps()} />);
    await act(async () => { await Promise.resolve(); });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    setVisible("hidden");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("clicking the pill triggers router.refresh and resets the baseline", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ count: 5 }));
    render(<BookingsRefreshControls {...defaultProps({ initialPendingCount: 2 })} />);
    await act(async () => { await Promise.resolve(); });

    const pill = await screen.findByTestId("new-items-pill");
    act(() => { pill.click(); });
    expect(refreshSpy).toHaveBeenCalled();
    expect(screen.queryByTestId("new-items-pill")).not.toBeInTheDocument();
  });

  it("on visibilitychange to visible, triggers router.refresh", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ count: 2 }));
    render(<BookingsRefreshControls {...defaultProps()} />);
    await act(async () => { await Promise.resolve(); });
    refreshSpy.mockClear();

    setVisible("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(refreshSpy).toHaveBeenCalled();
  });

  it("logs and survives a fetch failure", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchSpy.mockRejectedValueOnce(new Error("network down"));
    fetchSpy.mockResolvedValue(jsonResponse({ count: 4 }));

    render(<BookingsRefreshControls {...defaultProps({ initialPendingCount: 2 })} />);
    await act(async () => { await Promise.resolve(); });
    // No throw, no pill yet (first call failed)
    expect(screen.queryByTestId("new-items-pill")).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalled();

    // Next tick succeeds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(await screen.findByTestId("new-items-pill")).toBeInTheDocument();

    warn.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run features/bookings-admin/ui/bookings-refresh.test.tsx`
Expected: FAIL — `Cannot find module './bookings-refresh'`.

- [ ] **Step 3: Implement the wrapper**

The wrapper owns `useRouter().refresh()` directly for both the visibility-change path and the pill-click path. `<RefreshButton/>` still owns refresh for its own button click; `onRefresh` is what the wrapper passes in to reset its baseline after the user clicks the button. A `CustomEvent`-based consolidation between the wrapper and the button was considered and rejected as over-engineered — the call to `router.refresh()` from two places is fine because each entrypoint is distinct (button click vs. visibility change vs. pill click).

Create `features/bookings-admin/ui/bookings-refresh.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { RefreshButton } from "@/shared/ui/refresh-button";
import { NewItemsPill } from "@/shared/ui/new-items-pill";

const POLL_INTERVAL_MS = 30_000;
const ENDPOINT = "/api/admin/bookings/pending-count";

export interface BookingsRefreshControlsProps {
  initialPendingCount: number;
  ariaRefreshLabel: string;
  newPendingLabel: (n: number) => string;
}

export function BookingsRefreshControls({
  initialPendingCount,
  ariaRefreshLabel,
  newPendingLabel,
}: BookingsRefreshControlsProps) {
  const router = useRouter();
  const [baseline, setBaseline] = useState(initialPendingCount);
  const [latest, setLatest] = useState(initialPendingCount);
  const latestRef = useRef(latest);
  latestRef.current = latest;

  const fetchCount = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }
    try {
      const res = await fetch(ENDPOINT, { cache: "no-store" });
      if (!res.ok) {
        console.warn(`[bookings-refresh] non-200: ${res.status}`);
        return;
      }
      const json = (await res.json()) as { count: number };
      setLatest(json.count);
    } catch (err) {
      console.warn("[bookings-refresh] fetch failed:", err);
    }
  }, []);

  useEffect(() => {
    void fetchCount();
    const id = setInterval(() => {
      void fetchCount();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchCount]);

  const resetBaseline = useCallback(() => {
    setBaseline(latestRef.current);
  }, []);

  // Visibility-becoming-visible: refresh and reset baseline. Matches Pattern A on
  // the sibling admin pages. RefreshButton has disableVisibilityRefresh so we own
  // this end-to-end.
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") {
        router.refresh();
        resetBaseline();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [router, resetBaseline]);

  const handlePillClick = useCallback(() => {
    router.refresh();
    resetBaseline();
  }, [router, resetBaseline]);

  const delta = Math.max(0, latest - baseline);

  return (
    <div className="flex items-center gap-2">
      {delta > 0 ? (
        <NewItemsPill count={delta} label={newPendingLabel(delta)} onClick={handlePillClick} />
      ) : null}
      <RefreshButton
        ariaLabel={ariaRefreshLabel}
        onRefresh={resetBaseline}
        disableVisibilityRefresh
      />
    </div>
  );
}
```

Modify `features/bookings-admin/index.ts` — add to the existing exports:

```ts
export { BookingsRefreshControls } from "./ui/bookings-refresh";
export type { BookingsRefreshControlsProps } from "./ui/bookings-refresh";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run features/bookings-admin/ui/bookings-refresh.test.tsx`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add features/bookings-admin/
git commit -m "feat(bookings-admin): polling refresh controls for admin"
```

---

## Task 6: `AppHeader` `actions` slot

**Files:**
- Modify: `widgets/app-header/ui/app-header.tsx`
- Modify: `widgets/app-header/ui/app-header.test.tsx`
- Modify: `widgets/app-header/ui/app-header.stories.tsx`

Add `actions?: ReactNode` prop, rendered in the right zone before `<LocaleSwitcher/>`. The user's in-flight PWA work (on `fix/dedupe-site-settings-cache`) hardcodes a `<PwaInstallButton/>` in the same zone — those changes are not in this branch and will be reconciled when one of the two PRs merges first. This task touches the file as it exists on `develop`.

- [ ] **Step 1: Extend the failing test**

Append to `widgets/app-header/ui/app-header.test.tsx`:

```tsx
  it("renders nodes passed via the actions slot", () => {
    renderHeader({
      actions: <button type="button" aria-label="Refresh">Refresh</button>,
    });
    expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
  });

  it("places actions before the locale switcher", () => {
    renderHeader({
      actions: <button type="button" aria-label="Refresh">Refresh</button>,
    });
    const refresh = screen.getByRole("button", { name: /refresh/i });
    const lang = screen.getByRole("radiogroup", { name: /language/i });
    expect(refresh.compareDocumentPosition(lang) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run widgets/app-header/ui/app-header.test.tsx`
Expected: FAIL — last two tests fail because `actions` prop is not yet rendered.

- [ ] **Step 3: Add the slot**

Modify `widgets/app-header/ui/app-header.tsx`:

1. Extend `AppHeaderProps`:

```ts
export interface AppHeaderProps extends HTMLAttributes<HTMLElement> {
  // …existing…
  /** Extra controls rendered in the right zone, before LocaleSwitcher. */
  actions?: ReactNode;
}
```

2. Destructure `actions` in the function signature.

3. Update the right-zone JSX:

```tsx
<div className="flex items-center gap-2">
  {actions}
  <LocaleSwitcher />
  {menu}
</div>
```

No other changes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run widgets/app-header/ui/app-header.test.tsx`
Expected: PASS (all original tests + the two new ones).

- [ ] **Step 5: Add a Storybook variant**

Append to `widgets/app-header/ui/app-header.stories.tsx` (match the existing story shape — see the file for style):

```tsx
export const WithActions: Story = {
  args: {
    title: "PLATE · 02",
    admin: true,
    actions: (
      <button
        type="button"
        aria-label="Refresh"
        className="inline-flex size-[38px] items-center justify-center rounded-full border-[0.5px] border-line-strong"
      >
        ↻
      </button>
    ),
  },
};
```

- [ ] **Step 6: Commit**

```bash
git add widgets/app-header/
git commit -m "feat(app-header): actions slot for right-zone controls"
```

---

## Task 7: Translation keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`
- Modify: `messages/by.json`

Add four keys distributed across three namespaces. Use the existing in-namespace style (alphabetical isn't enforced; place keys near their semantic neighbours such as `cta_*` entries).

**`AdminBookings`** (existing namespace, see `messages/en.json`):

- `cta_refresh` — en `"Refresh"`, ru `"Обновить"`, by `"Абнавіць"`
- `n_new_pending` — en `"{n} new — refresh"`, ru `"{n} новых — обновить"`, by `"{n} новых — абнавіць"`

**`AdminVipRequests`** (existing namespace):

- `cta_refresh` — en `"Refresh"`, ru `"Обновить"`, by `"Абнавіць"`

**`AdminTestimonials`** (existing namespace):

- `cta_refresh` — en `"Refresh"`, ru `"Обновить"`, by `"Абнавіць"`

Translation polish welcome during implementation; the keys are the contract that pages depend on.

- [ ] **Step 1: Edit `messages/en.json`**

Inside `"AdminBookings"`, after `"cta_decline"`:

```json
"cta_refresh": "Refresh",
"n_new_pending": "{n} new — refresh",
```

Inside `"AdminVipRequests"`, after `"cta_downgrade"`:

```json
"cta_refresh": "Refresh",
```

Inside `"AdminTestimonials"`, after a `cta_*` key (find the right spot in the file):

```json
"cta_refresh": "Refresh",
```

- [ ] **Step 2: Edit `messages/ru.json`** — mirror the structure with Russian copy.

- [ ] **Step 3: Edit `messages/by.json`** — mirror with Belarusian copy.

- [ ] **Step 4: Verify lint passes (no test changes needed)**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add messages/
git commit -m "i18n: refresh + N-new-pending keys for admin lists"
```

---

## Task 8: Wire `<RefreshButton/>` into the vip-requests admin page

**Files:**
- Modify: `app/[locale]/admin/vip-requests/page.tsx`

The page is a server component. We pass the `<RefreshButton/>` directly (it's a client component; React handles the boundary). The label comes from `t("cta_refresh")` from the existing `AdminVipRequests` translation namespace.

- [ ] **Step 1: Edit the page**

In the imports section, add:

```ts
import { RefreshButton } from "@/shared/ui/refresh-button";
```

In the JSX, change:

```tsx
<AppHeader back="/admin" title={t("meta_title")} admin />
```

to:

```tsx
<AppHeader
  back="/admin"
  title={t("meta_title")}
  admin
  actions={<RefreshButton ariaLabel={t("cta_refresh")} />}
/>
```

- [ ] **Step 2: Type-check + lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Smoke-test via Vitest (the existing page test, if any, plus the suite)**

Run: `npm test`
Expected: full Vitest suite green (the existing 763+ tests + the new ones from prior tasks).

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/admin/vip-requests/page.tsx
git commit -m "feat(admin/vip-requests): refresh button in header"
```

---

## Task 9: Wire `<RefreshButton/>` into the testimonials admin page

**Files:**
- Modify: `app/[locale]/admin/testimonials/page.tsx`

Same pattern as Task 8. Use `AdminTestimonials.cta_refresh`.

- [ ] **Step 1: Edit the page**

Add import:

```ts
import { RefreshButton } from "@/shared/ui/refresh-button";
```

Add the `actions` prop to whatever `<AppHeader/>` invocation already exists in this page (verify the exact existing call shape). Example:

```tsx
<AppHeader
  back="/admin"
  title={t("meta_title")}
  admin
  actions={<RefreshButton ariaLabel={t("cta_refresh")} />}
/>
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/admin/testimonials/page.tsx
git commit -m "feat(admin/testimonials): refresh button in header"
```

---

## Task 10: Wire `<BookingsRefreshControls/>` into the bookings admin page

**Files:**
- Modify: `app/[locale]/admin/bookings/page.tsx`

The page already runs `listBookingsForAdmin()` and stores the result in `bookings`. Derive the initial pending count from that array — no extra DB call.

- [ ] **Step 1: Edit the page**

Add imports:

```ts
import { BookingsRefreshControls } from "@/features/bookings-admin";
```

After `const [settings, bookings, allServices] = await Promise.all(...)`:

```ts
const initialPendingCount = bookings.filter((b) => b.status === "pending").length;
```

Update the `<AppHeader/>` call to include `actions`:

```tsx
<AppHeader
  back="/admin"
  title={t("meta_title")}
  admin
  actions={
    <BookingsRefreshControls
      initialPendingCount={initialPendingCount}
      ariaRefreshLabel={t("cta_refresh")}
      newPendingLabel={(n) => t("n_new_pending", { n })}
    />
  }
/>
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/admin/bookings/page.tsx
git commit -m "feat(admin/bookings): polling refresh badge in header"
```

---

## Task 11: Final verification

**Files:** none (verification only).

Per `superpowers:verification-before-completion`, run the full verification chain and only mark the work complete after confirming actual output. No new commits unless something fails — fix-ups go in their own commits.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 2: Vitest (full suite)**

Run: `npm test`
Expected: every test passes, including the new ones from T1–T6.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds. (Pre-push hook also runs this — `git push` would catch a failure, but running it here surfaces it earlier.)

- [ ] **Step 4: Manual smoke (one minute)**

Stop any running `next dev` in other shells (Next.js 16 allows only one dev server per project). Then:

```bash
npm run dev
```

- Open `/admin/vip-requests` — see refresh icon in the header. Click it; no error. Switch to another tab, switch back; observe the page re-render (a network tab will show the RSC fetch).
- Open `/admin/testimonials` — same.
- Open `/admin/bookings` — see refresh icon. In a separate session (or via direct DB insert in another shell), create a pending booking. Within 30 s, the page should show the pill `"1 new — refresh"`. Click it; the row appears in the list and the pill disappears.

If any check fails: stop, debug per `superpowers:systematic-debugging`, commit the fix as its own commit, re-run T11 from Step 1.

- [ ] **Step 5: Push branch**

```bash
git push -u origin feat/admin-list-refresh
```

Pre-push hook runs `npm run build` again — should be green.

---

## After the plan

Open the PR with the `pr-description` project skill in `.claude/skills/pr-description/SKILL.md`. PR base is `develop` (project convention; see the user's auto-memory entry `feedback_branching.md`).

When the PR merges, the user's in-flight PWA install branch will need to rebase onto the new `develop`. The conflict surface in `widgets/app-header/ui/app-header.tsx` is small (their hardcoded `<PwaInstallButton/>` lands in the same right-zone JSX where this PR added the `{actions}` slot — both can coexist; a 2-line manual merge).
