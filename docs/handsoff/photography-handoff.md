# Photography handoff

The studio uploads its own photographs through `/admin/photos`. Files go to
**Vercel Blob**, metadata persists in the `studio_photos` Postgres table, and
the customer pages render the photographs immediately on next visit. Nothing
ever lands in this repository — the public `public/studio/` directory stays
empty by design.

## For Violetta (the admin)

1. Sign in with Telegram at `/sign-in` (you need the `admin` role — ask the
   developer to flip it the first time).
2. Open `/admin` → **Photography**.
3. For each slot, pick a JPEG/PNG/WebP/AVIF file (≤ 8 MB), write a one-line
   alt text describing what the photograph shows, click **Upload**.
4. Replace an existing photo by uploading a new one — the old asset is
   deleted automatically. Press **Remove** to clear a slot back to the
   gradient placeholder.

That's it. The catalog, detail hero, gallery, master portrait, testimonial
avatars and atelier-motion posters all update on the next page load.

## For the developer setting it up

### Provision Vercel Blob

```bash
# In the Vercel dashboard:
# Storage → Create → Blob → name it (e.g. "violetik-studio")
# Copy the BLOB_READ_WRITE_TOKEN it generates.
```

Set the env var locally:

```bash
echo 'BLOB_READ_WRITE_TOKEN="vercel_blob_rw_…"' >> .env.local
```

In production, set it in the project's environment variables. Without it,
the admin form disables itself and shows a banner — uploads can't happen
but the rest of the app keeps working.

### Database migration

The `studio_photos` table ships with migration `0006_studio_photos.sql`.
Apply it via:

```bash
npm run db:migrate
```

### Schema

```ts
studioPhotos {
  id            text  PRIMARY KEY
  slotKind      enum  // service | gallery | atelier | master | testimonial | profile
  slotId        text  // matches the entity id, e.g. "signature", "g3", "t1"
  src           text  // public Vercel Blob URL
  alt           text  // for next/image
  width / height int  // natural dimensions read client-side before upload
  blurDataUrl   text  // reserved for a future plaiceholder pass — nullable
  uploadedAt    ts
  uploadedBy    -> users.id
}
UNIQUE (slotKind, slotId)
```

One row per slot — the second upload replaces the first row and the old
Blob is deleted server-side.

### Slot kinds the admin can target

| Slot kind | Slot ids | Where it renders |
|---|---|---|
| `service` | `signature`, `gel`, `editorial`, `extensions`, `pedi`, `removal` | ServiceCard (home signatures), ServiceMenuItem (catalog rows), DetailHero |
| `gallery` | `g1`–`g8` | Gallery grid + lightbox |
| `master`  | `violetta` | Master page portrait |
| `testimonial` | `t1`, `t2`, `t3` | Master testimonial avatars |
| `atelier` | `buff`, `polish`, `design` | AtelierMotion poster frames |
| `profile` | the demo customer id | Profile page avatar |

The full roster is generated from `entities/studio/model/data.ts` at
runtime by `listAllPhotoSlots()` — adding a new service or testimonial
automatically surfaces a new upload row in `/admin/photos`.

## CDN-only path (if you skip Vercel Blob)

If the studio prefers Cloudinary / R2 / S3 / its own CDN, swap out the
storage adapter at [`shared/lib/photo-storage/storage.ts`](../shared/lib/photo-storage/storage.ts).
The contract is two functions — `uploadPhotoToStorage` and
`deletePhotoFromStorage`. Add the new host to
`next.config.ts` `images.remotePatterns` and update the
`BLOB_READ_WRITE_TOKEN` check to whatever env var your provider needs.

## What stays as a gradient

Any entity that doesn't have a `studio_photos` row keeps rendering the
existing `NailTile` gradient. So photography can ship incrementally — one
service at a time, the gallery alone, just the master portrait — and the
rest of the app keeps working.
