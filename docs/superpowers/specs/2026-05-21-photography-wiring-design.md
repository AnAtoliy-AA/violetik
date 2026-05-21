# Photography wiring design

**Branch:** `feature/photography-wiring` off `develop`
**Follows:** premium-wow phases A–E (PRs #35–#39).
**Related:** `docs/handsoff/violetik - Premium Wow Upgrade.md` §18 (out-of-scope for the brief, owned here).

## Why

Every visual placeholder in the app is still a `NailTile` gradient or an empty `<video>` element. The studio brand needs real imagery to ship to customers. The handoff explicitly deferred photography to a follow-up. This PR builds the **wiring** so swapping placeholders for real assets is a one-line change in `entities/studio/model/data.ts` plus dropping files in `public/studio/`.

This PR ships **no real photos** — the brief's `public/` is intentionally empty and remains so. The wiring is the deliverable.

## Scope

1. **New `ImageAsset` and `VideoAsset` types** in [`entities/studio/model/types.ts`](entities/studio/model/types.ts):
   ```ts
   export interface ImageAsset {
     src: string;
     alt?: string;
     width?: number;
     height?: number;
     blurDataURL?: string;
   }
   export interface VideoAsset {
     src: string;
     posterSrc?: string;
     /** Accessible label for screen readers + as the <video> aria-label. */
     alt?: string;
   }
   ```

2. **Optional asset fields** on existing entities:
   - `Service.image?: ImageAsset` — used by `ServiceCard` thumbnail, `ServiceMenuItem` thumbnail, and the detail hero.
   - `GalleryItem.image?: ImageAsset` — used by the gallery grid and lightbox.
   - `Artist.image?: ImageAsset` — used by the master page portrait.
   - `Testimonial.avatar?: ImageAsset` — small avatar disc per testimonial.
   - `CustomerProfile.avatar?: ImageAsset` — profile page avatar.
   - A new `AtelierClip[]` field on `STUDIO_DATA` describing the three home clips with optional `video?: VideoAsset` each.

3. **NailTile becomes asset-aware**. If `image` prop is passed, render `next/image` filling the container; otherwise render the existing gradient. The `palette` + `variant` props remain the default for placeholder rendering.

4. **AtelierMotion reads from `STUDIO_DATA.atelierClips`** (new) rather than the hard-coded array; renders the placeholder gradient until `video.src` is set.

5. **Service detail hero, gallery card, gallery lightbox, master portrait, testimonial avatars, profile avatar** all switch to the asset-aware NailTile or render `next/image` directly when the data carries an `image`.

6. **Asset path conventions**, documented in [`docs/handsoff/photography-handoff.md`](docs/handsoff/photography-handoff.md):
   - `public/studio/services/{id}.jpg` — 1:1.2 ratio, used as service hero + thumbnails.
   - `public/studio/gallery/{id}.jpg` — natural ratio, used in grid.
   - `public/studio/atelier/{key}.mp4` + matching `{key}-poster.jpg`.
   - `public/studio/master.jpg`, `public/studio/testimonials/{id}.jpg`, `public/studio/profile.jpg`.
   - Optional `blurDataURL` for blur-up placeholders.

## Not in scope

- Photographing the studio or sourcing imagery.
- CDN setup. Local `public/` works out of the box; CDN bases can be wired later by extending `ImageAsset.src` to an absolute URL and adding `remotePatterns` to `next.config.ts`.
- Image-editor admin UI.

## Testing

- Vitest: each consumer (NailTile, ServiceCard, ServiceMenuItem, GalleryCard) gets a test asserting the gradient fallback still renders when no image is passed and an `<img>` (next/image) renders when one is.
- The 340 existing tests must remain green.
- Playwright: existing suite is data-agnostic; no asset bundling, no e2e changes needed.

## Done when

Lint, Vitest (existing + new), build all green. A single edit to `entities/studio/model/data.ts` (e.g. `services[0].image = { src: "/studio/services/signature.jpg", … }`) plus dropping that file under `public/studio/services/` makes the catalog row, the home signatures row, and the service detail hero all swap from gradient to photograph — no other code changes. PR open against `develop`.
