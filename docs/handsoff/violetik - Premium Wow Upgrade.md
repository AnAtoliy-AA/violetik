# Violetik — Premium Wow Upgrade

**For Claude Code.** Drop this into `docs/design/premium-wow-upgrade.md` in the repo, then work tasks top‑to‑bottom on a `feature/premium-wow` branch off `develop`. Each task lists the exact files to touch.

> **Read first:** [`CLAUDE.md`](../../CLAUDE.md) · [`ONBOARDING.md`](../../ONBOARDING.md) · the existing handoff in `docs/handsoff/start.md`.
>
> **Constraints — do not break:**
> - Feature‑Sliced Design layer rules (imports only point down).
> - `next-intl`: every new copy string lands in `messages/{en,ru,be}.json`.
> - Use the `motion` package (Motion for React), never `framer-motion`.
> - Always honor `useReducedMotion()` / `prefers-reduced-motion` — no exceptions.
> - Tailwind v4: all new tokens go in `app/globals.css` `@theme {}`; no JS config.
> - Server Components by default — mark only the motion / interactive leaf `'use client'`.
> - Husky pre‑commit will run `lint` + `test`; don't `--no-verify`. Add stories + tests for every new `shared/ui` primitive (see `new-ui-component` skill).
> - Lighthouse budgets in `lighthouserc.json` are the floor. Profile any new effect on mid‑range mobile.

---

## 0 · The thesis

The current build is editorial and tasteful but a little **quiet**. A first‑time visitor lands on `/welcome` → `/home` and sees a beautiful page, not an experience they want to send to a friend. We are going to add **five signature wow‑moments** plus a layer of materiality (depth, light, surface) that makes every screen feel custom‑couture instead of "Next.js template polish."

Guiding principles:

1. **Material, not flat.** Surfaces have weight: gilded edges, glass highlights, paper grain, soft inner shadows. We already have `gilded` / `glass-top` / `paper-grain` — use them everywhere, not just in one place.
2. **Light moves with the user.** Pointer position drives subtle highlights on cards and the wordmark. Scroll drives parallax + reveal. Nothing static unless intentional.
3. **One hero motion per screen.** Don't animate everything. Each route gets **one** cinematic moment; supporting elements stay calm.
4. **Premium = restraint + craft.** Hairline rules, dot leaders, italics, plate marks, paper grain. We're a couture atelier, not a SaaS product.
5. **Performance budget is the design budget.** If an effect costs > 8ms/frame on a mid‑tier Android, redesign it.

---

## 1 · Token additions (`app/globals.css`)

Add to the existing `@theme` block. Do **not** remove or rename anything that's already there.

