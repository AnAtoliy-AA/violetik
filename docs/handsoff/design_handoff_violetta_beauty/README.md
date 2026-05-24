# Handoff: Violetta Beauty — Private Nail Atelier

A premium nail-atelier web app. Editorial-luxury aesthetic with parallax, shared-element transitions, animated reveals, and a curated booking flow.

---

## 0. Target stack (CONFIRMED)

- **Next.js 16** (App Router, `params` is a `Promise` and must be awaited)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4** (CSS-first via `@theme`, no `tailwind.config.ts`)
- **Feature-Sliced Design (FSD)** under `src/{shared,entities,features,widgets,pages}/`
- **`[locale]/` routing** powered by `next-intl` (default `en`, `uk` ready)
- **Motion for React** (`motion` package, not `framer-motion`)
- **Zustand** for booking state

If a v14 / Tailwind v3 / flat-`app/` template ever shipped — **discard it.** This handoff is the source of truth.

---

## 1. About the design files

The files bundled here are **design references created in HTML** — a clickable prototype showing the intended look, motion, copy, and behavior. They are **not production code to copy directly.**

Your job: **recreate these designs inside the existing Next 16 + Tailwind v4 + FSD codebase**, using its established patterns. Match the prototype pixel-for-pixel where possible; lift the React/CSS techniques (parallax math, NailTile gradient stacks, transition timings) but rewrite them as proper components inside FSD slices.

When you open `Violetta Beauty.html` in a browser, you'll see the prototype. Use the in-app **Tweaks** panel (top-right toggle) to switch palette / fonts / animation intensity / density / dark mode, and the **Jump to** select to navigate every screen quickly.

## 2. Fidelity

**High-fidelity.** Every color, font, size, motion timing, and copy line is final unless flagged in §13. Reproduce exactly. Replace `NailTile` gradient placeholders with `next/image` + real photography when assets are ready (signatures stay the same).

---

## 3. Read this next

`IMPLEMENTATION.md` (in this folder) is the long-form contract — it has every Tailwind v4 token, the full `globals.css` with `@theme` block, `next-intl` setup, async-params patterns, motion specs per screen, and acceptance checklists. **Skim it before touching code.** This README is the executive summary; the implementation doc is the spec.

---

## 4. Screens (in order of the flow)

All routes live under `/[locale]/...` (e.g. `/en/home`, `/uk/services`). Each screen maps to a page slice in `src/pages/<slice>/`.

### 4.1 Welcome — `/welcome`
**Splash + entry.** Letter-by-letter mask-up reveal of the "Violetta" wordmark (70ms stagger, 1.1s cubic-bezier(0.22, 1, 0.36, 1) per letter). Shimmering gold `B · E · A · U · T · Y` subline below. A central `NailFan` motif and a tagline appear at +1.9s. Two CTAs at the bottom: gold "Enter the atelier" and ghost "I already have an account".

### 4.2 Onboarding — `/onboarding`
3-card horizontal pager (translateX 100% between slides, 700ms ease-in-out). Each card has a hero `NailTile` image (upper 60%) with a parallax-floating `NailFan` over its bottom-right; the lower 40% is text on `surface`. Dots indicator (active = 22×4 gold pill, inactive = 6×4 muted). "Skip" returns to `/home`.

### 4.3 Home — `/home` *(tab bar)*
Editorial discover page:
- Status bar + wordmark + hamburger
- Magazine header strip: `VOL XXIV · No 24 | SS · MMXXVI | VERBENA · 14`
- Hero h1 with shimmering gold "portrait." word, parallax fade as user scrolls
- Floating gold `NailFan` upper-right, reverse-parallax
- Capsule announcement card with 3px gold left edge
- "Signatures" — top 4 services as menu rows with dot-leader pricing and italic-display titles
- Master card linking to `/master`
- Horizontal gallery scroll (5 cards, snap, Nº corner marks)
- Testimonial card with oversized italic quote glyph
- Membership CTA with radial gold glow
- Footer with ornament rule

