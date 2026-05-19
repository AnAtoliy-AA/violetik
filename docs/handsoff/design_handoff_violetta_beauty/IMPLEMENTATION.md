# Violetta Beauty — Implementation Handoff

**Stack:** Next.js 16 (App Router, async params) · React 19 · TypeScript · Tailwind CSS v4 (CSS-first) · Feature-Sliced Design (FSD) · `next-intl` for `[locale]/` routing · Framer Motion

Build the design from the HTML prototype as a production Next.js app. This document is the contract between design and engineering — tokens, component breakdown, routing, motion specs, and data shape.

Prototype reference: `Violetta Beauty.html` (clickable, all flows working, Tweaks panel for variations).

> **Stack notes for engineers familiar with v14/v3:**
> - **Next 16**: `params` and `searchParams` are now **Promises** in pages/layouts/route handlers — `await params` before destructuring. `fetch()` is **not cached by default**; opt in with `'use cache'` or `cacheLife`. React 19 is the baseline (use the new `use()` hook for promises). Turbopack is the default bundler.
> - **Tailwind v4**: no `tailwind.config.ts`. All tokens live in CSS via `@theme { ... }`. Single `@import "tailwindcss";` replaces the three `@tailwind` directives. Configured through CSS variables only.
> - **FSD**: features live in `src/{shared,entities,features,widgets,pages}/<slice>/{ui,model,lib,api}/`. Each slice exports its public API through `index.ts` and **must not** import "upward" into higher layers.
> - **`[locale]/`**: every route is under `src/app/[locale]/...`. `params.locale` is awaited.

---

## 1. Setup

```bash
npx create-next-app@latest violetta --typescript --tailwind --app --turbo --eslint --src-dir
cd violetta
npm i motion zustand clsx tailwind-merge lucide-react next-intl
```

> Note: prefer the `motion` package over `framer-motion` for Next 16/React 19 (same API, lighter, actively maintained as Motion for React).

### 1.1 FSD folder structure (under `src/`)

```
src/
  app/                            # Next.js routes only — composition layer
    [locale]/
      layout.tsx                  # NextIntlClientProvider, theme provider, fonts
      page.tsx                    # redirects to /welcome
      (marketing)/
        welcome/page.tsx
        onboarding/page.tsx
      (app)/
        layout.tsx                # tab-bar widget
        home/page.tsx
        services/page.tsx
        services/[id]/page.tsx
        gallery/page.tsx
        profile/page.tsx
        membership/page.tsx
        master/page.tsx
      booking/
        layout.tsx
        [step]/page.tsx           # service | date | time | confirm
        confirmation/page.tsx
    globals.css                   # @import "tailwindcss"; @theme tokens
  pages/                          # FSD layer — page-level compositions
    welcome/{ui,index.ts}
    onboarding/{ui,index.ts}
    home/{ui,index.ts}
    services-catalog/{ui,index.ts}
    service-detail/{ui,index.ts}
    gallery/{ui,index.ts}
    master/{ui,index.ts}
    membership/{ui,index.ts}
    profile/{ui,index.ts}
    booking/{ui,model,index.ts}
    confirmation/{ui,index.ts}
  widgets/                        # FSD layer — composite UI blocks
    tab-bar/{ui,index.ts}
    app-header/{ui,index.ts}
    hero/{ui,index.ts}            # parallax hero used by Home & ServiceDetail
    booking-stepper/{ui,index.ts}
  features/                       # FSD layer — user interactions
    book-service/{ui,model,api,index.ts}
    filter-gallery/{ui,model,index.ts}
    switch-locale/{ui,model,index.ts}
    switch-theme/{ui,model,index.ts}
  entities/                       # FSD layer — business entities
    service/{ui,model,api,index.ts}      # ServiceCard, service types
    master/{ui,model,index.ts}
    member/{ui,model,index.ts}
    gallery-item/{ui,model,index.ts}
  shared/                         # FSD layer — UI kit & infra
    ui/{btn,tag,eyebrow,plate,ornament,wordmark,status-bar,nail-tile,nail-fan,index.ts}
    lib/{cn,format,use-route-direction,use-scroll-parallax}/
    config/{palette,motion,i18n}/
    api/                          # later — booking API wrappers
  i18n/
    routing.ts                    # next-intl routing config
    request.ts                    # getRequestConfig (server)
    navigation.ts                 # typed Link, redirect, useRouter
    messages/
      en.json
      uk.json                     # add more as needed
public/
  fonts/                          # self-hosted woff2 (optional)
  photography/                    # real product shots — replace placeholders
middleware.ts                     # next-intl middleware for locale detection
```