```css
@theme {
  /* … existing tokens … */

  /* New shadow scale — depth without darkness */
  --shadow-soft: 0 24px 50px -22px rgba(0, 0, 0, 0.7);
  --shadow-card: 0 12px 28px -16px rgba(0, 0, 0, 0.55);
  --shadow-lifted: 0 36px 80px -28px rgba(0, 0, 0, 0.8), 0 8px 20px -10px rgba(0, 0, 0, 0.4);
  --shadow-gold-glow: 0 0 0 1px rgba(201, 169, 110, 0.15), 0 24px 60px -20px rgba(201, 169, 110, 0.25);

  /* Spotlight color (used by interactive cards) */
  --color-spotlight: rgba(244, 234, 216, 0.06);

  /* New blur tokens for stacked glass */
  --backdrop-blur-sm: blur(8px);
  --backdrop-blur-md: blur(16px) saturate(160%);
  --backdrop-blur-lg: blur(28px) saturate(180%);

  /* New keyframes (declarations below) */
  --animate-aurora: aurora 24s ease-in-out infinite;
  --animate-seal-rotate: sealRotate 60s linear infinite;
  --animate-ink-bloom: inkBloom 1.6s var(--ease-out) both;
  --animate-rule-draw: ruleDraw 1.2s var(--ease-out) both;
}

@keyframes aurora {
  0%, 100% { transform: translate3d(-10%, -8%, 0) rotate(0deg); opacity: 0.55; }
  50%      { transform: translate3d(8%, 6%, 0) rotate(8deg); opacity: 0.75; }
}
@keyframes sealRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes inkBloom {
  from { opacity: 0; filter: blur(14px); transform: scale(0.94); }
  to   { opacity: 1; filter: blur(0);    transform: scale(1); }
}
@keyframes ruleDraw { from { transform: scaleX(0); } to { transform: scaleX(1); } }

/* New utility — pointer‑reactive spotlight (used by all interactive cards). */
.spotlight {
  position: relative;
  isolation: isolate;
  overflow: hidden;
}
.spotlight::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    220px circle at var(--mx, 50%) var(--my, 50%),
    var(--color-spotlight),
    transparent 60%
  );
  opacity: 0;
  transition: opacity 260ms var(--ease-out);
  pointer-events: none;
  z-index: 0;
}
.spotlight:hover::after,
.spotlight:focus-within::after { opacity: 1; }

/* Stroke‑drawn underline for italic display text. Use on the hero word. */
.stroke-draw {
  background-image: linear-gradient(transparent calc(100% - 1px), currentColor 1px);
  background-size: 0% 100%;
  background-repeat: no-repeat;
  transition: background-size 700ms var(--ease-out);
}
.stroke-draw:hover,
.stroke-draw[data-revealed="true"] { background-size: 100% 100%; }

/* Edge‑lit gilded card — upgrade of .gilded with a soft glow on hover */
.gilded-lift {
  border: 0.5px solid transparent;
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  background-image:
    linear-gradient(var(--color-surface), var(--color-surface)),
    var(--gold-grad);
  transition: box-shadow 360ms var(--ease-out), transform 360ms var(--ease-out);
}
.gilded-lift:hover {
  box-shadow: var(--shadow-gold-glow);
  transform: translateY(-2px);
}
```

Reduced‑motion override (extend the existing block):

```css
@media (prefers-reduced-motion: reduce) {
  /* … existing rules … */
  .spotlight::after,
  .stroke-draw { transition: none !important; }
}
```

---

## 2 · New primitive: `shared/ui/spotlight-card`

Wraps any block in a `.spotlight` div and writes pointer position to `--mx` / `--my` via a single `pointermove` listener (NOT a state update — directly on `style.cssText`, so no re‑render).

**Files** (follow the `shared/ui/button` shape exactly):

```
shared/ui/spotlight-card/
  index.ts
  ui/spotlight-card.tsx
  ui/spotlight-card.stories.tsx
  ui/spotlight-card.test.tsx
```

```tsx
// ui/spotlight-card.tsx
"use client";
import { useRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

interface Props extends HTMLAttributes<HTMLDivElement> {
  as?: "div" | "article" | "section";
  children: ReactNode;
}

export function SpotlightCard({ as: Tag = "div", className, children, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <Tag
      ref={ref as never}
      onPointerMove={onMove}
      className={cn("spotlight rounded-lg", className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
```

**Tests:** render, pointer move sets `--mx`/`--my`, respects `as` prop. **Story:** wrap a `<NailTile>` to demo.

---

## 3 · Hero Aurora background (new primitive)

A slow, color‑morphing ambient gradient that sits behind the welcome + home heroes. Three blurred radial blobs in palette colors, animated with `--animate-aurora`. Pure CSS, no canvas, no JS.

```
shared/ui/aurora/
  index.ts
  ui/aurora.tsx
  ui/aurora.stories.tsx
  ui/aurora.test.tsx
```

```tsx
// ui/aurora.tsx
import { cn } from "@/shared/lib/cn";

interface Props { className?: string; intensity?: "subtle" | "vivid"; }

export function Aurora({ className, intensity = "subtle" }: Props) {
  const opacity = intensity === "vivid" ? 0.85 : 0.55;
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
      style={{ opacity }}
    >
      <div
        className="absolute -left-[20%] -top-[20%] h-[60vh] w-[60vw] rounded-full blur-[120px]"
        style={{
          background: "radial-gradient(circle at center, var(--color-accent), transparent 65%)",
          animation: "var(--animate-aurora)",
          animationDelay: "-2s",
        }}
      />
      <div
        className="absolute -right-[15%] top-[10%] h-[55vh] w-[55vw] rounded-full blur-[120px]"
        style={{
          background: "radial-gradient(circle at center, var(--color-violet), transparent 65%)",
          animation: "var(--animate-aurora)",
          animationDelay: "-8s",
        }}
      />
      <div
        className="absolute bottom-[-20%] left-[20%] h-[50vh] w-[50vw] rounded-full blur-[120px]"
        style={{
          background: "radial-gradient(circle at center, var(--color-plum), transparent 70%)",
          animation: "var(--animate-aurora)",
          animationDelay: "-14s",
        }}
      />
    </div>
  );
}
```

