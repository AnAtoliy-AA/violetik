# Admin orphan-service badge & service-side master linking

**Date:** 2026-05-29
**Branch:** `feature/admin-orphan-service-badge-and-master-link` (off `develop`)

## Problem

A published service does not appear on the public menu unless it has at least
one **published master** linked to it. This is intentional "orphan hiding" in
`listPublishedServices()` ([db/services.ts](../../../db/services.ts)):

```ts
if (eligibleIds.size === 0) return rows;        // first-run fall-through
return rows.filter((r) => eligibleIds.has(r.id)); // hide orphans otherwise
```

Confirmed against live data: the service `extension` ("Correction of
extensions", category "Extension", status `published`) is hidden because the
only published master is not linked to it.

Two gaps make this a silent trap:

1. **No admin signal.** The code comment claims "Admin sees orphan badges in
   /admin/services" but no such badge exists.
2. **No service-side linking.** Masters can only be linked from the master
   editor, not from the service editor.

## Goals

- Surface, in the admin services list, that a published service is hidden from
  the menu because it has no published master.
- Let an admin link masters to a service from the service editor, in both
  create and edit modes.

## Non-goals

- Changing the menu's hiding rule.
- A data migration / one-off fix for the existing `extension` service (the
  admin will link a master through the new UI).
- Grouping or select-all controls in the master picker (small studio; YAGNI).

## Part A — "Hidden — no master" badge

**Truth computed server-side** in
[app/[locale]/admin/services/page.tsx](../../../app/%5Blocale%5D/admin/services/page.tsx),
which already loads all services and categories. Add a call to
`getServiceIdsHavingAnyPublishedMaster()` and derive:

```ts
const eligible = await getServiceIdsHavingAnyPublishedMaster();
const hiddenServiceIds =
  eligible.size === 0
    ? []
    : services
        .filter((s) => s.status === "published" && !eligible.has(s.id))
        .map((s) => s.id);
```

This mirrors the menu's real rule — including the zero-masters fall-through —
so the badge never lies.

Pass `hiddenServiceIds: readonly string[]` into `AdminServicesList`
([admin-services-list.tsx](../../../features/services-admin/ui/admin-services-list.tsx)).
In each service row, when its id is in the set, render a small accent badge
beside the existing status line. New `AdminServices` message key
`badge_no_master` in `en` / `ru` / `by`.

## Part B — Link masters from the service editor

Mirror the existing master→service mechanism, inverted.

1. **Query** `getAllMasterIdsForService(serviceId)` in
   [db/masters.ts](../../../db/masters.ts) — returns linked master ids
   regardless of master status. (The existing `getMasterIdsForService` filters
   to *published*; the editor must pre-check draft links too, matching how the
   master editor seeds its `serviceIds` from the unfiltered
   `getServiceIdsForMaster`.)

2. **Mutation** `setServiceMasters(serviceId, masterIds)` in
   [db/masters-mutations.ts](../../../db/masters-mutations.ts) — diff-based
   delete + insert in a single transaction; a direct mirror of
   `setMasterServices`.

3. **Schema** — add `masterIds: z.array(slugSchema).max(200)` to
   `serviceFormSchema`
   ([entities/service/model/schema.ts](../../../entities/service/model/schema.ts)),
   mirroring `masterFormSchema.serviceIds`.

4. **Actions** — `createServiceAction` and `updateServiceAction`
   ([features/services-admin/api](../../../features/services-admin/api)):
   destructure `masterIds`, write the service row, then call
   `setServiceMasters(id, masterIds)`; `revalidatePath("/", "layout")`. On
   create the id is the user-supplied slug, so linking runs after insert.

5. **UI** `MasterPicker` (new, `features/services-admin/ui`) — flat checkbox
   list of masters with an empty-state hint. Props: `masters`, `value`,
   `onChange`. Mandatory Storybook story + Vitest test.

6. **ServiceEditor**
   ([service-editor.tsx](../../../features/services-admin/ui/service-editor.tsx))
   — add `masters: readonly MasterOption[]` prop and `masterIds` to
   `initial`/state; render `<MasterPicker>`; include `masterIds` in the submit
   payload.

7. **Route**
   ([app/[locale]/admin/services/[id]/page.tsx](../../../app/%5Blocale%5D/admin/services/%5Bid%5D/page.tsx))
   — load `listAllMasters()` (filter out archived) into options; in edit mode
   seed `masterIds` from `getAllMasterIdsForService`. New `AdminServices` keys
   `label_masters`, `label_masters_hint` in `en` / `ru` / `by`.

## Honest caveat (reflected in copy)

Linking a **draft** master does not reveal the service on the menu — the menu
counts only *published* masters. So the badge (published-master reality) and
the picker (links any master) can legitimately disagree: an admin may link a
master and still see the badge until that master is published. Hint copy says
"Tick every master who performs this service" and does not promise menu
visibility.

## Testing (TDD, red → green)

- `setServiceMasters` diff behavior; `getAllMasterIdsForService` — mirror the
  existing masters-mutations / masters tests.
- `serviceFormSchema` accepts and validates `masterIds`.
- create / update service actions persist master links
  ([actions.test.ts](../../../features/services-admin/api/actions.test.ts)).
- `MasterPicker` toggle + empty state; `ServiceEditor` renders the picker and
  emits `masterIds`.
- `AdminServicesList` renders the badge only for ids in `hiddenServiceIds`.

## Verification before completion

`npm run lint`, `npm test`, `npm run build` — report actual output.
</content>
</invoke>