### 4.4 Services — `/services` *(tab bar)*
Six services, restaurant-menu styling. Header: `PLATE · 02 · A LA CARTE · 06 RITUALS`. h1 "The menu." (56px italic). Category filter chips (All / Care / Gel / Design / Form). Each row: thumbnail tile, dot-leader, italic title, plate number, price in gold, blurb. Hover → translateX(4px).

### 4.5 Service detail — `/services/[id]`
Full-bleed 440px parallax hero with the service's `NailTile` (scale 1→1.2 on scroll). Plate number + category overlay top-left, large italic title + duration/price split rule at bottom. Drop-cap intro paragraph (56px italic gold first letter). Numbered "WHAT IT INCLUDES" list with italic-display numerals. 3-up "RECENT IN THIS STYLE" mini-gallery. Sticky bottom CTA with price + "Reserve a chair" gold button.

### 4.6 Booking — `/booking/[step]`
4 steps: `service`, `date`, `time`, `confirm`. Top: step counter (`STEP 02 OF 4`) + 4 hairline progress bars that fill gold left-to-right. Step content fades + translates 12px on mount.
- **Service**: radio list of services with thumbnail, gold ring when active
- **Date**: 14-day strip (May 19 → Jun 1), Sun/Mon disabled, selected = gold pill (`layoutId="date-pill"` for smooth transitions)
- **Time**: 7 time slots in 2-col grid, 11:30 and 16:00 marked "Reserved"
- **Confirm**: review card with hairline rows (Ritual / Master / Date / Time / Location), dashed total box at bottom
Sticky gold "Continue" / "Confirm appointment" CTA.

### 4.7 Confirmation — `/booking/confirmation`
Cinematic celebration:
- `t=0`: blank
- `t=200ms`: golden seal scales 0.5→1 and rotates −40°→0° (900ms)
- `t=900ms`: checkmark fades in inside the seal
- `t=900ms`: 18 gold/violet/rose confetti dots fly up −50…−150px, staggered 30ms
- `t=1500ms`: headline + appointment card slide up
"#VB-XXXX" reservation number. Two CTAs: solid "Add to calendar" + ghost "Return to the atelier".

### 4.8 Gallery — `/gallery` *(tab bar)*
Tag filter chips (All / Editorial / Gel / Chrome / Lace / Bridal). 2-column CSS-grid masonry, item heights from data (200–300px), staggered float-in (60ms × index). Each card has a tag pill bottom-left. Tap → fixed lightbox with `backdrop-filter: blur(20px)` and shared `layoutId` image growth.

### 4.9 Master — `/master`
Hero portrait "card" (1:1.2 ratio) with editorial overlay (`VIOLETTA · MMXIV` plate mark, large italic name). Bio paragraph. Pull-quote with left gold rule. Stats row (11 / years · 1 / chair · 600+ / sets) inside double hairline rules. Three voice cards (italic-display testimonial + tiny avatar + role mark). CTA: "Reserve with Violetta".

### 4.10 Membership — `/membership`
Three tiers (Petale free, **Violette featured** at €180/mo, Atelier €420/mo). Monthly/Annual toggle in a pill (annual = ×10, "2 mo free" label). Featured tier has gold border + radial glow + "MOST CHOSEN" tag. Each tier: italic price, plate-mark cadence, perks list with bullet, gold CTA on featured / outline elsewhere.

### 4.11 Profile / You — `/profile` *(tab bar)*
Avatar disc (radial gradient placeholder), member tag, italic display name. "NEXT VISIT" card with floating decorative `NailFan` and countdown chip ("IN 3 DAYS"). Quick links list (Membership / Saved styles / Aftercare guide / Studio location) — border-separated rows. History rows with service / date / gold price. Sign out (outline).

---

## 5. Design tokens (canonical values)

Set these in `src/app/globals.css` under `@theme { ... }`. See `IMPLEMENTATION.md` §3 for the full file.