The blobs reference palette CSS variables, so the aurora **automatically re‑tints** when the user switches palette via `palette-switcher`.

---

## 4 · Welcome — cinematic entrance (`views/welcome/ui/welcome-page.tsx`)

Today: letter reveal + CTAs. Good bones, missing drama.

**Changes:**

1. **Mount `<Aurora intensity="vivid" />`** behind the wordmark.
2. **Replace** the static `NailFan` centerpiece with a `MonogramSeal` that auto‑rotates (`animation: var(--animate-seal-rotate)`), with a `NailFan` floating in front of it (slight `translateY` parallax on pointer move via a `motion.div` + `useMotionValue`).
3. **Letter reveal** stays but stagger goes from 70ms → **55ms** and the per‑letter `y` from `110% → 0`. After the last letter lands, animate the `B · E · A · U · T · Y` subline with `var(--animate-rule-draw)` on a hairline rule **underneath** it (use `<LetterpressRule>` with `data-revealed="true"`).
4. **Gold CTA** becomes magnetic: see §10.
5. **Ambient cue**: at `t = 2400ms`, a single 1px `.text-gold-shimmer` glyph (`⟡` or `✺`) bottom‑center starts the `softPulse` animation as a "scroll to continue" hint. (No text — the glyph alone.)
6. **Page‑exit transition**: when the user taps the gold CTA, the whole hero `clip‑path: inset(0 0 100% 0)` reveals upward (900ms), revealing the next route. Put this in a `<AnimatePresence>` shell in `app/[locale]/(marketing)/layout.tsx` keyed by `usePathname()`.

**Acceptance:** screen recording shows: blank → aurora bloom (1.2s) → letters mask up (1.4s) → subline rule draws (700ms) → seal begins slow rotation → CTAs lift in (260ms) → pulse glyph appears. Total runtime ≤ 3.6s.

---

## 5 · Home — kinetic editorial (`views/home/ui/sections/*`)

The biggest visual upgrade. Goal: scrolling feels like flipping through a thick magazine.

### 5.1 `home-hero.tsx`

- Wrap in `<Aurora intensity="subtle" />`.
- **Stroke‑draw the hero word** (`hero_title_word`): add class `stroke-draw`, set `data-revealed="true"` once it enters viewport (`useInView` from `motion/react`, `amount: 0.6`). The 1px gilded underline draws under the italic word over 700ms.
- **Floating fan**: in addition to the existing `fanY`, add a tiny mouse‑parallax (`useMotionValue` writing to `transform: translate3d(x, y, 0)`, max ±8px). Throttle inside the `pointermove` handler.
- **Pull‑quote**: increase font‑size of the hero h1 by **8%** at desktop only (`@media (min-width: 540px)`). It's currently restrained for mobile; tablet/desktop has room to breathe.

### 5.2 `signatures-list.tsx`

Each row → `<SpotlightCard>` with a **hover transform on the price**: `text-gold` → `text-gold-shimmer` on hover, plus a subtle `translateX(4px)` on the title.

Add a hairline that **draws on scroll**: as the section enters viewport, the section's left vertical rule animates `scaleY(0 → 1)` with `transform-origin: top`, 1.2s. Use `useScroll({ target, offset: ['start end', 'start center'] })`.

### 5.3 `gallery-strip.tsx`

Replace the standard horizontal scroll with a **drag‑inertia** scroller:

```tsx
<motion.div
  drag="x"
  dragConstraints={{ left: -maxScroll, right: 0 }}
  dragElastic={0.08}
  className="flex gap-4 cursor-grab active:cursor-grabbing"
>
```

Cards inside lift on hover (`whileHover={{ y: -4, scale: 1.02 }}`) with `transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] }`.

