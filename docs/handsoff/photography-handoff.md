# Photography handoff

The app is wired to render real photographs everywhere a `NailTile` gradient
currently stands in. This doc tells the photographer / asset deliverer
exactly where to drop files and how to register them.

## TL;DR

1. Drop image files under `public/studio/…` (paths below).
2. Open `entities/studio/model/data.ts`, set the optional `image` (or `avatar`,
   or `video`) field on the matching entity to point at the dropped file.
3. Refresh the page — the gradient placeholder is replaced by the photograph.

No code changes beyond `data.ts` are needed for the swap.

## Directory layout

All assets live under `public/studio/`. The `public/` directory is otherwise
intentionally empty (CLAUDE.md tracks this).

| Slot | File path | Aspect | Used by |
|---|---|---|---|
| Service thumbnail + hero | `public/studio/services/{id}.jpg` | 5:6 (portrait) | `ServiceCard`, `ServiceMenuItem`, `DetailHero` |
| Gallery tile | `public/studio/gallery/{id}.jpg` | natural | `GalleryCard`, `GalleryLightbox` |
| Master portrait | `public/studio/master.jpg` | 1:1.2 | `MasterPage` hero |
| Testimonial avatar | `public/studio/testimonials/{id}.jpg` | 1:1 | testimonial cards |
| Profile avatar | `public/studio/profile.jpg` | 1:1 | `ProfilePage` |
| Atelier-motion clip | `public/studio/atelier/{key}.mp4` | 3:4 | `AtelierMotion` |
| Atelier-motion poster | `public/studio/atelier/{key}-poster.jpg` | 3:4 | `AtelierMotion` poster frame |

`{id}` matches the entity id in `data.ts`. For services, that's `signature`,
`gel`, `editorial`, `extensions`, `pedi`, `removal`. For the gallery,
`g1`–`g8`. Testimonials: `t1`, `t2`, `t3`. Atelier clip keys: `buff`,
`polish`, `design`.

## Sizing + format

- **JPEG** is fine for photographs. Use 80% quality, sRGB.
- **AVIF/WebP** also work — `next/image` will serve the optimal format per
  browser. Author in JPG; Next handles conversion at build time.
- Target the **largest** size the slot ever displays (e.g. service hero at
  ~420px wide on mobile, ~840px on retina = export at ~1200px wide). Next
  will downscale at request time.
- Atelier clips: H.264 MP4, ≤ 4 seconds, ≤ 800KB each. Loop seamlessly.

## Registering a new asset

Edit `entities/studio/model/data.ts`. Example for the Signature Manicure
service:

```ts
{
  id: "signature",
  name: "Signature Manicure",
  // …existing fields…
  image: {
    src: "/studio/services/signature.jpg",
    alt: "Signature Manicure — close-up of finished nails",
    width: 1200,
    height: 1440, // optional but helps next/image
    // Optional blur-up placeholder, e.g. generated via plaiceholder:
    // blurDataURL: "data:image/jpeg;base64,…",
  },
},
```

For gallery items, the field is `image`. For the artist, `image`. For
testimonials, `avatar`. For the customer profile, `avatar`. For atelier
clips, the field is `video`:

```ts
{
  key: "buff",
  palette: ["#7d3a6f", "#c9a96e"],
  video: {
    src: "/studio/atelier/buff.mp4",
    posterSrc: "/studio/atelier/buff-poster.jpg",
    alt: "Buffing a nail with the studio's e-file",
  },
},
```

## Blur-up placeholders (optional)

For above-the-fold images (service detail hero, master portrait), generating
a base64 `blurDataURL` gives the smoothest perceived load. The easiest path
is the [`plaiceholder`](https://plaiceholder.co) package, but any tool that
emits a base64 LQIP works. Drop the resulting string into
`image.blurDataURL` and `next/image` switches to `placeholder="blur"`
automatically.

## CDN / remote URLs

If imagery lives off the origin (e.g. an S3 bucket or Cloudinary), set
`image.src` to the absolute URL and add a matching entry to
`next.config.ts`'s `images.remotePatterns`. The wiring otherwise stays
identical.

## Verification

After dropping assets and editing `data.ts`:

- `npm run lint` — should be clean (only data changed).
- `npm test` — existing tests cover the conditional render in NailTile.
- `npm run dev` — visit each affected page; the gradient is replaced by
  the photograph.
- `npm run build` — Next inlines image dimensions at build time.

## What stays as a gradient

Any entity that doesn't carry an `image` / `avatar` / `video` field falls
back to the existing gradient placeholder. So you can ship photography
incrementally — one service at a time, the gallery alone, just the master
portrait — and the rest of the app keeps working.
