# Admin-managed gallery & onboarding — design

**Date:** 2026-05-29
**Status:** Approved (pending spec review)
**Branch:** off `develop`; PR targets `develop`

## Summary

Make the customer **gallery** and the **onboarding carousel** fully admin-managed instead
of hardcoded. Admins gain CRUD over:

- **Gallery pictures** — add / edit / remove, with a localized caption + alt text, grouped
  under a category.
- **Gallery categories** — add / edit / delete, with localized names; deletion is blocked
  while a category still contains pictures.
- **Onboarding slides** — add / edit / remove / reorder, each with localized text
  (eyebrow / title / body) and an uploadable image (gradient fallback when absent).

Both areas reorder via drag. Both are delivered in **one branch / one PR**.

## Background — current state

- **Gallery** (`views/gallery`) renders `STUDIO_DATA.gallery` — **8 hardcoded items**
  (`g1`–`g8`) in `entities/studio/model/data.ts`. Categories are **5 hardcoded tags**
  (`Editorial`, `Gel`, `Chrome`, `Lace`, `Bridal`) typed in
  `entities/studio/model/types.ts` and translated via `Gallery.category.*`. Admins can
  only swap an image into one of the fixed slots through `/admin/photos` (slot kind
  `"gallery"`, slot id = item id), via the `studio_photos` table.
- **Onboarding** (`views/onboarding`) renders a **hardcoded 2-slide `SLIDES` array**;
  each slide's eyebrow / title / body come from `Onboarding.*` i18n messages, and the
  "image" is a `NailTile` **gradient placeholder** (no real photo support exists).
- **Reference pattern already in the repo:** services + service-categories
  (`db/services.ts`, `db/services-mutations.ts`, `entities/service`,
  `features/services-admin`, `/admin/services/...`) implement exactly this kind of
  DB-backed, localized, admin-CRUD-with-reorder feature. This design mirrors it.
- **Image upload pipeline** already exists: client-direct upload to Vercel Blob via
  `@vercel/blob/client` `upload()` → `/api/admin/photos/upload-token`, then a server
  action records the URL. A sharp-based palette extractor
  (`shared/lib/photo-storage/extract-palette`) produces a 4-color palette. Size limits in
  `shared/lib/photo-storage/limits`. This pipeline is reused.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| How DB-backed should the gallery be? | **Fully DB-backed.** New tables; retire the hardcoded list; seed-migrate the 8 demo items so nothing disappears. |
| Category names | **Localized (en/ru/be)**, like service categories; **seed the existing 5** tags as the starting categories. |
| Picture "description" | **Localized caption** (shown in card/lightbox) **+ alt text** (accessibility). |
| Delete semantics | **Hard delete.** Removing a picture deletes the row and its Vercel Blob. Categories hard-delete too. |
| Deleting a non-empty category | **Blocked** — admin must move/remove its pictures first (`onDelete: restrict`). |
| Reordering | **Yes, both** categories and pictures (drag), reusing `SortableList`. |
| Onboarding scope | **Full CRUD slides** (add / remove / reorder), not just editing the fixed 2. |
| Onboarding images | **Real photo per slide, gradient fallback** when none uploaded. |
| Onboarding image storage | Stored **on the slide row** (not via `studio_photos` slots). |
| Delivery | **One combined spec / branch / PR.** |

## Architecture

### Refinement: image stored on the row, shared upload component

Because gallery items and onboarding slides are now full-CRUD rows that each own exactly
one image, both store image fields **directly on their own row**
(`src`, `width`, `height`, `blurDataUrl`, `palette`) rather than through the slot-based
`studio_photos` table.

A single shared admin **image-upload component** performs the existing client-direct Vercel
Blob upload (token route + size/type validation + palette extraction) and hands the
resulting URL + dimensions + palette to the row's create/update action. The slot-based
`studio_photos` table and `PhotoUploadRow` stay **untouched** for the other photo kinds
(service / master / atelier / profile). **No new `studio_photos` slot kind is introduced.**

### New tables (one drizzle migration + idempotent seeds)

**`gallery_categories`** (mirrors `service_categories`)

| column | type | notes |
|---|---|---|
| `id` | text PK | slug |
| `name_en` / `name_ru` / `name_by` | text NOT NULL | localized |
| `sort_order` | integer NOT NULL default 0 | drag order |
| `created_at` / `updated_at` | timestamptz NOT NULL default now() | |
| `updated_by` | text → `users.id` | nullable |

Indexes: `sort_order`, partial `updated_by`.

**`gallery_items`**