### 5.4 `membership-card.tsx`

Promote to `gilded-lift` class. Behind the card, add a slow radial gold glow that rotates very slowly (60s) — exactly the kind of "wait, is that moving?" detail that signals premium.

### 5.5 New section: **"Atelier in motion"**

A new section between `gallery-strip` and `testimonial-card`. Three vertical hairline‑bordered cards, each playing a short 4‑second looping video clip (provide placeholder `<video>` with `<source>` empty — wire to real clips later). Captions are mono eyebrows.

File: `views/home/ui/sections/atelier-motion.tsx`. Translations: `Home.atelier_motion_title` and three caption keys. Include in `home-page.tsx`.

---

## 6 · Service detail — shared‑element + hero theater (`views/service-detail/`)

1. **Shared hero**: on click of any `ServiceCard` / `ServiceMenuItem`, the card's thumbnail morphs into the detail hero using `motion.div layoutId={`service-hero-${service.id}`}`. Both the source nodes (in `entities/service/ui/service-card.tsx`, `service-menu-item.tsx`) and the detail page's hero must wrap their image in `motion.div` with that `layoutId`. This is the **single biggest perceived‑quality win** in the entire app.
2. **Parallax + scale**: the detail hero scales `1 → 1.18` over the first 320px of scroll, with `y: 0 → -40`.
3. **Drop cap intro**: already supported via `.dropcap`; ensure the first paragraph has it.
4. **"What it includes" numerals**: italic display, 56px, gilded gradient. Use `<Plate>` style mono numerals — but the *number itself* is the display italic.
5. **Sticky CTA bar** at bottom: glassy backdrop (`backdrop-filter: var(--backdrop-blur-lg)`), top hairline rule, gold button on the right, price in italic display gradient on the left.

---

## 7 · Booking — confidence + speed (`views/booking/`)

The booking flow is functional; we want it to **feel inevitable**.

1. **Step indicator**: in `widgets/booking-stepper`, animate the gold fill of each bar via `motion.div style={{ scaleX }}` rather than CSS `width` (smoother, GPU). `transform-origin: left`.
2. **Between steps**: `<AnimatePresence mode="wait">` in `booking-page.tsx` with `{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } }`, duration 280ms.
3. **Date strip**: selected pill must use Motion's `layoutId="date-pill"`. Disabled days (Sun/Mon) get a 12px diagonal hatch overlay (`background-image: repeating-linear-gradient(...)`).
4. **Time grid**: each tile is a `<SpotlightCard>` with a 1px gilded border on active. Reserved tiles get a subtle `.gilded` border too but with `opacity: 0.4` and a small `✕` glyph top‑right.
5. **Confirm step**: review card uses `<LetterpressRule>` between every row. Total uses a dashed gold border (`border-style: dashed`, `border-color: var(--color-accent)`).
6. **Continue CTA** is sticky bottom, glassy backdrop like §6.5.

---

## 8 · Confirmation — the screenshot‑worthy moment (`views/confirmation/`)

Already best‑in‑class with `golden-seal` + `confetti-burst`. Push it further:

1. **Pre‑roll**: before the seal scales in, a single 400ms `.ink-bloom` on a black overlay clears (`opacity: 1 → 0`, `filter: blur(14px) → blur(0)`). Feels like a curtain rising.
2. **Seal**: in addition to the existing scale+rotate, the seal's **inner ring counter‑rotates** slowly (`animation: var(--animate-seal-rotate)` reverse) forever, so the seal remains alive even after the entrance.
3. **Confetti**: bump count from 18 → **28**, add a tiny rotation `0 → 360deg` per dot, and 4 of them are 6px hairline‑outlined rings instead of solid dots (more couture, less party).
4. **Headline**: type‑on effect — each word fades in with `y: 8 → 0` staggered 60ms after the seal lands.
5. **Bottom CTA pair**: gold "Add to calendar" gets a 1px gilded animated border (`background-position` shift on hover).
6. **Background**: very subtle `<Aurora intensity="subtle" />` so the page isn't dead black.

Acceptance: in a screen recording, a designer who's never seen the app should react audibly. Test this in person.

---

## 9 · Gallery — physical masonry (`views/gallery/`)

