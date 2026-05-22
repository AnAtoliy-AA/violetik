# Admin Masters Management — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user authorised "select recommended until PR open" — proceed autonomously.

**Goal:** Wire bookings to masters. Add `bookings.master_id`, a new "master" step between service and date in the booking funnel, auto-skip when exactly one master is eligible for the chosen service, server-side eligibility checks at submit, the master column on the admin bookings list, the master name in the GCal invite, and a real upcoming-bookings count behind the archive guard.

**Architecture:** Mirrors Phase 1 patterns. New `0009_bookings_master_id.sql` migration adds the column + index + backfills existing rows to `'violetta'` (safe — she's the only seeded master). `BOOKING_STEPS` gains `"master"` between `"service"` and `"date"`. A new `views/booking/ui/steps/master-step.tsx` renders eligible-master cards from `loadEligibleMastersForService`. The booking-route server component does the auto-skip via `redirect()` when `eligible.length === 1` on the master step. `views/booking/api/submit.ts` re-derives eligibility server-side (defence against tampering) and inserts `master_id`. Admin bookings list joins masters by id and shows the locale-resolved name. `countUpcomingBookingsForMaster` swaps from the Phase 1 stub to a real COUNT query.

**Tech Stack:** Drizzle ORM, Postgres, Next.js 16, React 19, Tailwind v4, next-intl, Zustand (booking store), Zod, Vitest, Playwright.

**Spec:** [docs/superpowers/specs/2026-05-22-admin-masters-management-design.md §6](../specs/2026-05-22-admin-masters-management-design.md) (booking integration).

---

## File map

### New
- `db/migrations/0009_bookings_master_id.sql` — auto-generated DDL + appended idempotent backfill
- `views/booking/ui/steps/master-step.tsx` — eligible-master cards client component
- `views/booking/ui/steps/master-step.test.tsx`
- `e2e/booking-master-step.spec.ts` — auto-skip (1 master) + visible-picker (2 masters) paths

### Modified
- `db/schema.ts` — add `masterId` + index on `bookings` table
- `db/bookings.ts` — `NewBookingInput.masterId`; `createBooking` writes it; `BookingWithUser` and `listBookingsForAdmin` join masters
- `db/masters-mutations.ts` — replace `countUpcomingBookingsForMaster` stub with a real COUNT
- `db/masters-mutations.test.ts` — assert the live path still returns 0 when db is null; add a smoke test that doesn't require live DB
- `views/booking/lib/booking-steps.ts` — insert `"master"` between `"service"` and `"date"`
- `views/booking/lib/booking-steps.test.ts` — update next/prev expectations
- `views/booking/model/booking-store.ts` — `masterId` + `setMaster` + reset; `setService` clears `masterId`
- `views/booking/model/booking-store.test.ts` — store invariants
- `views/booking/ui/booking-page.tsx` — render `MasterStep` on `step === "master"`, thread `masters`/`eligibleMasterIds` props
- `views/booking/api/submit.ts` — accept `masterId` in input; server-side re-derive eligibility; pass `masterId` to `createBooking`; include master name in GCal summary
- `views/booking/ui/steps/confirm-step.tsx` — read master from booking-store + lookup in passed-in `masters` list; drop the `masterName` prop (no longer needed once Phase 2 lands)
- `views/booking/ui/steps/confirm-step.test.tsx` (if it exists) or add one
- `app/[locale]/booking/[step]/page.tsx` — load eligible masters when `step === "master"`; redirect to `/booking/date?master=<id>` when `eligible.length === 1`; pass `masters` + `eligibleMasterIds` to BookingPage
- `app/[locale]/admin/bookings/page.tsx` — join master rows; render a Master cell
- `messages/{en,ru,be}.json` — `Booking.master.*` namespace
- `e2e/booking-flow.spec.ts` (if it exists) — extend to cover the new step

### Not touched in Phase 2
- Per-master scheduling (out of scope per spec §1)
- Per-master pricing (out of scope)
- Admin photos page — already correct

---

## Reviewer-advisory notes folded in up front

From the spec-reviewer round on the design:

1. **Migration slot.** Last existing is `0008_admin_masters.sql`; next is `0009_bookings_master_id.sql`.
2. **Submit race contract.** §6.5 of the spec says: if exactly 1 eligible master, server overrides the client-submitted masterId; if ≥2 eligible, the client's id must be in the eligible set. We add the "if 0 eligible" branch explicitly: respond `{ ok: false, error: "no_master_available" }`. This shouldn't be reachable in normal flow (the service would have been hidden by orphan-hiding) but is a defence-in-depth contract.
3. **Backfill safety.** Phase 1 seeded `'violetta'` as the only published master and linked her to every published service. So `UPDATE bookings SET master_id = 'violetta' WHERE master_id IS NULL` is safe in the current data set. The migration uses `ON CONFLICT DO NOTHING` semantics by checking `WHERE EXISTS (SELECT 1 FROM masters WHERE id = 'violetta')` so it stays inert when the masters table is empty (db-null environments, fresh installs without seed).
4. **Phase 1 nested-form fix carry-over.** PR #46 hoisted `photoSlot` out of the editor's `<form>`. The MasterStep is a step view, not a form, so the rule doesn't apply directly — but the spec called for embedded `<PhotoUploadRow>` patterns to use the same hoisting. We're not adding new forms here.

---

## Task 1: Schema — bookings.master_id column + index

**Files:**
- Modify: `db/schema.ts` (the `bookings` table block, around line 88)
- Generate: `db/migrations/0009_bookings_master_id.sql`

- [ ] **Step 1: Add the `masterId` column + index in `db/schema.ts`**

In the `bookings` pgTable block:

```ts
masterId: text("master_id").references(() => masters.id, {
  onDelete: "restrict",
}),
```

In the `bookings` extraConfig callback, add:

```ts
masterIdx: index("bookings_master_idx").on(table.masterId),
```

The column is nullable to keep the FK happy for any pre-Phase-2 rows that the backfill in Step 4 doesn't touch (db-null environments). `ON DELETE RESTRICT` is the belt-and-braces guard; the master-archive flow in Task 6 already prevents the delete path.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: the four pre-existing test-file errors (`features/vip-request-submit/api/actions.test.ts`, `shared/lib/auth-server.test.ts`). No new errors.

- [ ] **Step 3: Generate the migration**

Run: `npm run db:generate`
Expected: a new file `db/migrations/0009_<random>.sql` containing `ALTER TABLE "bookings" ADD COLUMN "master_id" text;` plus the FK and index. Rename it:

```bash
mv db/migrations/0009_<random>.sql db/migrations/0009_bookings_master_id.sql
sed -i '' 's/0009_<random>/0009_bookings_master_id/g' db/migrations/meta/_journal.json
```

(Replace `<random>` with whatever Drizzle generated.)

- [ ] **Step 4: Append the idempotent backfill**

```sql
--> statement-breakpoint

-- ────────────────────────────────────────────────────────────────────
-- Backfill: bookings created before Phase 2 had no master assignment.
-- Violetta is the seeded master in 0008_admin_masters.sql; she is
-- linked to every published service via master_services. Assign her
-- as the historical master for any orphan rows. The guard keeps the
-- backfill inert when the masters table is empty (db-null / fresh
-- installs without the seed).
-- ────────────────────────────────────────────────────────────────────

UPDATE bookings
   SET master_id = 'violetta'
 WHERE master_id IS NULL
   AND EXISTS (SELECT 1 FROM masters WHERE id = 'violetta');
```

- [ ] **Step 5: Commit**

```bash
git add db/schema.ts db/migrations/0009_bookings_master_id.sql db/migrations/meta/
git commit -m "feat(db): bookings.master_id column + Violetta backfill"
```

---

## Task 2: `createBooking` + admin-list join

**Files:**
- Modify: `db/bookings.ts` (`NewBookingInput`, `createBooking`, `BookingWithUser`, `listBookingsForAdmin`)

- [ ] **Step 1: Extend `NewBookingInput`**

```ts
export interface NewBookingInput {
  userId: string;
  serviceId: string;
  masterId: string;
  scheduledFor: Date;
  durationMinutes: number;
  notes?: string | null;
}
```

- [ ] **Step 2: Write `master_id` in `createBooking`**

```ts
const rows = await db
  .insert(schema.bookings)
  .values({
    id,
    userId: input.userId,
    serviceId: input.serviceId,
    masterId: input.masterId,
    scheduledFor: input.scheduledFor,
    durationMinutes: input.durationMinutes,
    notes: input.notes ?? null,
  })
  .returning();
```

- [ ] **Step 3: Extend `BookingWithUser` and the admin list**

```ts
export interface BookingWithUser extends schema.Booking {
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  username: string | null;
  masterNameEn: string | null;
  masterNameRu: string | null;
  masterNameBe: string | null;
}
```

In `listBookingsForAdmin`, add a leftJoin on `masters`:

```ts
const rows = await db
  .select({
    booking: schema.bookings,
    userEmail: schema.users.email,
    userFirstName: schema.users.firstName,
    userLastName: schema.users.lastName,
    username: schema.users.username,
    masterNameEn: schema.masters.nameEn,
    masterNameRu: schema.masters.nameRu,
    masterNameBe: schema.masters.nameBe,
  })
  .from(schema.bookings)
  .leftJoin(schema.users, eq(schema.bookings.userId, schema.users.id))
  .leftJoin(schema.masters, eq(schema.bookings.masterId, schema.masters.id))
  .orderBy(desc(schema.bookings.scheduledFor));
return rows.map((r) => ({
  ...r.booking,
  userEmail: r.userEmail,
  userFirstName: r.userFirstName,
  userLastName: r.userLastName,
  username: r.username,
  masterNameEn: r.masterNameEn,
  masterNameRu: r.masterNameRu,
  masterNameBe: r.masterNameBe,
}));
```

- [ ] **Step 4: Build smoke**

Run: `npm run build`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add db/bookings.ts
git commit -m "feat(db): bookings.masterId in createBooking + admin list join"
```

---

## Task 3: Replace `countUpcomingBookingsForMaster` stub with a real query

**Files:**
- Modify: `db/masters-mutations.ts`
- Modify: `db/masters-mutations.test.ts` (no behavioural change — stub still returns 0 in the db-null path)

- [ ] **Step 1: Real COUNT query**

Replace the stub:

```ts
import { and, count, eq, gt, ne, notInArray, sql } from "drizzle-orm";

// ...

export async function countUpcomingBookingsForMaster(
  masterId: string,
): Promise<number> {
  if (!db) return 0;
  try {
    const rows = await db
      .select({ n: count() })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.masterId, masterId),
          gt(schema.bookings.scheduledFor, sql`now()`),
          ne(schema.bookings.status, "cancelled"),
        ),
      );
    return rows[0]?.n ?? 0;
  } catch (error) {
    if (isMissingTable(error)) return 0;
    throw error;
  }
}
```

(Make sure `count`, `gt`, `ne` are added to the existing `drizzle-orm` import.)

The Phase 1 stub already returned 0 in the db-null path, so the existing test passes unchanged.

- [ ] **Step 2: Tests pass**

Run: `npx vitest run db/masters-mutations.test.ts --pool=threads`
Expected: 3 passed.

- [ ] **Step 3: Commit**

```bash
git add db/masters-mutations.ts
git commit -m "feat(masters): real archive-guard counts upcoming bookings"
```

---

## Task 4: BOOKING_STEPS + booking-store wiring

**Files:**
- Modify: `views/booking/lib/booking-steps.ts`
- Modify: `views/booking/lib/booking-steps.test.ts`
- Modify: `views/booking/model/booking-store.ts`
- Modify: `views/booking/model/booking-store.test.ts`

- [ ] **Step 1: Insert `"master"` in BOOKING_STEPS**

```ts
export const BOOKING_STEPS = [
  "service",
  "master",
  "date",
  "time",
  "confirm",
] as const;
```

- [ ] **Step 2: Update existing booking-steps tests**

Open `views/booking/lib/booking-steps.test.ts`. Find any assertions that check `nextStep("service") === "date"` or `prevStep("date") === "service"`. They must become `"master"` and the new step must have its own coverage:

```ts
expect(nextStep("service")).toBe("master");
expect(nextStep("master")).toBe("date");
expect(prevStep("master")).toBe("service");
expect(prevStep("date")).toBe("master");
```

- [ ] **Step 3: Extend the booking store**

```ts
export type BookingState = {
  serviceId: string | null;
  masterId: string | null;
  date: string | null;
  time: string | null;
  setService: (id: string | null) => void;
  setMaster: (id: string | null) => void;
  setDate: (date: string | null) => void;
  setTime: (time: string | null) => void;
  reset: () => void;
};