| column | type | notes |
|---|---|---|
| `id` | text PK | generated slug/id |
| `category_id` | text NOT NULL → `gallery_categories.id` **onDelete: restrict** | enforces blocked deletion |
| `caption_en` / `caption_ru` / `caption_by` | text NOT NULL | localized caption |
| `alt` | text NOT NULL | accessibility |
| `src` | text NOT NULL | Vercel Blob URL |
| `width` / `height` | integer | nullable |
| `blur_data_url` | text | nullable |
| `palette` | jsonb `string[]` | from extractor; nullable |
| `sort_order` | integer NOT NULL default 0 | |
| `created_at` / `updated_at` | timestamptz NOT NULL default now() | |
| `updated_by` | text → `users.id` | nullable |

Indexes: `category_id`, `sort_order`, partial `updated_by`.

**`onboarding_slides`**

| column | type | notes |
|---|---|---|
| `id` | text PK | |
| `eyebrow_en/ru/by`, `title_en/ru/by`, `body_en/ru/by` | text NOT NULL | localized |
| `src` | text | nullable — gradient fallback when null |
| `width` / `height` / `blur_data_url` | | nullable |
| `palette` | jsonb `string[]` | gradient + extracted palette |
| `variant` | integer NOT NULL default 1 | existing `NailTileVariant` |
| `sort_order` | integer NOT NULL default 0 | |
| `created_at` / `updated_at` | timestamptz NOT NULL default now() | |
| `updated_by` | text → `users.id` | nullable |

Indexes: `sort_order`, partial `updated_by`.

**Seeds (idempotent, run inside the migration or a guarded seed step):**

- `gallery_categories`: insert the 5 current tags with localized names pulled from
  `messages/{en,ru,by}.json` `Gallery.category.*`. Stable ids derived from the tag
  (e.g. `editorial`, `gel`, `chrome`, `lace`, `bridal`).
- `gallery_items`: insert `g1`–`g8` mapping each to its category, carrying over the 2-color
  `palette`, `h` (height) → derive card height, and **any image already uploaded** to
  `studio_photos` where `slot_kind = 'gallery'` and `slot_id = <item id>` (src/alt/
  dimensions/palette). Items without an uploaded image keep `src` empty → render the
  gradient fallback exactly as today. Captions seed from a sensible default (category name)
  in each locale; admins refine later.
- `onboarding_slides`: insert the 2 current slides (`atelier`, `ritual`) with text from
  `Onboarding.*` messages in all three locales, their existing `palette` + `variant`,
  `src` empty (gradient).

Seeds are **idempotent** (`onConflictDoNothing` on PK) so re-running the migration or
running it against a partially-seeded DB is safe; they only run when `DATABASE_URL` is set.

### DB layer

- `db/gallery.ts` — reads: `listGalleryCategories()`, `listGalleryItems()`
  (ordered by `sort_order`), plus a grouped read for the customer view. Same
  `isMissingTable` (Postgres `42P01`) + no-`DATABASE_URL` graceful degradation as
  `db/studio-photos.ts`, returning empty arrays so pages keep rendering.
- `db/gallery-mutations.ts` — `createGalleryCategory`, `updateGalleryCategory`,
  `deleteGalleryCategory` (refuses + returns an error when items reference it — checked in
  a transaction, also backstopped by the FK), `reorderGalleryCategories`;
  `createGalleryItem`, `updateGalleryItem`, `deleteGalleryItem` (returns the deleted/
  replaced blob `src` so the caller purges Vercel Blob), `reorderGalleryItems`.
- `db/onboarding.ts` — `listOnboardingSlides()` (ordered), same guards.
- `db/onboarding-mutations.ts` — create / update / delete (returns blob src) / reorder.

### Entities

- `entities/gallery` — `model/types.ts` (`GalleryCategory`, `GalleryItem` with localized
  fields), `model/schema.ts` (zod `galleryCategoryFormSchema`, `galleryItemFormSchema`,
  copying the `entities/service` schema shape — `requiredLocaleString`, `sortOrder`),
  `lib/pick-localized-name` (same pattern as `entities/service`), `api/load.ts` server-only
  loaders that map DB rows to the **shape the existing `GalleryCard` / `GalleryLightbox`
  already consume** (category name as the displayed tag label, localized caption for the
  lightbox, palette/dots, derived height, image). Barrel re-exports **types only** to keep
  DB code out of client/storybook import graphs (mirrors `entities/studio`).
- `entities/onboarding` — `model/types.ts` (`OnboardingSlide`), `model/schema.ts`
  (`onboardingSlideFormSchema`), `lib/pick-localized-text`, `api/load.ts`.

### Customer views

- `views/gallery/ui/gallery-page.tsx` — replace the hardcoded `TAGS` array and
  `STUDIO_DATA.gallery` fallback with **DB categories + items passed as props**. Filter
  tabs render the DB categories (localized via the current locale). Lightbox renders the
  localized caption instead of the auto-generated one. `GalleryCard` / `GalleryLightbox`
  prop shapes stay stable (the loader adapts the data). `app/[locale]/gallery/page.tsx`
  fetches via the new loader.
