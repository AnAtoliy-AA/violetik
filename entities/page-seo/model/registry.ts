/**
 * The set of public pages whose SEO title + meta description an admin
 * can override per locale. Each entry maps a stable page id (used as the
 * `page_seo` row primary key) to the route path and the translation
 * fallback (namespace + key) that supplies the default title when no
 * override is set.
 *
 * Dynamic, data-driven routes (`/services/[id]`, `/master/[slug]`) are
 * intentionally excluded — their titles come from the service/master
 * record, not a fixed string.
 */
/**
 * `headingTitleKeys` are the translation keys (in `namespace`) whose values,
 * joined by a space, form the page's flat visible title — and now also the
 * default SEO title, so the meta tag and the on-page hero render identical
 * copy. Several heroes split their title across styled spans (home's
 * "The hands" / "are a" / "portrait.", welcome's two lines); listing those
 * keys lets the shared resolver rebuild one flat string.
 *
 * `headingDescriptionKey` is the hero lede paragraph key. When a page has no
 * editorial paragraph (onboarding is a bare carousel), it's omitted and the
 * resolver falls back to the site-wide `Site.description`.
 */
export const PAGE_SEO_PAGES = [
  {
    id: "home",
    path: "/home",
    namespace: "Home",
    titleKey: "meta_title",
    headingTitleKeys: ["hero_title_line_1", "hero_title_lead", "hero_title_word"],
    headingDescriptionKey: "hero_paragraph",
  },
  {
    id: "services",
    path: "/services",
    namespace: "Services",
    titleKey: "meta_title",
    headingTitleKeys: ["hero_title"],
    headingDescriptionKey: "hero_paragraph",
  },
  {
    id: "gallery",
    path: "/gallery",
    namespace: "Gallery",
    titleKey: "meta_title",
    headingTitleKeys: ["hero_title"],
    headingDescriptionKey: "hero_paragraph",
  },
  {
    id: "master",
    path: "/master",
    namespace: "Master",
    titleKey: "meta_title",
    // /master is data-driven (the master's own name is the visible h1), so
    // there's no editorial hero string to flatten — SEO drives meta only.
    headingTitleKeys: ["meta_title"],
    headingDescriptionKey: undefined,
  },
  {
    id: "membership",
    path: "/membership",
    namespace: "Membership",
    titleKey: "meta_title",
    // hero_title embeds <em>VIP</em> (rendered as the gilded VipBadge pill),
    // so it can't be flattened into a clean meta/override string. Use the
    // plain meta_title for the default; the visible hero keeps its rich VIP
    // badge unless an admin sets a (flat) override.
    headingTitleKeys: ["meta_title"],
    headingDescriptionKey: "hero_paragraph",
  },
  {
    id: "welcome",
    path: "/welcome",
    namespace: "Welcome",
    // Short meta title (the tagline is 73–80 chars — too long for <title>).
    titleKey: "meta_title",
    // The welcome splash has no editorial h1 — the wordmark "Violetta" plus
    // the tagline line carry it, so the tagline is the visible heading.
    // No separate paragraph, so description falls to Site.description.
    headingTitleKeys: ["tagline"],
    headingDescriptionKey: undefined,
  },
  {
    id: "onboarding",
    path: "/onboarding",
    namespace: "Onboarding",
    titleKey: "meta_title",
    headingTitleKeys: ["meta_title"],
    headingDescriptionKey: undefined,
  },
  {
    id: "profile",
    path: "/profile",
    namespace: "Profile",
    titleKey: "meta_title",
    // /profile shows the signed-in user's own data in its hero, so there's
    // no editorial heading to flatten — SEO drives meta only.
    headingTitleKeys: ["meta_title"],
    headingDescriptionKey: undefined,
  },
  {
    id: "sign-in",
    path: "/sign-in",
    namespace: "SignIn",
    // Short meta title ("Sign in"); the visible h1 is the longer "Step inside."
    titleKey: "meta_title",
    headingTitleKeys: ["title"],
    headingDescriptionKey: "paragraph",
  },
] as const;

export type PageSeoId = (typeof PAGE_SEO_PAGES)[number]["id"];

export const PAGE_SEO_IDS = PAGE_SEO_PAGES.map((p) => p.id) as PageSeoId[];

export type PageSeoDescriptor = (typeof PAGE_SEO_PAGES)[number];

/** Page descriptors keyed by id, for O(1) lookup in resolvers. */
export const PAGE_SEO_BY_ID = Object.fromEntries(
  PAGE_SEO_PAGES.map((p) => [p.id, p]),
) as Record<PageSeoId, PageSeoDescriptor>;
