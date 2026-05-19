# Violetta Beauty — Implementation Handoff

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Framer Motion

Build the design from the HTML prototype as a production Next.js app. This document is the contract between design and engineering — tokens, component breakdown, routing, motion specs, and data shape.

Prototype reference: `Violetta Beauty.html` (clickable, all flows working, Tweaks panel for variations).

---

## 1. Setup

```bash
npx create-next-app@latest violetta --typescript --tailwind --app --eslint
cd violetta
npm i framer-motion zustand clsx tailwind-merge lucide-react
npm i -D @types/node
```

Folder convention (App Router):

```
app/
  layout.tsx             # root layout, fonts, theme provider
  page.tsx               # / → redirect to /welcome
  (marketing)/
    welcome/page.tsx
    onboarding/page.tsx
  (app)/
    layout.tsx           # tab bar
    home/page.tsx
    services/page.tsx
    services/[id]/page.tsx
    gallery/page.tsx
    profile/page.tsx
    membership/page.tsx
    master/page.tsx
  booking/
    layout.tsx
    [step]/page.tsx      # service | date | time | confirm
    confirmation/page.tsx
components/
  primitives/            # Btn, Tag, Eyebrow, Ornament, Plate, StatusBar
  imagery/               # NailTile, NailFan
  layout/                # AppHeader, TabBar, ScreenStage
  screens/               # one file per screen (logic + composition)
  tweaks/                # TweaksPanel + controls (dev-only, optional)
lib/
  data.ts                # Violetta data (services, gallery, etc.)
  motion.ts              # variants + easings
  theme.ts               # palette tokens
  utils.ts               # cn(), formatters
styles/
  globals.css            # @tailwind, custom keyframes
public/
  fonts/                 # self-hosted woff2 (optional)
  photography/           # real product shots — replace placeholders
```

---

## 2. Design tokens

### 2.1 Palette

Default is **Aubergine**. Other palettes exposed via Tweaks (dev/preview only — in production pick one and remove the rest).

| Token              | Aubergine        | Rose             | Lilac            | Mono             |
| ------------------ | ---------------- | ---------------- | ---------------- | ---------------- |
| `--bg`             | `#100612`        | `#1e0d18`        | `#1a1226`        | `#0d0a0f`        |
| `--bg-2`           | `#18091c`        | `#260f1c`        | `#221530`        | `#13101a`        |
| `--surface`        | `#1f0e25`        | `#2a1226`        | `#2a1838`        | `#1a1620`        |
| `--surface-2`      | `#2a1432`        | `#371732`        | `#371e48`        | `#221d2a`        |
| `--text`           | `#f4ead8`        | `#f4ead8`        | `#f4ead8`        | `#f4ead8`        |
| `--text-2` (a 68%) | `rgba(244,234,216,.68)` | — | — | — |
| `--text-3` (a 42%) | `rgba(244,234,216,.42)` | — | — | — |
| `--accent` (gold)  | `#c9a96e`        | `#e8b08c`        | `#e0c4f3`        | `#d4c9b8`        |
| `--accent-2`       | `#e8cf99`        | `#f3cdae`        | `#f0dffb`        | `#e8e0d0`        |
| `--plum`           | `#7d3a6f`        | `#a8456d`        | `#8a6cc4`        | `#3a2a3a`        |
| `--violet`         | `#9d7bc7`        | —                | —                | —                |
| `--rose`           | `#d9a3b6`        | —                | —                | —                |

**Gold gradient** (used on buttons, large prices, the wordmark):

```css
--gold-grad: linear-gradient(
  135deg,
  #b8956a 0%, #e8cf99 25%, #fff5d6 45%, #d4b27a 65%, #a07b48 100%
);
```

### 2.2 Typography

- **Display**: Cormorant Garamond, weights 300/400/500, italic. Used for h1–h3 and pull quotes.
- **Body / UI**: DM Sans, weights 300/400/500/600.
- **Mono**: JetBrains Mono, weights 400/500. Used for eyebrows, plate numbers, page chrome.

Pairings (Tweaks): Editorial (Cormorant + DM Sans, default), Vogue (Italiana + Manrope), Couture (Playfair Display + Plus Jakarta Sans).

Load via `next/font` in `app/layout.tsx`:

```tsx
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from 'next/font/google';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'], weight: ['300', '400', '500'], style: ['normal', 'italic'],
  variable: '--font-display',
});
const dm = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });
```