- `views/onboarding/ui/onboarding-page.tsx` — consume DB slides (from the route) instead
  of the hardcoded `SLIDES` array; gradient fallback preserved when `src` is null; shared
  `"— V."` attribution stays an i18n string. `OnboardingSlide` gains an optional image
  (renders over/with the `NailTile` gradient).

### Admin features + routes

Mirror `features/services-admin` conventions: server actions are `"use server"`,
admin-gated via `requireAdmin()` (active only when `TELEGRAM_BOT_TOKEN` is set, matching
existing routes), zod-validated, and `revalidatePath` the affected customer + admin routes.

- `features/gallery-admin` — actions: create/update/delete category, reorder categories,
  create/update/delete item (with image upload + blob cleanup), reorder items. UI:
  category editor, item editor (image upload + localized caption + alt + category picker),
  admin list (categories with their pictures + drag reorder via `SortableList`).
- `features/onboarding-admin` — actions: create/update/delete slide, reorder slides. UI:
  slide editor (localized text + image upload + variant + sort), admin list with reorder.
- Shared `shared/ui/admin-image-upload` (or `features/photo-upload-admin`-adjacent)
  component: client-direct blob upload → returns `{ src, width, height, palette }`.

Routes:
- `/admin/gallery` (list), `/admin/gallery/categories/[id]` (`new`/edit),
  `/admin/gallery/[id]` (`new`/edit picture).
- `/admin/onboarding` (list), `/admin/onboarding/[id]` (`new`/edit slide).
- Add dashboard links on `/admin`.
- Remove the now-redundant **`"gallery"` group** from `/admin/photos`
  (`views/admin-photos` + `features/photo-upload-admin/model/slot.ts`).

### Revalidation

On gallery mutations: `revalidatePath("/[locale]/gallery", "page")`,
`/[locale]/home`, `/[locale]/admin/gallery`. On onboarding mutations:
`/[locale]/onboarding`, `/[locale]/admin/onboarding`. (Matches the existing
`revalidateForSlot` approach.)

### i18n

- New `AdminGallery.*` and `AdminOnboarding.*` namespaces added to
  `messages/en.json`, `messages/ru.json`, `messages/by.json` (every key in all three —
  enforced by existing message tests).
- Customer-facing gallery category labels now come from the DB. The static
  `Gallery.category.*` keys are retired once seeded into the DB; the `category_all`
  ("All") filter label stays.
- Onboarding slide text now comes from the DB; the shared `voice_attribution` stays.

## Error handling

- DB unavailable / table not migrated (`42P01`) / no `DATABASE_URL`: reads return empty
  collections; customer pages render the gradient fallback (gallery shows empty state,
  onboarding shows gradient slides). No crash.
- Category delete while non-empty: action returns a typed error surfaced in the admin UI;
  FK `restrict` is the backstop.
- Image upload failures: surfaced inline (reuse existing `upload_error_*` message keys);
  the row is not written on failure.
- Blob cleanup: deleting/replacing an image purges the old blob via
  `deletePhotoFromStorage`; a cleanup failure is logged but does not fail the DB mutation
  (matches current behavior).
- Auth: every mutation gated by `requireAdmin()` when `TELEGRAM_BOT_TOKEN` is set.

## Testing (red/green TDD)

- **DB:** mutation tests for both subsystems incl. **delete-blocked-when-category-non-empty**,
  reorder, blob-src returned on delete; schema test updated for the 3 tables; migration
  seed idempotency.
- **Entities:** zod schema tests; localized-name/text picker tests; loader mapping tests.
- **Actions:** auth gating, validation, revalidation, error paths.
- **Views:** gallery + onboarding render-from-DB tests, fallback-when-empty tests.
- **UI components:** mandatory Storybook story + Vitest test per new component
  (per the `new-ui-component` skill).
- **E2E (Playwright):** admin gallery flow (create category → add picture → edit
  caption → reorder → delete blocked → move/delete) and admin onboarding flow
  (add slide → upload image → edit text → reorder → delete).
- Before completion: `npm run lint`, `npm test`, `npm run build` per
  `verification-before-completion`.

## Out of scope (YAGNI)

- No soft-delete/archive/restore for gallery or onboarding (hard delete chosen).
- No "Uncategorized" fallback bucket (delete is blocked instead).
- No changes to the existing `studio_photos` slot system for service/master/atelier/profile.
- No new CDN/remote image patterns beyond what `next.config.ts` already allows for Blob.

## Migration / rollout notes

- Single drizzle migration adds 3 tables + idempotent seeds; safe to run against existing
  prod (`onConflictDoNothing`).
- Existing uploaded gallery images in `studio_photos` (slot kind `gallery`) are carried
  into `gallery_items` by the seed; those `studio_photos` rows can be left in place (dead
  but harmless) or cleaned up in a follow-up — not required for correctness.