### Colors — Aubergine (default palette)

| Token            | Value                           | Tailwind utility |
|------------------|---------------------------------|------------------|
| bg               | `#100612`                       | `bg-bg` |
| bg-2             | `#18091c`                       | `bg-bg-2` |
| surface          | `#1f0e25`                       | `bg-surface` |
| surface-2        | `#2a1432`                       | `bg-surface-2` |
| text             | `#f4ead8`                       | `text-text` |
| text-2 (68% a)   | `rgba(244,234,216,0.68)`        | `text-text-2` |
| text-3 (42% a)   | `rgba(244,234,216,0.42)`        | `text-text-3` |
| accent (gold)    | `#c9a96e`                       | `text-accent` / `bg-accent` |
| accent-2         | `#e8cf99`                       | |
| plum             | `#7d3a6f`                       | |
| violet           | `#9d7bc7`                       | |
| rose             | `#d9a3b6`                       | |
| line (8% a)      | `rgba(243,234,216,0.08)`        | `border-line` |
| line-strong (18%)| `rgba(243,234,216,0.18)`        | `border-line-strong` |

Other palettes (Rose / Lilac / Mono) defined in `IMPLEMENTATION.md` §2.1 — production picks one; the others are for design exploration only.

### Gold gradient

```css
--background-image-gold: linear-gradient(
  135deg, #b8956a 0%, #e8cf99 25%, #fff5d6 45%, #d4b27a 65%, #a07b48 100%
);
```

Use as `bg-gold` (Tailwind utility generated from the `@theme` token). For text use the `.text-gold` and `.text-gold-shimmer` utilities defined in globals.

### Typography

| Role     | Family                                  | Weights         | CSS var            |
|----------|------------------------------------------|-----------------|--------------------|
| Display  | Cormorant Garamond (italic & roman)     | 300 / 400 / 500 | `--font-display`   |
| Body/UI  | DM Sans                                 | 300 / 400 / 500 / 600 | `--font-body` |
| Mono     | JetBrains Mono                          | 400 / 500       | `--font-mono`      |

Load via `next/font` and bind to the CSS variables `@theme` is expecting. See `IMPLEMENTATION.md` §3.1.

### Type scale (final values)

| Use                        | Size              | Weight | Style    | Letter-spacing | Line-height |
|----------------------------|-------------------|--------|----------|----------------|-------------|
| Welcome wordmark           | clamp(72px,22vw,110px) | 300 | italic | −0.025em       | 0.95 |
| Page h1                    | clamp(56px,16vw,76px)  | 300 | italic | −0.025em       | 0.94 |
| Section h2                 | 34–40px           | 400    | italic   | −0.02em        | 1.05 |
| Card title                 | 22–28px           | 400    | italic   | −0.01em        | 1.05–1.1 |
| Body                       | 14.5–16px         | 400    | normal   | 0              | 1.55–1.65 |
| Plate mark / eyebrow       | 9–10px            | 500    | mono     | 0.32em         | 1 |
| Tag / chip                 | 11px              | 500    | mono     | 0.16em         | 1 |
| Large price                | 24–30px           | 400    | italic   | 0              | 1 |

### Radius

12 / 18 (default) / 28 → `rounded-sm` / `rounded` / `rounded-lg`.

### Motion timing

| Token          | Value                              | Tailwind utility |
|----------------|------------------------------------|------------------|
| ease-out       | `cubic-bezier(0.22, 1, 0.36, 1)`   | `ease-out` |
| ease-in-out    | `cubic-bezier(0.65, 0, 0.35, 1)`   | `ease-in-out` |
| duration       | 520ms                              | `duration-DEFAULT` |
| duration-fast  | 260ms                              | `duration-fast` |

Honor `prefers-reduced-motion` → set both durations to 0 and disable shimmer/letter-in. The `globals.css` block in `IMPLEMENTATION.md` already does this.

---

## 6. Components → FSD mapping