### 1.2 FSD import rules (enforced via `eslint-plugin-boundaries` or `@feature-sliced/eslint-config`)

- `shared/` may not import anything from above.
- `entities/` may import `shared/`.
- `features/` may import `shared/` + `entities/`.
- `widgets/` may import all of the above.
- `pages/` may import all of the above.
- `app/` only imports from `pages/` (and `shared/`, `widgets/` for layout chrome).
- **Never import a sibling slice directly** — go through its `index.ts`.

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

## 3. Tailwind v4 — CSS-first config

Tailwind v4 has no JS config file. All tokens are declared inside the `@theme` block in your global stylesheet, and Tailwind generates utilities from them automatically. Custom keyframes/animations also live in CSS.

Install the v4 PostCSS plugin (already wired by `create-next-app` in the templates that ship with Next 16). If you started from a v3 template:

```bash
npm i tailwindcss@latest @tailwindcss/postcss@latest
# remove tailwind.config.ts and any postcss.config.js using `tailwindcss` (use `@tailwindcss/postcss`)
```

`postcss.config.mjs`:

```js
export default { plugins: { '@tailwindcss/postcss': {} } };
```

`src/app/globals.css` — single source of truth for tokens and utilities:

```css
@import "tailwindcss";

/* ── Tokens ──────────────────────────────────────────────────────────────── */
@theme {
  /* Color tokens (generate text-bg, bg-surface, border-line, etc.) */
  --color-bg: #100612;
  --color-bg-2: #18091c;
  --color-surface: #1f0e25;
  --color-surface-2: #2a1432;
  --color-text: #f4ead8;
  --color-text-2: rgba(244, 234, 216, 0.68);
  --color-text-3: rgba(244, 234, 216, 0.42);
  --color-accent: #c9a96e;
  --color-accent-2: #e8cf99;
  --color-plum: #7d3a6f;
  --color-violet: #9d7bc7;
  --color-rose: #d9a3b6;
  --color-line: rgba(243, 234, 216, 0.08);
  --color-line-strong: rgba(243, 234, 216, 0.18);

  /* Font tokens (generate font-display, font-body, font-mono) */
  --font-display: var(--font-cormorant), Cormorant Garamond, serif;
  --font-body: var(--font-dm), DM Sans, system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), JetBrains Mono, ui-monospace, monospace;

  /* Radius — rounded-sm / rounded / rounded-lg */
  --radius-sm: 12px;
  --radius: 18px;
  --radius-lg: 28px;

  /* Easings — ease-out, ease-in-out (overrides defaults) */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);

  /* Durations — duration-DEFAULT, duration-fast */
  --duration: 520ms;
  --duration-fast: 260ms;

  /* Image tokens — bg-gold */
  --background-image-gold: linear-gradient(135deg, #b8956a 0%, #e8cf99 25%, #fff5d6 45%, #d4b27a 65%, #a07b48 100%);

  /* Custom animations */
  --animate-shimmer: shimmer 6s linear infinite;
  --animate-float-in: floatIn var(--duration) var(--ease-out) both;
  --animate-mask-up: maskUp 900ms var(--ease-out) both;
  --animate-letter-in: letterIn 1.1s var(--ease-out) both;
}

/* Keyframes referenced by the @theme animations above */
@keyframes shimmer {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
@keyframes floatIn {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes maskUp {
  from { clip-path: inset(0 0 100% 0); }
  to   { clip-path: inset(0 0 0 0); }
}
@keyframes letterIn {
  from { opacity: 0; transform: translateY(40%) scaleY(0.85); }
  to   { opacity: 1; transform: translateY(0) scaleY(1); }
}

/* ── Base ────────────────────────────────────────────────────────────────── */
html, body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

/* ── Component-ish utilities ─────────────────────────────────────────────── */
@layer utilities {
  .scroll-x { scrollbar-width: none; -ms-overflow-style: none; }
  .scroll-x::-webkit-scrollbar { display: none; }

  .text-gold {
    background: var(--background-image-gold);
    background-size: 200% 100%;
    background-position: 25% 50%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .text-gold-shimmer {
    background: linear-gradient(
      100deg,
      #a07b48 0%, var(--color-accent) 25%, #fff5d6 50%,
      var(--color-accent-2) 75%, #a07b48 100%
    );
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: var(--animate-shimmer);
  }
}

/* ── Reduced motion ──────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  @theme {
    --duration: 0ms;
    --duration-fast: 0ms;
    --animate-shimmer: none;
    --animate-letter-in: none;
  }
}
```