1. **Card hover**: tile lifts 3px and a tiny `<Eyebrow>` slides in from the bottom with the palette name (data already on the gallery item). Use `whileHover` + `motion.div`.
2. **Lightbox**:
   - Open via shared `layoutId={`gallery-${item.id}`}`.
   - Backdrop: `var(--backdrop-blur-lg)` on a `rgba(16, 6, 18, 0.82)` base.
   - Arrows (prev/next) are minimal hairline‑bordered circles with a single chevron, **outside** the image area.
   - Esc closes; `←` / `→` navigate.
   - On close, the lightbox image animates back into its grid cell (free with `layoutId`).
3. **Stagger**: existing `floatIn` good — bump per‑item delay from 60ms → 80ms for a more deliberate cascade.

---

## 9a · Onboarding — paged story (`views/onboarding/`)

Three‑card pager. Today it works; make it cinematic.

1. **Slide transition**: 700ms `ease-in-out` `translateX(100%)`, with the *outgoing* card's hero image scaling `1 → 1.08` and the *incoming* one easing `1.08 → 1` — a "passing the lens" feel.
2. **Active dot**: animates between positions with `motion.div layoutId="onboard-dot"`, expanding to `22 × 4 px` gold pill from a `6 × 4 px` muted nub. Use `.text-gold` for the active fill.
3. **Hero image** inside each card has a small `translateY` parallax during drag (`useTransform(dragX, [-200, 0, 200], [12, 0, -12])`).
4. **Skip** sits top‑right, eyebrow style, dismisses to `/home`.
5. **Background**: `<Aurora intensity="subtle" />`, palette‑aware.
6. **Per‑slide ornament**: a different `<Ornament>` or `<MonogramSeal>` per slide, sized 22×22, top‑center above the headline. Tiny detail, big "considered" signal.

Acceptance: swipe gesture feels weighty (dragElastic 0.06, snap on release > 25% width). Reduced‑motion skips the parallax + scale, keeps a 200ms opacity cross‑fade.

---

## 9b · Services catalog — restaurant menu (`views/services-catalog/`)

The page is fine; the wow is in the **rhythm**.

1. **Page header**: `<Plate number="02" label="A LA CARTE · 06 RITUALS" />` already there. Add a `<LetterpressRule>` underneath that `var(--animate-rule-draw)` once on mount.
2. **Category chips**: active chip uses 1px gilded border + `.text-gold`; inactive chips are mono caps text only. Switching chips animates the active‑state with `layoutId="cat-active"`.
3. **Menu rows** become `<SpotlightCard>`. On hover:
   - thumbnail tile scales `1 → 1.03`,
   - title slides `translateX(4px)`,
   - the last dot in the dot‑leader morphs to a `<Ornament>` diamond,
   - the price swaps `text-gold` → `text-gold-shimmer`.
4. **Per‑row stagger** on first paint: `var(--animate-float-in)` with `animationDelay: ${i * 70}ms`. Honor reduced‑motion.
5. **Section dividers**: every 3 rows, drop in an `<Ornament>` centered between rows. Gives the eye a beat.

---

## 9c · Master — editorial portrait (`views/master/`)

1. **Hero portrait card**: 1:1.2 ratio, `.gilded-lift` class. Overlay holds `<Plate number="MMXIV" label="VIOLETTA" />` top‑left and a large italic display name bottom‑right.
2. **Pull‑quote**: oversized italic, with a **left vertical gold rule** that draws on enter (`scaleY(0 → 1)`, `transform‑origin: top`, 900ms).
3. **Stats row** (11 / years · 1 / chair · 600+ / sets): each stat number is `text-gold` italic display 56px, hovered → `text-gold-shimmer`. Wrap row in double `<LetterpressRule>` (top + bottom).
4. **Three voice cards** (testimonials): `<SpotlightCard>` each, italic display quote, tiny avatar disc with `.gilded` ring, role mark in mono eyebrow.
5. **CTA**: "Reserve with Violetta" — magnetic gold button (see §10).
6. **Background flourish**: a single decorative `<NailFan>` floats upper‑right with the same scroll parallax used on Home hero (`useScroll` + `useTransform`). Subtle.

---

## 9d · Membership — premium tier reveal (`views/membership/`)