// ... inside create()
masterId: null,
setService: (serviceId) => set({ serviceId, masterId: null }),
setMaster: (masterId) => set({ masterId }),
// ...
reset: () =>
  set({ serviceId: null, masterId: null, date: null, time: null }),
```

Note the explicit `masterId: null` reset inside `setService` — picking a different service invalidates the previously-chosen master since the eligible-set may shift.

- [ ] **Step 4: Booking-store test**

Add to `views/booking/model/booking-store.test.ts`:

```ts
it("setService clears masterId", () => {
  useBookingStore.setState({ serviceId: "signature", masterId: "violetta" });
  useBookingStore.getState().setService("editorial");
  expect(useBookingStore.getState().masterId).toBeNull();
});
it("reset clears masterId", () => {
  useBookingStore.setState({ masterId: "violetta" });
  useBookingStore.getState().reset();
  expect(useBookingStore.getState().masterId).toBeNull();
});
```

- [ ] **Step 5: Tests + lint**

Run: `npx vitest run views/booking/lib views/booking/model --pool=threads`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add views/booking/lib/ views/booking/model/
git commit -m "feat(booking): add master step + store field with service-change reset"
```

---

## Task 5: i18n keys for the master step

**Files:**
- Modify: `messages/en.json`, `messages/ru.json`, `messages/be.json`

