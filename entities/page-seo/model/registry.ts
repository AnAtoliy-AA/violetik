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
export const PAGE_SEO_PAGES = [
  { id: "home", path: "/home", namespace: "Home", titleKey: "meta_title" },
  { id: "services", path: "/services", namespace: "Services", titleKey: "meta_title" },
  { id: "gallery", path: "/gallery", namespace: "Gallery", titleKey: "meta_title" },
  { id: "master", path: "/master", namespace: "Master", titleKey: "meta_title" },
  { id: "membership", path: "/membership", namespace: "Membership", titleKey: "meta_title" },
  { id: "welcome", path: "/welcome", namespace: "Welcome", titleKey: "cta_enter" },
  { id: "onboarding", path: "/onboarding", namespace: "Onboarding", titleKey: "meta_title" },
  { id: "profile", path: "/profile", namespace: "Profile", titleKey: "meta_title" },
  { id: "sign-in", path: "/sign-in", namespace: "SignIn", titleKey: "meta_title" },
] as const;

export type PageSeoId = (typeof PAGE_SEO_PAGES)[number]["id"];

export const PAGE_SEO_IDS = PAGE_SEO_PAGES.map((p) => p.id) as PageSeoId[];