Apply on `<html className={`${cormorant.variable} ${dm.variable} ${mono.variable}`}>`.

### 2.3 Type scale

| Use                        | Size (mobile)  | Weight | Style    | Notes |
|----------------------------|----------------|--------|----------|-------|
| Hero (Welcome wordmark)    | 72–110px clamp | 300    | italic   | letter-spacing -0.025em |
| Page H1 (Home, Services)   | 56–76px clamp  | 300    | italic   | line-height 0.94 |
| Section H2                 | 34–40px        | 400    | italic   | |
| Card title                 | 22–28px        | 400    | italic   | |
| Body                       | 14.5–16px      | 400    | normal   | line-height 1.55–1.65 |
| Plate mark / eyebrow       | 9–10px         | 500    | mono     | letter-spacing 0.32em, uppercase |
| Tag / chip                 | 11px           | 500    | mono     | letter-spacing 0.16em, uppercase |
| Price (large)              | 24–30px        | 400    | italic   | gold gradient text |

### 2.4 Layout

- **Radius**: `--radius-sm: 12px`, `--radius: 18px`, `--radius-lg: 28px`
- **Density**: compact (16/10/14), comfy (22/14/18, default), roomy (30/18/22) → `--pad / --gap / --radius`
- **Hairlines**: 0.5px borders with `rgba(244,234,216,0.08)` (`--line`) and 0.18 (`--line-strong`)
- **Shadows**: soft (`0 24px 50px -22px rgba(0,0,0,.7)`), card (`0 12px 28px -16px rgba(0,0,0,.55)`)

### 2.5 Motion