- [ ] **Step 1: Add `Booking.master` namespace**

Inside the existing `Booking` block (find by `"steps":`), add:

```jsonc
"master": {
  "eyebrow": "Step 2 — Master",
  "title": "Choose your <em>master</em>.",
  "subtitle": "Pick who you'd like to spend the hour with.",
  "years_label": "{years, plural, one {# year} other {# years}}",
  "no_eligible": "No master is currently set up for this service. Pick a different service or contact the studio."
}
```

Also extend the existing `Booking.steps.<key>` map (used by metadata + step-progress widget) — add:

```jsonc
"steps": {
  ...,
  "master": "Master"
}
```

Provide RU/BE translations alongside:
- RU: `"Шаг 2 — Мастер"`, `"Выберите <em>мастера</em>."`, `"Выберите, с кем хотите провести час."`, `"{years, plural, one {# год} few {# года} many {# лет} other {# лет}}"`, `"Для этой услуги пока нет мастера. Выберите другую услугу или свяжитесь со студией."`, `"Мастер"`.
- BE: `"Крок 2 — Майстар"`, `"Выберыце <em>майстра</em>."`, `"Выберыце, з кім хочаце правесці гадзіну."`, `"{years, plural, one {# год} few {# гады} many {# гадоў} other {# гадоў}}"`, `"Для гэтай паслугі пакуль няма майстра. Выберыце іншую паслугу або звяжыцеся з атэлье."`, `"Майстар"`.