| Component        | Slice                                | Layer    |
|------------------|--------------------------------------|----------|
| Btn / Tag / Eyebrow / Plate / Ornament / Wordmark / StatusBar / NailTile / NailFan | `shared/ui/<kebab-name>` | shared |
| ServiceCard      | `entities/service/ui/service-card`   | entities |
| MasterCard       | `entities/master/ui/master-card`     | entities |
| BookServiceFlow + step indicator | `features/book-service` | features |
| GalleryFilter    | `features/filter-gallery`            | features |
| LocaleSwitcher   | `features/switch-locale`             | features |
| AppHeader        | `widgets/app-header`                 | widgets  |
| TabBar           | `widgets/tab-bar`                    | widgets  |
| Hero (Home & ServiceDetail) | `widgets/hero` (variant prop) | widgets |
| BookingStepper   | `widgets/booking-stepper`            | widgets  |
| `<Slice>Page`    | `pages/<slice>/ui`                   | pages    |

Strict layer rules — `shared` may not import from above it, `entities` may only import `shared`, `features` may import `entities`+`shared`, `widgets` may import below, `pages` may import below, `app/[locale]/...` only imports from `pages`/`widgets`. Always go through each slice's `index.ts`.

---

## 7. Interactions & behavior

### Navigation
- Tab bar (`Atelier / Services / Gallery / You`) is a sticky pill at the bottom of any tab-bar route. Active tab pill animates between positions via Motion's `layoutId="tab-thumb"`. Read active route with `useSelectedLayoutSegment()`.
- Detail screens slide left-in / right-out via `<AnimatePresence mode="wait">` wrapping `children` in route-group layouts.
- Back arrows: pop via `useRouter().back()`; mark direction in a small `useRouteDirection()` hook in `shared/lib` to reverse the transition direction.
- **Always import `Link` / `useRouter` from `@/i18n/navigation`** (next-intl wrapper) — `next/link` would strip the locale prefix.

### Scroll
- Home + ServiceDetail use `useScroll()` and `useTransform()` for parallax. Apply on `motion.div` wrappers; don't read scroll in plain React state (causes jank).

### Forms (booking)
- Date / time selections live in a Zustand store at `src/pages/booking/model/booking-store.ts`, persisted via `zustand/middleware/persist` → `sessionStorage`.
- Step routing is via `[step]` segment, not React state — `/booking/date` etc. — so browser back works.

### Lightbox
- Gallery lightbox is a Portal mounted at the page slice. Closes on backdrop click or `Esc`. Shared `layoutId` from the source card.

### Loading / error states
- Wrap each page slice in a `Suspense` boundary fed by `loading.tsx` in its route folder. Skeletons: muted `surface` panels at the right shape, no spinner.
- `error.tsx` per route group with a small "Something went wrong — retry" card.

### Responsive
- Mobile-first. App canvas is centered, max-width 460px on desktop with decorative side rails (see prototype). Touch targets ≥ 44px.

---

## 8. State management

- `src/pages/booking/model/booking-store.ts` (Zustand) — `{ serviceId, date, time, step }`, persisted to sessionStorage. Selectors exposed via `useBooking()`.
- `src/features/switch-theme/model/theme-store.ts` (Zustand) — only if you ship a runtime palette switcher. Otherwise hard-code Aubergine.
- All other state is local to its component (filter chips, lightbox open state, parallax scroll).

No global app store. No Redux.

---

## 9. Data shape

See `src/components.jsx` `VIOLETTA_DATA` in this bundle for the seed content (services, gallery items, testimonials, membership tiers, account fixture). Type signatures in `IMPLEMENTATION.md` §7.

Stand up locale-aware variants under `src/i18n/messages/{en,uk}.json` for any copy that will be translated — page titles, CTAs, marketing copy. Service names, prices, and master quotes can remain in `entities/service/model/service.fixtures.ts` until a CMS lands.

---

## 10. Assets

