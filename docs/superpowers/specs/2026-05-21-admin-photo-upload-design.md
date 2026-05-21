# Admin photo upload design

**Branch:** `feature/admin-photo-upload` off `develop`
**Includes:** the photography wiring originally proposed as PR #40
(`feat(studio): wire optional photography…`) — cherry-picked here so the
two ship together.
**Storage:** Vercel Blob.

## Why

The premium-wow brief ships with `NailTile` gradient placeholders
everywhere. PR #40 wired the data model — `Service.image?`, `GalleryItem.image?`,
etc. — but no one can populate those fields. This PR builds the admin path:
upload a JPEG from `/admin/photos`, store it in Vercel Blob, persist the
URL + dimensions + alt text in a new Drizzle table, render it on the
customer pages.

## Architecture

### Data flow

```
admin selects slot + JPEG
        │
        ▼
server action: uploadStudioPhotoAction(formData)
        │
        ├──▶ Vercel Blob put({ access: "public" }) → { url, downloadUrl }
        │
        └──▶ DB INSERT studio_photos (slotKind, slotId, src, width, height, alt, ...)
                │
                ▼
       customer page route (RSC) calls loadStudioPhotos(kind)
                │
                ▼
       transforms STUDIO_DATA.<kind>[] by overlaying image: { src, ... }
                │
                ▼
       passes merged data into existing view components → next/image renders
```

### Schema

`db/schema.ts` gains a new table:

```ts
export const photoSlotKind = pgEnum("photo_slot_kind", [
  "service", "gallery", "atelier", "master", "testimonial", "profile",
]);

export const studioPhotos = pgTable(
  "studio_photos",
  {
    id: text("id").primaryKey(),
    slotKind: photoSlotKind("slot_kind").notNull(),
    slotId: text("slot_id").notNull(),
    src: text("src").notNull(),
    alt: text("alt"),
    width: integer("width"),
    height: integer("height"),
    blurDataUrl: text("blur_data_url"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().default(sql`now()`),
    uploadedBy: text("uploaded_by").references(() => users.id),
  },
  (table) => ({
    uniqueSlot: uniqueIndex("studio_photos_slot_uq").on(table.slotKind, table.slotId),
  }),
);
```

One row per (slotKind, slotId) — uploading a second photo for the same
slot replaces the existing row and deletes the old Blob.

### Layers

| Layer | Path | Role |
|---|---|---|
| Storage adapter | `shared/lib/photo-storage/` | Wraps `@vercel/blob` `put` / `del`. Validates content type + size. Returns `{ url, width, height }`. |
| DB queries | `db/studio-photos.ts` | `upsertStudioPhoto`, `deleteStudioPhoto`, `getStudioPhotos(kind)`, `getStudioPhoto(kind, slotId)`. Server-only. |
| Server action | `features/photo-upload-admin/api/upload-studio-photo.ts` | Auth check (role=admin), file validation, calls storage + DB, `revalidatePath("/admin/photos")` and the corresponding customer route. |
| Admin UI | `features/photo-upload-admin/ui/photo-upload-row.tsx` + `views/admin-photos` | Per-slot row with preview + upload form + delete button. |
| Customer read | `entities/studio/api/load-with-photos.ts` | `loadStudioServices()`, `loadStudioGallery()`, `loadStudioArtist()`, etc. — return entities with `image` populated from DB. |
| Route call sites | `app/[locale]/services/page.tsx`, `app/[locale]/services/[id]/page.tsx`, `app/[locale]/home/page.tsx`, `app/[locale]/master/page.tsx`, `app/[locale]/gallery/page.tsx`, `app/[locale]/profile/page.tsx` | Each fetches the entity-with-photos via the loaders and passes through. |

### Config

- `next.config.ts` adds `images.remotePatterns` for the Vercel Blob domain
  (`*.public.blob.vercel-storage.com`).
- Env: `BLOB_READ_WRITE_TOKEN` (read at runtime by `@vercel/blob`).
- Storage adapter falls back to `null` returns when the token is missing so
  CI builds and local dev without a token work — the admin form shows a
  disabled-state explaining the env var is missing.

### Validation

- Content-type: `image/jpeg`, `image/png`, `image/webp`, `image/avif`.
- Max size: 8 MB.
- Width/height: read from the file header via lightweight inspection (no
  full decode — use the `image-size` package if needed, or trust the
  client-provided dimensions for v1 and lazy-fix in a follow-up).
- Alt text: required, non-empty.

### A11y / i18n

- `/admin/photos` follows the existing admin chrome (PR #38) — same `<AppHeader admin />`, gilded cards.
- Translations under `Admin.photos_*` in `en/ru/be`.

## Tests

- `db/studio-photos.test.ts` — unit tests around the queries (mocked DB).
- `shared/lib/photo-storage/storage.test.ts` — validates the content-type / size guards.
- `features/photo-upload-admin/api/upload-studio-photo.test.ts` — server-action flow with mocked Blob + DB.
- `views/admin-photos/ui/admin-photos-page.test.tsx` — renders all slot rows, shows preview for slots with a row.
- Migration: drizzle-kit emits an `.sql` file; the existing migration test in `db/schema.test.ts` verifies the schema parses.
- Pre-commit (lint + Vitest) + pre-push (build) gate.

## Out of scope

- Bulk import from Instagram (Phase H — would build on this).
- Image cropping / focal-point editor in the admin.
- Multi-photo slots (e.g., a service with both hero + gallery shots).
- Automatic `blurDataURL` generation via `plaiceholder` — schema reserves
  the column; a future PR can backfill it.

## Done when

`/admin/photos` lists every slot in the app with a preview, lets an admin
upload a JPEG per slot, and the customer pages render the uploaded image
on next refresh. Lint, test, build green. PR open against `develop`.