1. **Monthly / Annual toggle** (`billing-toggle.tsx`): selected side gets a `layoutId="billing-thumb"` gilded pill that slides. The "2 mo free" badge fades + scales when Annual is active.
2. **Three tiers** (`membership-tier-card.tsx`):
   - Featured tier ("Violette") gets `.gilded-lift` + the slow rotating gold glow behind it (same effect as Home membership card §5.4).
   - Featured tier has a "MOST CHOSEN" tag mono eyebrow, top‑center, with a 1px gilded background.
   - Non‑featured tiers are `<SpotlightCard>`.
3. **Per‑tier stagger fade‑in** on mount, 120ms apart. Reduced‑motion: instant.
4. **Price** is large italic display, `text-gold-shimmer`. Cadence (`/mo`, `/yr`) is small mono eyebrow next to it.
5. **Perks list**: each row has a tiny gilded bullet (`<Ornament>` micro), text in `text-text-2`.
6. **CTA**: featured tier → magnetic gold button; others → ghost button.
7. **Background**: `<PaperGrain />` + a single very‑low‑opacity `<Aurora />` clipped to the featured tier's bounding box only (so the eye is pulled there).

---

## 9e · Profile — quiet, personal (`views/profile/`)

The signed‑in space. Don't be loud here; warmth wins.

1. **Avatar disc**: 88×88 radial gradient placeholder with a 1px gilded ring (`.gilded`). Hovering shows a tiny camera icon overlay (use `lucide-react`).
2. **Member tag**: mono eyebrow with `.text-gold`, e.g. "VIOLETTE · MEMBER SINCE MMXXIII".
3. **Display name**: italic display 40px.
4. **"Next visit" card**: `.gilded-lift`, with a floating decorative `<NailFan>` in the corner (low opacity), a "IN 3 DAYS" countdown chip (gold pill, mono caps), and a hairline rule between rows.
5. **Quick links**: vertical list with `<LetterpressRule>` between rows. Each row icon (`lucide-react`) + label + chevron. Whole row is hover‑lit via `<SpotlightCard>`.
6. **History rows**: service / date / gold price. Newest at top, faded as they age (`opacity 1 → 0.65 → 0.45` over the visible list).
7. **Sign out**: outline button, bottom of page.

Reduced‑motion: drop the floating fan animation; keep static.

---

## 9f · Sign‑in / Telegram (`app/[locale]/sign-in/page.tsx`)

Today: bare. Make it feel like a private door, not a form.

1. **Background**: `<Aurora intensity="vivid" />`, very slow.
2. **Center stack**: `<MonogramSeal />` (rotating slowly), italic display "Welcome back." headline, body micro‑copy in `text-text-2`, then the Telegram widget.
3. The Telegram widget wrapper is a `.gilded-lift` card with `var(--backdrop-blur-md)` glass.
4. **Footer line**: mono eyebrow "BY APPOINTMENT · A PRIVATE STUDIO" with a `<LetterpressRule>` split.

Make sure the page works without `TELEGRAM_BOT_TOKEN` set (the `auth.ts` gate degrades gracefully — keep it so the design is preview‑able in CI without secrets).

---

## 9g · Admin pages (`app/[locale]/admin/*`)

The admin is internal — restraint over wow. But it still wears the same coat.

1. **Header chrome**: same `<AppHeader>` but with a mono eyebrow `· ADMIN ·` slot inserted between wordmark and locale switcher. Use a single hairline divider.
2. **All cards** → `.gilded` (not `.gilded-lift` — fewer distractions in a tool).
3. **Tables / lists** (bookings, VIP requests): hairline rule between rows, plate‑mark numerals for IDs, mono eyebrows for column headers, italic display for the row's "title" cell (booking name, customer name).
4. **Actions** (approve / reject buttons in `features/bookings-admin/ui/booking-actions.tsx`): solid for primary, ghost for secondary, **never** gold (gold is reserved for customer‑facing moments).
5. **Empty states**: a single `<Ornament />` + mono eyebrow + one line of italic display body. No illustrations.
6. **Integrations / Google Calendar** (`/admin/integrations/google`): the "Connect Google Calendar" button is solid + an inline lucide `link-2` icon. Connected state shows the email inside a `.gilded` chip with a soft pulsing green dot (same dot as §15).
7. **Toasts / inline errors**: use the existing `app/[locale]/error.tsx` pattern; style with a left rose accent rule (`<LetterpressRule />` rotated).