- All imagery in the prototype is **procedural CSS** (the `NailTile` component) — there are no image files to copy. Replace with `next/image` + real photography when shoots come in. Same prop shape, same call sites.
- Icons: bundled prototype draws every icon inline as SVG. Production: use `lucide-react` (already in dependency list). The handful needed: arrow-left, arrow-right, menu, clock, settings/gear, check.
- Fonts: load from Google Fonts via `next/font` (see §5 / IMPLEMENTATION.md §3.1). Optional: self-host woff2 in `public/fonts/` later for LCP.

---

## 11. Files bundled

```
design_handoff_violetta_beauty/
├── README.md                              ← you are here
├── IMPLEMENTATION.md                      ← long-form spec (Tailwind v4 + Next 16 + FSD)
├── Violetta Beauty.html                   ← clickable prototype — open in a browser
├── tweaks-panel.jsx                       ← dev-only Tweaks UI (don't ship)
└── src/
    ├── tokens.css                         ← prototype's design tokens (port into @theme)
    ├── components.jsx                     ← shared primitives + VIOLETTA_DATA seed
    ├── screens.jsx                        ← Welcome / Onboarding / Home / Services / ServiceDetail
    ├── screens-flow.jsx                   ← Booking / Confirmation / Gallery / Master / Membership / Profile
    └── app.jsx                            ← prototype router + Tweaks wiring (NOT a Next.js app)
```

The `.jsx` files use Babel-standalone-in-browser — they are **not** drop-in for a Next.js project. Treat them as visual + behavioral reference. Lift techniques (NailTile composition, parallax math, motion timings, copy) into proper TS components inside FSD slices.

---

## 12. Acceptance criteria

Per-screen checklists are in `IMPLEMENTATION.md` §8. Top-level:

- [ ] All routes under `/[locale]/...`, locale segment awaited correctly.
- [ ] Tailwind v4 `@theme` block contains every token from §5; no `tailwind.config.ts`.
- [ ] FSD layer-boundary lint rule passes (`eslint-plugin-boundaries` or `@feature-sliced/eslint-config`).
- [ ] `next-intl` resolves on the server (`setRequestLocale` called in every layout/page).
- [ ] `motion/react` used, not `framer-motion`. Server components stay server; only motion leaves are `'use client'`.
- [ ] `prefers-reduced-motion` disables shimmer + letter-in + sets duration to 0.
- [ ] LCP < 2.0s, INP < 200ms on mobile (Lighthouse / WebPageTest).
- [ ] Color contrast: text-2 over surface ≥ 4.5:1. text-3 used only for chrome.
- [ ] Touch targets ≥ 44px.
- [ ] Status bar (`9:41 · VIOLETTA · OPEN · 5G`) is **deleted** from production — it's a prototype conceit.

---

## 13. Replace before launch

- [ ] **Imagery** — `NailTile` placeholder → `next/image` + AVIF photography.
- [ ] **Copy** — confirm studio address, instagram, master bio, hours with Violetta.
- [ ] **Pricing** — current numbers are illustrative.
- [ ] **Membership economics** — confirm "2 months free annual" math.
- [ ] **Testimonials** — get permission + real names.
- [ ] **Booking back-end** — wire to whatever system the studio is using.
- [ ] **Auth** — `/profile` assumes a session. NextAuth + email OTP is a safe default.
- [ ] **Analytics** — Vercel Analytics or Plausible.
- [ ] **Localisation** — `en.json` is the seed; populate `uk.json` (and any other locales) before flipping the switch.

---

## 14. Open questions for the client

1. Online payment, deposit-only, or pay-at-studio?
2. Cancellation policy — 24h / 48h / no-show fee?
3. Guest artists ever, or always solo?
4. Annual membership math — confirm.
5. Locale coverage — confirm full list and translation owner.
6. Photography — who shoots and when?

---

*End of handoff. Open `Violetta Beauty.html` alongside `IMPLEMENTATION.md` — every interaction in the prototype is the spec.*