**Result:** `text-accent`, `bg-surface`, `border-line-strong`, `font-display`, `rounded-lg`, `duration-fast`, `bg-gold`, `animate-letter-in`, `animate-shimmer`, etc. all work as Tailwind utilities — no JS config, no `extend.colors` boilerplate.

### 3.1 Fonts in Next 16

Use `next/font` and bind to CSS variables that `@theme` already references:

```tsx
// src/app/[locale]/layout.tsx
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from 'next/font/google';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'], weight: ['300', '400', '500'], style: ['normal', 'italic'],
  variable: '--font-cormorant',
});
const dm = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-dm' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains' });

export default async function LocaleLayout({
  children,
  params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;        // ← Next 16: params is a Promise
  return (
    <html lang={locale} className={`${cormorant.variable} ${dm.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

---

## 4. Routing & i18n (`[locale]/` with next-intl)

All pages live under `src/app/[locale]/…`. Locale segment is the first path part (`/en/home`, `/uk/home`). Default locale is `en`.

### 4.1 next-intl setup

`src/i18n/routing.ts`:

```ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'uk'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',  // /home for default locale, /uk/home for others
});
```

`src/i18n/navigation.ts` — typed `Link`/`useRouter`/`redirect` that prepends the locale automatically:

```ts
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
```

`src/i18n/request.ts` — server-side message loader (called once per request):

```ts
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
```

`next.config.ts`:

```ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const nextConfig: NextConfig = { experimental: { typedRoutes: true } };
export default withNextIntl(nextConfig);
```

`middleware.ts` (project root):

```ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

export default createMiddleware(routing);
export const config = { matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'] };
```

### 4.2 Locale layout (Next 16: async params)

```tsx
// src/app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;     // ← Promise in Next 16
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as never)) notFound();
  setRequestLocale(locale);                // ← enables static rendering with intl

  return (
    <html lang={locale} /* font variables here */>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

Same shape inside every `page.tsx` that needs the locale:

```tsx
export default async function ServiceDetailPage({
  params,
}: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  // ...
}
```

### 4.3 Route map (under `/[locale]`)

| Route                                   | Has tab bar | Page slice (`src/pages/...`) |
|-----------------------------------------|-------------|------------------------------|
| `/[locale]/welcome`                     | no          | `welcome` |
| `/[locale]/onboarding`                  | no          | `onboarding` |
| `/[locale]/home`                        | yes         | `home` |
| `/[locale]/services`                    | yes         | `services-catalog` |
| `/[locale]/services/[id]`               | no          | `service-detail` |
| `/[locale]/booking/[step]`              | no          | `booking` |
| `/[locale]/booking/confirmation`        | no          | `confirmation` |
| `/[locale]/gallery`                     | yes         | `gallery` |
| `/[locale]/master`                      | no          | `master` |
| `/[locale]/membership`                  | no          | `membership` |
| `/[locale]/profile`                     | yes         | `profile` |

Each `app/[locale]/.../page.tsx` is **thin** — it awaits params, calls `setRequestLocale`, and renders the page slice:

```tsx
// src/app/[locale]/(app)/home/page.tsx
import { HomePage } from '@/pages/home';
import { setRequestLocale } from 'next-intl/server';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomePage />;
}
```

### 4.4 Chrome

- **Tab bar** lives in `src/widgets/tab-bar` and is rendered from `src/app/[locale]/(app)/layout.tsx`. Active tab from `useSelectedLayoutSegment()`. Animated pill uses Motion's `layoutId="tab-thumb"`.
- **Booking state** is a Zustand store in `src/pages/booking/model/booking-store.ts` — selected service, date, time. Persisted to `sessionStorage`.
- **Screen transitions** — wrap children in `<AnimatePresence mode="wait">` inside each route group layout. Direction (forward/back) from a `useRouteDirection()` hook in `src/shared/lib`.
- **Linking** — always import `Link`/`useRouter` from `@/i18n/navigation`, never from `next/link` directly (otherwise the locale prefix gets dropped).

---

## 5. Components (mapped to FSD slices)

### 5.1 `shared/ui` — the UI kit

| Component   | Slice path                       | Props                                                  | Notes |
|-------------|----------------------------------|--------------------------------------------------------|-------|
| `Btn`       | `shared/ui/btn`                  | `variant: 'solid'|'gold'|'outline'|'ghost'`, `block?`, `icon?`, children, onClick | Pill button. Gold variant uses `bg-gold` with hover position shift. |
| `Tag`       | `shared/ui/tag`                  | `gold?`, `active?`, children                           | Pill chip, mono caps |
| `Eyebrow`   | `shared/ui/eyebrow`              | `gold?`, children                                      | Mono caps label, 9–10px, ls 0.32em |
| `Plate`     | `shared/ui/plate`                | `number`, `label?`                                     | "PLATE 02 · THE MENU" pattern |
| `Ornament`  | `shared/ui/ornament`             | —                                                      | Hairline rule with center diamond |
| `StatusBar` | `shared/ui/status-bar`           | —                                                      | 9:41 / VIOLETTA · OPEN / 5G (delete in prod) |
| `Wordmark`  | `shared/ui/wordmark`             | `size?`, `accent?`                                     | "Violetta BEAUTY" lockup |
| `NailTile`  | `shared/ui/nail-tile`            | `palette: [string,string]`, `variant: 0-5`, `style?`   | Placeholder imagery (see 5.2) |
| `NailFan`   | `shared/ui/nail-fan`             | `palette`, `count?`, `lift?`                           | Decorative fan of tiles |

Each slice exports a default UI plus its types from `index.ts`. **Never** reach into `shared/ui/btn/ui/Btn.tsx` directly — always `import { Btn } from '@/shared/ui/btn'`.

### 5.2 Imagery — `NailTile`

The hero motif. Layered CSS gradients posing as luxury product photography. Six variants (`0–5`): domed jewel, satin drape, atelier still life, marble swirl, chrome bevel, ink wash. Each takes `palette: [hero, deep]` and renders a stack:

1. hero gradient composition
2. soft specular highlight (radial top-left)
3. edge vignette (radial 55–100%)
4. film grain SVG (opacity 0.08, overlay blend)

**This is a placeholder.** When real photography arrives, swap `NailTile`'s `ui` to `next/image` while keeping the same props — every call site stays unchanged.

### 5.3 `entities/service` — `ServiceCard`

The menu-row card used on Home and the services catalog: thumbnail (NailTile), dot-leader between title and price, plate number, blurb. Imports only from `shared/`. Click handler is wired by the consuming page (page slice owns navigation).

### 5.4 `features/book-service`

Owns the booking step machine, Zustand store, and the `BookServiceStepIndicator` UI. The 4 booking step pages compose its UI plus shared primitives.

### 5.5 `widgets/tab-bar`, `widgets/app-header`, `widgets/hero`, `widgets/booking-stepper`

Composite blocks. `widgets/hero` ships both the Home and ServiceDetail variants behind a `variant` prop — the parallax logic is shared.

### 5.6 Tweaks panel

Production build: drop entirely.
Dev preview: lift palette/theme switching into a `features/switch-theme` slice if marketing wants a live palette switcher. The prototype's `useTweaks` is a development helper, not a runtime feature.

---

## 6. Motion (Motion for React specs)

We use the `motion` package (Motion for React) — same API as Framer Motion but lighter and current with React 19. Import as:

```tsx
import { motion, AnimatePresence } from 'motion/react';
import { useScroll, useTransform } from 'motion/react';
```

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

- Use **Server Components** by default; mark only motion/interactive leaves with `'use client'`. Page slices in `src/pages/...` are mostly server-rendered, with client islands for parallax/transitions.
- In Next 16, `fetch()` is **not cached by default** — opt in per call (`fetch(url, { cache: 'force-cache' })`) or wrap server functions with the new `'use cache'` directive plus `cacheLife()` / `cacheTag()` for fine-grained invalidation.
- Tailwind v4 builds via Lightning CSS — typically 2–5× faster than v3. No purge config to maintain.
- Self-host Cormorant + DM Sans woff2 if performance is critical (Google Fonts adds a hop).
- Replace `NailTile` CSS gradients with optimized AVIF photography via `next/image` ASAP — a real photo at the same byte budget will outperform the gradient stack on LCP.

---

## 12. Open questions for the client

1. Does the studio want online payment, deposit-only, or pay-at-studio?
2. Cancellation window — 24h, 48h, no-show fee?
3. Master profile — just Violetta, or will there be guest artists?
4. Membership — is the "2 mo free" annual model accurate to her economics?
5. Languages — confirm locales beyond `en` and `uk`. (Right now both are wired but only `en.json` has content.)
6. Photography — who shoots it and when does it land?

---

*End of handoff. Open `Violetta Beauty.html` alongside this doc — every interaction in the prototype is the spec.*