- [ ] **Step 2: Sanity-check JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json'))"` and the same for ru/be.
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add messages/
git commit -m "feat(i18n): Booking.master step keys + steps.master label"
```

---

## Task 6: `MasterStep` component

**Files:**
- Create: `views/booking/ui/steps/master-step.tsx`
- Create: `views/booking/ui/steps/master-step.test.tsx`

- [ ] **Step 1: Test-first**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { MasterStep } from "./master-step";
import { useBookingStore } from "@/views/booking/model/booking-store";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const masters = [
  {
    id: "violetta",
    name: "Violetta",
    role: "Master nail artist",
    bio: "",
    quote: "",
    years: 11,
    sortOrder: 0,
    status: "published" as const,
    serviceIds: ["signature"],
  },
  {
    id: "iris",
    name: "Iris",
    role: "Apprentice",
    bio: "",
    quote: "",
    years: 3,
    sortOrder: 1,
    status: "published" as const,
    serviceIds: ["signature"],
  },
];

function setup() {
  useBookingStore.setState({ masterId: null });
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <MasterStep masters={masters} eligibleMasterIds={["violetta", "iris"]} />
    </NextIntlClientProvider>,
  );
}

describe("MasterStep", () => {
  it("renders every eligible master", () => {
    setup();
    expect(screen.getByText("Violetta")).toBeVisible();
    expect(screen.getByText("Iris")).toBeVisible();
  });
  it("filters out masters not in the eligible set", () => {
    useBookingStore.setState({ masterId: null });
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <MasterStep masters={masters} eligibleMasterIds={["violetta"]} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Violetta")).toBeVisible();
    expect(screen.queryByText("Iris")).toBeNull();
  });
  it("clicking a card sets the masterId in the booking store", async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Violetta/ }));
    expect(useBookingStore.getState().masterId).toBe("violetta");
  });
  it("renders the empty-set fallback when no masters are eligible", () => {
    useBookingStore.setState({ masterId: null });
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <MasterStep masters={masters} eligibleMasterIds={[]} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(/No master is currently set up/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Component**

```tsx
"use client";