---

## 9h · Error & not‑found (`app/[locale]/error.tsx`, `not-found.tsx`)

These are tiny but seen. Both get the same shape:

1. Center stack, vertically aligned.
2. Tiny mono eyebrow at top — for 404: `· NOT IN THE MENU ·` ; for error: `· A FAINT TREMOR ·`.
3. Italic display headline ("This page is between sittings." for 404; "Something slipped." for error).
4. One short body line.
5. **One** outline button: "Return home" → `/home`.
6. Background: `<Aurora intensity="subtle" />`.

---

## 9i · Tab bar (`widgets/tab-bar`)

The persistent chrome. Three small upgrades:

1. **Glass top edge** (`.glass-top`) + `backdrop-filter: var(--backdrop-blur-lg)` so the page underneath blurs into it.
2. **Active pill** already uses `layoutId="tab-thumb"`; surround the active icon with a 1px gilded ring that fades in when the pill arrives.
3. **Inactive icons** sit at `opacity: 0.5`, slide to `1` as the pill approaches (use a `useTransform` on the pill's `x` motion value — distance‑weighted).
4. **Notification dot** (future): tiny `.text-gold` ping on a tab when there's news.

---

## 10 · Magnetic gold CTA (`shared/ui/button`)

The gold variant becomes magnetic on pointer hover (desktop only, `(hover: hover)` media query). Within ~120px of the button, the button's center translates toward the pointer by up to 8px with `useSpring` damping.

Extend `shared/ui/button/ui/button.tsx`:

```tsx
"use client";
// add an opt‑in prop:
interface ButtonProps { magnetic?: boolean; /* … */ }

// implementation goes in a sibling client component MagneticButton.tsx
// so the buttonClassName helper stays SSR‑safe.
```

Default `magnetic = false` so existing call sites are unchanged. Opt in on the welcome CTA, the home hero CTAs, the membership card CTA, the sticky service‑detail CTA, and the confirm step CTA.

Honor `useReducedMotion()` → no magnetism.

---

## 11 · Palette switcher — make the swap a moment

In `features/palette-switcher/ui/palette-switcher.tsx`, when the user picks a palette:

1. Spawn a single full‑viewport `<div>` with the new palette's `--color-accent` radial gradient that scales `0 → 2.5` from the pointer position (450ms, `ease-out`), then fades out.
2. Apply the `data-palette` attribute change at the **midpoint** of the animation. The aurora + all tokens swap mid‑sweep — feels like a wash of color rather than a click.

This is ~30 lines and is the kind of thing users record and share.

---

## 12 · Type — let it breathe

Several screens lean too tight on mobile. In `app/globals.css`, register an additional clamp for h2/h3 and bump default line‑height where italic display is used (italics need more leading than romans):

```css
@theme {
  --text-h1: clamp(56px, 16vw, 84px);   /* was up to 76px */
  --text-h2: clamp(34px, 8vw, 48px);
  --text-h3: clamp(24px, 5.5vw, 32px);
}
.font-display { font-feature-settings: "liga", "dlig", "ss01"; }   /* enable Cormorant ligatures + alts */
```

Then sweep `views/**/*.tsx` and replace ad‑hoc `text-[clamp(...)]` with `text-h1` / `text-h2` / `text-h3` utilities (Tailwind v4 auto‑generates these from the tokens).

---

## 13 · Materiality pass (sweep)

Audit every existing card / surface and apply **one** of:

- `gilded` — quiet hairline gold border (already used)
- `gilded-lift` — the new lift‑on‑hover variant
- `glass-top` — for sticky bars and headers
- `.spotlight` via `<SpotlightCard>` — for any tappable card

No raw `bg-surface rounded-lg` cards anywhere. Each surface declares **why** it's a surface.

Add `<PaperGrain />` to: `/welcome`, `/home`, `/master`, `/membership`, `/booking/confirmation`. Already on Home; spread it.

---

## 14 · Micro‑interactions checklist (add wherever sensible)

- [ ] All gold prices in lists: `text-gold` default, `text-gold-shimmer` on row hover.
- [ ] All chip filters: active chip has a 1px gilded border + the row underline draws in.
- [ ] Tab bar (`widgets/tab-bar`): the active pill already uses `layoutId="tab-thumb"` — make sure the *inactive icons* fade `opacity: 0.5 → 1` as the pill approaches.
- [ ] Service rows: on hover, the dot leader's last dot becomes a tiny `<Ornament>` diamond (CSS swap).
- [ ] Form inputs (later, when bookings are real): floating label that morphs from placeholder to italic eyebrow on focus.

---

## 15 · "Atelier hours" live presence (new feature)

Tiny, but **wow**: a single line below the home header that reads "Open · Wed 11:00 → 19:00" or "Closed · Opens Wednesday" computed live from the Google Calendar working hours (`shared/lib/google-calendar/working-hours.ts` already exists).

Make the "Open" / "Closed" dot pulse softly (`softPulse`) — green dot if open, gold if closed. This signals the app is *connected* to a real studio.

Files: `widgets/atelier-hours/{ui,index.ts}`. Server‑renders from a thin API route or directly from working‑hours fixture. Cache 60s.

---

## 16 · A11y, perf, QA gates

Before opening the PR:

- **Lighthouse mobile:** Performance ≥ 92, A11y ≥ 100, Best Practices ≥ 95, SEO 100. Update `lighthouserc.json` if any new route lands.
- **Reduced motion** test: in DevTools → Rendering → emulate `prefers-reduced-motion: reduce` and walk every screen. Nothing should jiggle, drift, or pulse.
- **Keyboard:** tab through home / services / booking / gallery. Every interactive surface focusable, `focus-visible` ring visible (it's gold accent already).
- **Contrast:** any new `text-2`/`text-3` over new surface combinations must hit 4.5:1 minimum. The new aurora can *not* reduce text contrast — test on hero with the brightest aurora frame.
- **Touch targets:** ≥ 44px on every tappable.
- **Storybook + Vitest:** every new `shared/ui/*` and `widgets/*` has a story + a test. CI runs the storybook addon‑vitest project — broken stories fail the build.
- **E2E:** add Playwright specs for: welcome entrance completes, magnetic CTA respects reduced‑motion, palette switch sweep visible.

---

## 17 · Ordering — ship in this sequence

Each numbered item is a separate PR onto `develop`, in this order:

1. Token + utility additions (§1) — pure CSS, no UI change. Easy review.
2. `<SpotlightCard>` primitive (§2). Story + test only; no consumer yet.
3. `<Aurora>` primitive (§3). Story; mount on `/welcome` for a visible payoff.
4. Welcome cinematic upgrade (§4).
5. Magnetic Button (§10) — required by §4 and §5.
6. Home kinetic editorial (§5) — biggest single PR; split into 5.1 + 5.2 + 5.3 + 5.4 + 5.5 if it gets large.
7. Service detail shared element + hero theater (§6).
8. Booking polish (§7).
9. Confirmation upgrade (§8).
10. Gallery upgrade (§9).
11. Palette switcher sweep (§11).
12. Type pass (§12), Materiality sweep (§13), Micro‑interactions (§14).
13. Atelier hours (§15).
14. A11y / perf / QA gate (§16) — final pass before merging to `main`.

Use the `superpowers:brainstorming` skill at the start of any item that's not 1‑file‑small; use `superpowers:test-driven-development` for the new primitives.

---

## 18 · Out of scope for this brief (track separately)

- New imagery — every `<NailTile>` stays placeholder until photography lands.
- Real‑auth gating on `/admin` (Telegram path already exists; do not change here).
- New locales beyond `en` / `ru` / `be`.
- Booking back‑end beyond the existing `/api/booking/slots` work.

---

## 19 · Done when

A new visitor on a mid‑range Android walks `/welcome → /home → /services → /services/[id] → /booking/* → /confirmation` and at least **three** screens make them stop scrolling. The lighthouse perf score is still ≥ 92. Husky pre‑commit + CI all green. PR series merged to `develop` and rebased onto `main` for release.

— end of brief —