| Token           | Value                              |
|-----------------|------------------------------------|
| `--ease-out`    | `cubic-bezier(0.22, 1, 0.36, 1)`   |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)`   |
| `--dur`         | 520ms (moderate, default)          |
| `--dur-fast`    | 260ms                              |

Intensity modes (Tweaks): off / subtle (360/200ms) / moderate (520/260ms) / showy (720/320ms).

---

## 3. Tailwind config

`tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-2': 'var(--bg-2)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        text: 'var(--text)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        accent: 'var(--accent)',
        'accent-2': 'var(--accent-2)',
        plum: 'var(--plum)',
        violet: 'var(--violet)',
        rose: 'var(--rose)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace'],
      },
      borderRadius: {
        sm: '12px',
        DEFAULT: '18px',
        lg: '28px',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      transitionDuration: {
        DEFAULT: 'var(--dur)',
        fast: 'var(--dur-fast)',
      },
      backgroundImage: {
        gold: 'var(--gold-grad)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        floatIn: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        maskUp: {
          from: { clipPath: 'inset(0 0 100% 0)' },
          to: { clipPath: 'inset(0 0 0 0)' },
        },
        letterIn: {
          from: { opacity: '0', transform: 'translateY(40%) scaleY(0.85)' },
          to: { opacity: '1', transform: 'translateY(0) scaleY(1)' },
        },
      },
      animation: {
        shimmer: 'shimmer 6s linear infinite',
        'float-in': 'floatIn var(--dur) cubic-bezier(0.22,1,0.36,1) both',
        'mask-up': 'maskUp 900ms cubic-bezier(0.22,1,0.36,1) both',
        'letter-in': 'letterIn 1.1s cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

`styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #100612;
  --bg-2: #18091c;
  --surface: #1f0e25;
  --surface-2: #2a1432;
  --text: #f4ead8;
  --text-2: rgba(244, 234, 216, 0.68);
  --text-3: rgba(244, 234, 216, 0.42);
  --accent: #c9a96e;
  --accent-2: #e8cf99;
  --plum: #7d3a6f;
  --violet: #9d7bc7;
  --rose: #d9a3b6;
  --line: rgba(243, 234, 216, 0.08);
  --line-strong: rgba(243, 234, 216, 0.18);
  --gold-grad: linear-gradient(135deg, #b8956a 0%, #e8cf99 25%, #fff5d6 45%, #d4b27a 65%, #a07b48 100%);
  --dur: 520ms;
  --dur-fast: 260ms;
}

html, body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

/* Hide scrollbars on horizontal scroll regions */
.scroll-x { scrollbar-width: none; -ms-overflow-style: none; }
.scroll-x::-webkit-scrollbar { display: none; }

/* Gold gradient text helper */
.text-gold {
  background: var(--gold-grad);
  background-size: 200% 100%;
  background-position: 25% 50%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

/* Shimmer gold (animated, used on hero) */
.text-gold-shimmer {
  background: linear-gradient(100deg, #a07b48 0%, var(--accent) 25%, #fff5d6 50%, var(--accent-2) 75%, #a07b48 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 6s linear infinite;
}
```

---

## 4. Routing

App Router structure mirrors the screens. Use route groups for chrome (tab bar vs not).

| Route                       | Has tab bar | Screen |
|-----------------------------|-------------|--------|
| `/welcome`                  | no          | Welcome / splash |
| `/onboarding`               | no          | 3-card pager |
| `/home`                     | yes         | Discover |
| `/services`                 | yes         | Catalog |
| `/services/[id]`            | no          | Service detail (full-bleed hero) |
| `/booking/[step]`           | no          | step ∈ `service|date|time|confirm` |
| `/booking/confirmation`     | no          | Animated success |
| `/gallery`                  | yes         | Masonry portfolio + lightbox |
| `/master`                   | no          | Artist profile |
| `/membership`               | no          | Tiers |
| `/profile`                  | yes         | Account / history |

**Tab bar** lives in `app/(app)/layout.tsx`. Active tab is read from `usePathname()`. Animated thumb pill uses Framer Motion's `layoutId="tab-thumb"`.

**Booking state** is a Zustand store (`useBookingStore`) — selected service, date, time. Persisted to `sessionStorage` so back/forward works.

**Screen transitions** — wrap children in `<AnimatePresence mode="wait">` at the layout level. Direction (forward/back) inferred from a small route-history hook.

---

## 5. Components

### 5.1 Primitives

| Component   | Props                                                  | Notes |
|-------------|--------------------------------------------------------|-------|
| `Btn`       | `variant: 'solid'|'gold'|'outline'|'ghost'`, `block?`, `icon?`, children, onClick | Pill button. Gold variant uses `bg-gold` with hover position shift. |
| `Tag`       | `gold?`, `active?`, children                           | Pill chip, mono caps |
| `Eyebrow`   | `gold?`, children                                      | Mono caps label, 9–10px, ls 0.32em |
| `Plate`     | `number`, `label?`                                     | "PLATE 02 · THE MENU" pattern |
| `Ornament`  | —                                                      | Hairline rule with center diamond |
| `StatusBar` | —                                                      | 9:41 / VIOLETTA · OPEN / 5G |
| `Wordmark`  | `size?`, `accent?`                                     | "Violetta BEAUTY" lockup |

### 5.2 Imagery — `NailTile`

The hero motif. Layered CSS gradients posing as luxury product photography. Six variants (`0–5`): domed jewel, satin drape, atelier still life, marble swirl, chrome bevel, ink wash. Each takes `palette: [hero, deep]` and renders a stack:

1. hero gradient composition
2. soft specular highlight (radial top-left)
3. edge vignette (radial 55–100%)
4. film grain SVG (opacity 0.08, overlay blend)

**This is a placeholder.** When real photography arrives, replace `NailTile` internals with `next/image` and keep the same prop signature. All call sites stay the same.

### 5.3 `NailFan`

Vertical fan of 4–5 `NailTile`s in a flex row, staggered heights. Used on the Welcome splash and as a decorative accent on the Profile "Next visit" card.

### 5.4 Tweaks panel

Optional dev-only. Skip in production; if you want a theme switcher for marketing, lift just the palette/density/dark toggles into a small floating control in `(app)/layout.tsx`. The prototype's `useTweaks` is internal-only.

---

## 6. Motion (Framer Motion specs)

### 6.1 Welcome splash

Three phases triggered by `setTimeout`:

```ts
// t = 0      → blank
// t = 350ms  → header chrome + ambient plumes fade in
// t = 1900ms → CTAs appear
```

**Letter-by-letter wordmark reveal:**

```tsx
const letters = 'Violetta'.split('');
return letters.map((c, i) => (
  <motion.span
    key={i}
    initial={{ y: '110%', opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.08 + i * 0.07 }}
  >{c}</motion.span>
));
```

Wrap container in `overflow: hidden` so the letters mask up cleanly.

### 6.2 Onboarding pager

3 slides, full-card translateX. Use a touch-drag gesture (Framer `drag="x"` with `dragConstraints`) and snap on release. Each slide's hero image has a small inner `translateY` parallax during the slide transition.

### 6.3 Home parallax

Hero text moves at 0.4× scroll, floating fan at 0.25× (opposite direction), hero opacity fades to 0 over 320px. Use `useScroll()` + `useTransform()` from Framer Motion. Performance: throttle to `requestAnimationFrame` (Framer does this by default).

### 6.4 Service detail

- Hero image: `scale 1 → 1.2` and `translateY` parallax on inbound scroll.
- Shared-element entry: on click of a service card, animate `layoutId={`service-hero-${id}`}` from the catalog card image to the full-bleed detail hero. Both nodes must wrap their image in `motion.div` with the matching `layoutId`.
- Drop cap on first paragraph (Cormorant italic, 56px, float left).

### 6.5 Booking

- Step indicator: 4 hairlines, fill with gold left-to-right as you advance (Framer `scaleX` on each).
- Between steps: `AnimatePresence mode="wait"` with `opacity + y: 12 → 0` (fast, 260ms).
- Date picker: 2-week strip, selected pill expands smoothly with a `layoutId="date-pill"`.
- Time grid: tap target ripple — gold border-color transition.

### 6.6 Confirmation

Cinematic celebration:

```
t=0   → blank
t=200 → golden seal scales in from 0.5 + rotate -40°
t=900 → checkmark fades in inside the seal
t=900 → 18 confetti dots fly upward, staggered (gold/violet/rose)
t=1500 → headline + appointment card slide up
```

Confetti = absolute-positioned 3–5px circles, random `top/left`, animated with `translateY: -50 to -150px` over 1.8s with stagger.

### 6.7 Gallery

- Masonry: 2-column CSS grid, items have `height` from data (220–300px).
- Item entry: `float-in` keyframe (opacity 0→1 + y 16→0), staggered 60ms per index.
- Hover: `translateY: -2px`, 260ms.
- Lightbox: fixed inset, `backdrop-filter: blur(20px)`, image grows from clicked card via shared `layoutId`.

---

## 7. Data shape

Move `VIOLETTA_DATA` from `lib/data.ts`:

```ts
export type Service = {
  id: string;
  name: string;
  category: 'Care' | 'Gel' | 'Design' | 'Form';
  duration: string;    // "75 min"
  price: number;       // 95
  blurb: string;
  includes: string[];
  hero: string;        // future image key
};

export type GalleryItem = {
  tag: 'Editorial' | 'Gel' | 'Chrome' | 'Lace' | 'Bridal';
  palette: [string, string];   // hero, deep
  h: number;                   // grid item height in masonry
};

export type MembershipTier = {
  tier: 'Petale' | 'Violette' | 'Atelier';
  price: number;
  cadence: string;
  perks: string[];
  featured: boolean;
};
```

Source the actual content from the prototype's `src/components.jsx` (`VIOLETTA_DATA`). Treat all copy as final until business says otherwise.

---

## 8. Screen-by-screen acceptance

For each screen, the production build is "done" when:

### Welcome
- [x] Letter-by-letter wordmark reveal, 70ms stagger, mask-up clip
- [x] Shimmering gold "B·E·A·U·T·Y" subline (6s loop)
- [x] Ambient plumes fade in over 1.4s
- [x] Nail fan motif visible at center
- [x] Two CTAs (gold "Enter the atelier" + ghost "I already have an account")

### Onboarding
- [x] 3 cards, swipe + tap-to-advance
- [x] Active dot expands to 22×4 gold, inactive dots 6×4 muted
- [x] Hero image of active card has subtle parallax during transition
- [x] "Skip" returns to /home

### Home
- [x] Editorial header strip (VOL · No · Season · Location), hairline below
- [x] Hero h1 with shimmering gold word and parallax fade
- [x] Floating gold-fan in upper-right with reverse parallax
- [x] Featured capsule card with gold left-edge accent
- [x] "Signatures" menu with dot-leader pricing
- [x] Master strip linking to /master
- [x] Horizontal gallery scroll, 5 cards visible w/ snap
- [x] Testimonial card with oversized italic quote mark
- [x] Membership CTA with radial gold glow

### Services
- [x] Magazine-style page header (`PLATE · 02`)
- [x] Category chips, active = solid text
- [x] Menu cards with numbered plate marks, dot leaders, drop-cap-free body

### Service detail
- [x] Full-bleed parallax hero, 440px tall
- [x] Plate number + category overlay
- [x] Drop-cap intro paragraph
- [x] Numbered "What it includes" list with italic numerals
- [x] 3-up mini-gallery
- [x] Sticky CTA: price + "Reserve a chair"

### Booking
- [x] 4 step indicator bars, gold fill animates left-to-right
- [x] Step 1: service radio list
- [x] Step 2: 14-day strip, Sun/Mon disabled, selected pill animates
- [x] Step 3: 7 time slots, 2 marked "Reserved"
- [x] Step 4: review card with hairline rows, dashed total box

### Confirmation
- [x] Golden seal: 0.5→1 scale, -40°→0° rotation
- [x] Checkmark fades in inside seal at +700ms
- [x] 18 confetti dots fly up, staggered
- [x] Appointment card slides up last

### Gallery
- [x] Filter chips: All / Editorial / Gel / Chrome / Lace / Bridal
- [x] 2-column masonry, staggered float-in
- [x] Tap → lightbox with shared element transition

### Master
- [x] Hero portrait card with editorial framing ("VIOLETTA · MMXIV")
- [x] Pull-quote with left gold rule
- [x] 11 years / 1 chair / 600+ sets stats row
- [x] 3 testimonial cards

### Membership
- [x] Monthly / Annual toggle (annual = ×10, "2 mo free" label)
- [x] 3 tiers, middle (Violette) featured with gold glow + "Most chosen" tag
- [x] Stagger fade-in per tier

### Profile
- [x] Avatar disc, member tag, name in italic display
- [x] "Next visit" card with floating nail fan + countdown chip
- [x] Quick links list (border-separated rows)
- [x] History rows with gold prices

---

## 9. Accessibility & polish

- All interactive elements ≥ 44px hit target.
- `focus-visible:ring-1 ring-accent ring-offset-2 ring-offset-bg` on buttons.
- Respect `prefers-reduced-motion` — set `--dur: 0ms` and disable shimmer/letter-in.
- Test on iOS Safari first (the design assumes WebKit's font rendering + backdrop-filter).
- Color contrast: text-2 over surface = 5.4:1 (AA). text-3 used for chrome only, not body copy.
- Status bar (`9:41 · VIOLETTA · OPEN · 5G`) is a design conceit for the prototype. **Delete it in production** — real browsers have their own chrome.

---

## 10. Replace before launch

- [ ] **Imagery**: every `NailTile` → real photography. Sizes are already correct.
- [ ] **Copy**: studio address, instagram handle, master bio — confirm with Violetta.
- [ ] **Pricing**: numbers are placeholders.
- [ ] **Membership prices** & perks language.
- [ ] **Testimonials**: get permission and real names.
- [ ] **Booking back-end**: this prototype has no API. Connect to whatever booking system you're using (Setmore, Calendly, custom) at `app/booking/[step]/page.tsx` server actions.
- [ ] **Payment**: prototype says "charge at the studio" — confirm payment model with business.
- [ ] **Auth**: profile screen assumes a logged-in user. Decide on auth (NextAuth + email OTP is fine for a small studio).
- [ ] **Analytics**: drop in Vercel Analytics or Plausible.

---

## 11. Performance budget

| Metric | Target |
|--------|--------|
| LCP    | < 2.0s |
| CLS    | < 0.05 |
| INP    | < 200ms |
| JS (initial)  | < 120kb gzip |

- Defer Framer Motion bundle to the client (`'use client'` only on screens that need it). Layouts and primitives stay server components.
- Self-host Cormorant + DM Sans woff2 if performance is critical (Google Fonts adds a hop).
- Replace `NailTile` CSS gradients with optimized AVIF photography ASAP — they look fine but a real photo at the same byte budget will look better.

---

## 12. Open questions for the client

1. Does the studio want online payment, deposit-only, or pay-at-studio?
2. Cancellation window — 24h, 48h, no-show fee?
3. Master profile — just Violetta, or will there be guest artists?
4. Membership — is the "2 mo free" annual model accurate to her economics?
5. Languages — English only, or English + Ukrainian/Russian?
6. Photography — who shoots it and when does it land?

---

*End of handoff. Open `Violetta Beauty.html` alongside this doc — every interaction in the prototype is the spec.*