import { useTranslations } from "next-intl";
import type { Master } from "@/entities/master";
import { cn } from "@/shared/lib/cn";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { useBookingStore } from "@/views/booking/model/booking-store";

export interface MasterStepProps {
  masters: readonly Master[];
  eligibleMasterIds: readonly string[];
}

export function MasterStep({ masters, eligibleMasterIds }: MasterStepProps) {
  const t = useTranslations("Booking.master");
  const selectedMasterId = useBookingStore((s) => s.masterId);
  const setMaster = useBookingStore((s) => s.setMaster);

  const eligible = masters.filter((m) => eligibleMasterIds.includes(m.id));

  if (eligible.length === 0) {
    return (
      <div>
        <Eyebrow gold>{t("eyebrow")}</Eyebrow>
        <p className="mt-4 text-[14px] text-text-2">{t("no_eligible")}</p>
      </div>
    );
  }

  return (
    <div>
      <Eyebrow gold>{t("eyebrow")}</Eyebrow>
      <h2 className="my-2.5 mb-1.5 font-display text-h2 font-normal italic leading-tight tracking-[-0.02em]">
        {t.rich("title", { em: (c) => <em>{c}</em> })}
      </h2>
      <p className="mb-5 text-[14px] text-text-2">{t("subtitle")}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {eligible.map((m) => {
          const selected = m.id === selectedMasterId;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMaster(m.id)}
              aria-pressed={selected}
              className={cn(
                "gilded rounded-[20px] p-4 text-left transition-colors duration-fast ease-out",
                selected ? "bg-surface-2" : "hover:bg-surface-2",
              )}
            >
              <div className="font-display text-[20px] italic">{m.name}</div>
              <div className="mt-1 text-[12px] text-text-2">{m.role}</div>
              <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                {t("years_label", { years: m.years })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Tests + lint**

Run: `npx vitest run views/booking/ui/steps/master-step --pool=threads && npx eslint views/booking/ui/steps/master-step.tsx`
Expected: 4 passed, lint clean.

- [ ] **Step 4: Commit**

```bash
git add views/booking/ui/steps/master-step.tsx views/booking/ui/steps/master-step.test.tsx
git commit -m "feat(booking): MasterStep — eligible-master cards + empty fallback"
```

---

## Task 7: Booking server route — auto-skip + thread masters

**Files:**
- Modify: `app/[locale]/booking/[step]/page.tsx`
- Modify: `views/booking/ui/booking-page.tsx`

- [ ] **Step 1: Booking page — accept master props**

Extend `BookingPageProps`:

```ts
export interface BookingPageProps {
  step: BookingStep;
  services: readonly Service[];
  pricedServices?: Readonly<Record<string, ResolvedPrice>>;
  currency?: CurrencyCode;
  masters: readonly Master[];
  eligibleMasterIds: readonly string[];
  masterName?: string;
}
```

(`masterName` stays as a fallback for the confirm step's display; Phase 2 will derive it from `masters` + store, but we keep the prop for SSR continuity.)

Inside the page, render the master step:

```tsx
{step === "master" ? (
  <MasterStep masters={masters} eligibleMasterIds={eligibleMasterIds} />
) : null}
```

And import `MasterStep` at the top. Wire `masters` + `eligibleMasterIds` down from props.

- [ ] **Step 2: Confirm step reads from masters list + store**

Update `views/booking/ui/steps/confirm-step.tsx`:

```ts
import { useBookingStore } from "@/views/booking/model/booking-store";
import type { Master } from "@/entities/master";

export interface ConfirmStepProps {
  services: readonly Service[];
  pricedServices?: Readonly<Record<string, ResolvedPrice>>;
  currency?: CurrencyCode;
  masters: readonly Master[];
}

export function ConfirmStep({ services, pricedServices, currency = "EUR", masters }: ConfirmStepProps) {
  // ...
  const masterId = useBookingStore((s) => s.masterId);
  const master = masters.find((m) => m.id === masterId);
  // ...
  const rows: readonly [string, string][] = [
    [t("row_master"), master?.name ?? "—"],
    // ...
  ];
}
```

Remove the now-unused `masterName?: string` prop. Update `BookingPageProps` accordingly and drop the `masterName` field that Phase 1 introduced (it's superseded). Pass `masters` to `<ConfirmStep masters={masters} ... />`.

- [ ] **Step 3: Booking route — load masters + redirect when 1 eligible**

In `app/[locale]/booking/[step]/page.tsx`, replace the Phase 1 loader block with:

```ts
import { loadMastersForLocale, loadEligibleMastersForService } from "@/entities/master/api/load";
import { redirect } from "@/i18n/navigation";

// ... inside BookingRoute, after loading services + settings:

const masters = await loadMastersForLocale(locale, { publishedOnly: true });

// Build eligibility: per-service the master step renders the eligible
// set; when the customer hasn't picked a service yet we render the full
// list (the picker step's auto-skip logic won't fire until they do).
const searchParams = new URL(/* … */); // see note below
// Eligible-set is computed CLIENT-side from the store on the master
// step (master-step.tsx filters by eligibleMasterIds); we pass the full
// id-set for the chosen service when known via a server-component
// helper. For Phase 2 we expose every master and the server-side
// auto-skip uses the eligible-set on demand.

// Auto-skip the master step when exactly one master is eligible for
// the chosen service. We don't have access to the booking-store from
// the server, so we *cannot* perform an honest auto-skip purely
// server-side — the cookie/session storage is client-only. The
// approximation: when the route hits ?service=<id> we honour it; the
// client-side store hydrates and, on mount, dispatches `setMaster`
// when eligible.length === 1 (see ServiceStep below).
```

> **Stop and think.** The auto-skip semantics in the spec assume server-side knowledge of `serviceId`. The current booking-store is client-only (sessionStorage, hydrated post-mount). Two viable strategies:
>
> (a) **Server-side via search-param**: the ServiceStep adds `?serviceId=<id>` when it sets the service in the store, then the route reads it and performs the auto-skip server-side via `redirect`.
> (b) **Client-side fallback**: keep the master step client-only; in `MasterStep` itself, when `eligibleMasterIds.length === 1`, dispatch `setMaster` + use `useRouter().replace("/booking/date")` on first render.
>
> Pick (b). It avoids URL coupling and keeps the booking flow's state model intact (the store stays the source of truth). It's a one-line `useEffect` and Suspense already gates this branch. Update Task 6 to include the redirect — see Task 6 follow-up below.

- [ ] **Step 4: Update Task 6's `MasterStep` to handle the 1-eligible auto-skip**

Edit `views/booking/ui/steps/master-step.tsx` and add:

```tsx
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

// inside the component, after `const eligible = ...`:
const router = useRouter();
useEffect(() => {
  if (eligible.length === 1 && selectedMasterId !== eligible[0].id) {
    setMaster(eligible[0].id);
    router.replace("/booking/date");
  }
}, [eligible, selectedMasterId, setMaster, router]);
```

Test for the auto-skip:

```ts
it("auto-skips to /booking/date when exactly one master is eligible", () => {
  useBookingStore.setState({ masterId: null });
  const replace = vi.fn();
  vi.mocked(/* useRouter mock here */); // simpler: spy on router via jsdom location
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <MasterStep masters={masters} eligibleMasterIds={["violetta"]} />
    </NextIntlClientProvider>,
  );
  // useEffect runs synchronously after render in jsdom; assert the
  // store updated.
  expect(useBookingStore.getState().masterId).toBe("violetta");
});
```

(Mock `useRouter` from `@/i18n/navigation` at the top of the test file with a `vi.mock(...)` factory.)

- [ ] **Step 5: Booking route — load + pass through**

The route is straightforward without the server-side redirect:

```ts
const [settings, services, masters] = await Promise.all([
  getSiteSettingsServer(),
  loadServicesForLocale(locale),
  loadMastersForLocale(locale, { publishedOnly: true }),
]);
// ... existing pricedServices + currency wiring ...

// eligibleMasterIds = masters whose serviceIds includes the chosen service.
// Without access to the booking-store, we cannot know the chosen service
// here — instead pass the full master list down, and let MasterStep filter
// client-side using `masters[i].serviceIds`. So we don't need an
// eligibleMasterIds prop after all; MasterStep does its own filtering.
```

> **Simpler**: pass `masters` only. MasterStep reads the store's `serviceId`, then filters `masters` by `serviceIds.includes(serviceId)`. The `eligibleMasterIds` prop drops out entirely.

Updated MasterStep signature:

```ts
export interface MasterStepProps {
  masters: readonly Master[];
}

export function MasterStep({ masters }: MasterStepProps) {
  const t = useTranslations("Booking.master");
  const serviceId = useBookingStore((s) => s.serviceId);
  const selectedMasterId = useBookingStore((s) => s.masterId);
  const setMaster = useBookingStore((s) => s.setMaster);
  const router = useRouter();

  const eligible = serviceId
    ? masters.filter((m) => m.serviceIds.includes(serviceId))
    : masters;

  useEffect(() => {
    if (eligible.length === 1 && selectedMasterId !== eligible[0].id) {
      setMaster(eligible[0].id);
      router.replace("/booking/date");
    }
  }, [eligible, selectedMasterId, setMaster, router]);

  // ... rest as before
}
```

Update the tests in Task 6 to remove `eligibleMasterIds` from the props.

- [ ] **Step 6: Build + tests**

Run: `npm run build && npx vitest run --pool=threads`
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add app/[locale]/booking/[step]/page.tsx views/booking/ui/booking-page.tsx views/booking/ui/steps/master-step.tsx views/booking/ui/steps/master-step.test.tsx views/booking/ui/steps/confirm-step.tsx
git commit -m "feat(booking): wire master step into route + auto-skip when 1 eligible"
```

---

## Task 8: `submit.ts` — accept + validate masterId + GCal title

**Files:**
- Modify: `views/booking/api/submit.ts`

- [ ] **Step 1: Extend the input**

```ts
export interface SubmitBookingInput {
  serviceId: string;
  masterId: string | null;
  date: string;
  time: string;
  locale: string;
}

export type SubmitBookingResult =
  | { ok: true; bookingId: string }
  | {
      ok: false;
      error:
        | "slot_taken"
        | "db_unavailable"
        | "invalid_input"
        | "no_master_available"
        | "master_not_eligible"
        | "unknown";
    };
```

- [ ] **Step 2: Server-side eligibility check**

Right after `service` validation, derive eligibility:

```ts
import { getMasterIdsForService } from "@/db/masters";
import { getMasterById } from "@/db/masters";

const eligibleIds = await getMasterIdsForService(input.serviceId);

let masterId: string | null = null;
if (eligibleIds.length === 0) {
  // Orphan service shouldn't be reachable; defence-in-depth.
  return { ok: false, error: "no_master_available" };
} else if (eligibleIds.length === 1) {
  masterId = eligibleIds[0];
} else {
  // Client must have submitted an eligible id.
  if (!input.masterId || !eligibleIds.includes(input.masterId)) {
    return { ok: false, error: "master_not_eligible" };
  }
  // Confirm the master is still published (could have been archived
  // mid-flight).
  const master = await getMasterById(input.masterId);
  if (!master || master.status !== "published") {
    return { ok: false, error: "master_not_eligible" };
  }
  masterId = input.masterId;
}
```

- [ ] **Step 3: Pass through to `createBooking`**

```ts
booking = await createBooking({
  userId: session.user.id,
  serviceId: input.serviceId,
  masterId,
  scheduledFor,
  durationMinutes: durationMin,
});
```

- [ ] **Step 4: GCal title includes master**

In the GCal block, after deriving the master:

```ts
const master = await getMasterById(masterId);
const masterLabel = master ? ` · ${master.nameEn}` : "";
// ...
summary: `${localizedServiceName(service, input.locale)}${masterLabel} · ${customerLabel}`,
```

(`nameEn` because the GCal event is read by the admin in English; if you'd rather use the booking locale, swap to a localised name pick. Pick EN to match the existing customerLabel and service-name conventions.)

- [ ] **Step 5: Caller wiring**

Find every `submitBooking(...)` call site. The booking funnel's confirm step is the only caller. Update it to read `masterId` from the store:

```ts
const masterId = useBookingStore((s) => s.masterId);
// ... pass through:
await submitBooking({ serviceId, masterId, date, time, locale });
```

- [ ] **Step 6: Tests pass**

Run: `npx vitest run --pool=threads`
Expected: green. (The existing submit test, if any, may need a mock for `getMasterIdsForService` + `getMasterById`.)

- [ ] **Step 7: Commit**

```bash
git add views/booking/api/submit.ts
git commit -m "feat(booking): server-side master eligibility check + GCal title"
```

---

## Task 9: Admin bookings list — Master cell

**Files:**
- Modify: `app/[locale]/admin/bookings/page.tsx`

- [ ] **Step 1: Render the master name**

The list already joins via the modified `listBookingsForAdmin`. Add a cell:

```tsx
// where the service is rendered (around line 102), append:
const masterName = (() => {
  if (locale === "ru") return b.masterNameRu;
  if (locale === "be") return b.masterNameBe;
  return b.masterNameEn;
})();

// Then render a small mono caps line under the service:
<div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
  {masterName ?? "—"}
</div>
```

(If the row layout has a clear column for this, slot it there instead. Otherwise put it under the service name — the inline mono caps style matches the existing badges.)

- [ ] **Step 2: Build + smoke**

Run: `npm run build`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/admin/bookings/page.tsx
git commit -m "feat(admin-bookings): show master name per row"
```

---

## Task 10: E2E — auto-skip + visible-picker paths

**Files:**
- Create: `e2e/booking-master-step.spec.ts`
- Modify: any existing booking-flow e2e (if present) to update the step sequence

- [ ] **Step 1: Run the existing booking suite locally**

Run: `npx playwright test e2e/booking-confirm.spec.ts` (and any other existing booking specs).
Expected: identify which tests break because the step list changed. Most should still pass — the step list change is additive, and existing tests typically deep-link via the URL.

- [ ] **Step 2: New spec**

```ts
import { test, expect } from "@playwright/test";

// With only one published master (Violetta, from the seed), the master
// step should auto-skip to /booking/date the moment the customer picks
// a service.
test("master step auto-skips when only one master is eligible", async ({
  page,
}) => {
  await page.goto("/en/booking/service");
  // Pick any seeded service; signature is reliable.
  await page.getByRole("button", { name: /Signature/i }).click();
  // Click "Next" or wait for the auto-progress — depends on how the
  // service step is wired. If the service step does its own router
  // push to /booking/master, the page will land there briefly then
  // bounce. Assert the final URL.
  await expect(page).toHaveURL(/\/booking\/date(\?.*)?$/);
});
```

> Add a second test that exercises the visible picker once two masters are seeded. Today the seed has only Violetta — extending it for a second master is out of scope for this PR (the spec phasing intentionally leaves the seed minimal). Add this second spec with a `test.skip(true, "needs second-master seed")` placeholder + a TODO comment so it gets enabled when a second master is added.

```ts
test.skip(true, "needs second-master seed");
test("master step shows the picker with two eligible masters", async ({
  page,
}) => {
  await page.goto("/en/booking/service");
  await page.getByRole("button", { name: /Signature/i }).click();
  await expect(page).toHaveURL(/\/booking\/master$/);
  await page.getByRole("button", { name: /Violetta/i }).click();
  await page.getByRole("link", { name: /next/i }).click();
  await expect(page).toHaveURL(/\/booking\/date$/);
});
```

- [ ] **Step 3: Run e2e**

Run: `npm run e2e -- e2e/booking-master-step.spec.ts`
Expected: the auto-skip spec passes; the second spec is skipped.

- [ ] **Step 4: Full suite**

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add e2e/booking-master-step.spec.ts
git commit -m "test(e2e): booking master step auto-skip + (skipped) picker path"
```

---

## Final step: open the PR

- [ ] **Open the PR against `develop`**

```bash
git push -u origin feature/admin-masters-phase-2
gh pr create --base develop --title "feat: admin masters management — phase 2 (booking integration)" --body "$(cat <<'EOF'
## Summary
Phase 2 of the admin masters work — see [spec §6](docs/superpowers/specs/2026-05-22-admin-masters-management-design.md) and [plan](docs/superpowers/plans/2026-05-22-admin-masters-management-phase-2.md).

- New \`bookings.master_id\` column (nullable, FK to masters with ON DELETE RESTRICT) + backfill to Violetta for pre-Phase-2 rows.
- New master step inserted between service and date in the booking funnel. Auto-skips on the client when only one master is eligible for the chosen service.
- Submit-time server-side eligibility check (defence against tampering): rejects if zero eligible, picks the single eligible master, or validates against the eligible set when there are ≥2.
- Admin bookings list now shows the master name per row.
- GCal event title appends the master's English name.
- \`countUpcomingBookingsForMaster\` is now a real COUNT query — the archive guard activates as soon as future bookings reference a master.

## Test plan
- [ ] \`/en/booking/service\` → click Signature → URL skips master and lands on \`/booking/date\` (Violetta-only seed).
- [ ] Add a second master in admin → repeat → URL pauses on \`/booking/master\` and shows two cards.
- [ ] Complete a booking → \`/admin/bookings\` shows the master name in the row.
- [ ] \`lint\`, \`test\`, \`build\`, full Playwright suite all green locally.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Phase 3 (out of scope for this plan)

- Per-master availability calendars (master_availability table).
- Per-master pricing overrides.
- Customer-facing master ratings / reviews.
- Bulk-import or CSV editor for masters.
