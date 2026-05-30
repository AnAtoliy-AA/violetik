import { describe, expect, it } from "vitest";
import { resolvePageHeading, resolvePageMeta } from "./resolve-heading";
import { EMPTY_PAGE_SEO_ENTRY } from "../model/types";

// A translate() that echoes "namespace.key" so assertions can see exactly
// which keys were composed, without depending on real message JSON.
const echo = (namespace: string, key: string) => `${namespace}.${key}`;

describe("resolvePageMeta (SEO <title> + description)", () => {
  it("defaults the title to the page's short titleKey", () => {
    const result = resolvePageMeta({
      pageId: "welcome",
      locale: "en",
      overrides: {},
      translate: echo,
    });
    // welcome.titleKey is "meta_title" — NOT the long tagline.
    expect(result.title).toBe("Welcome.meta_title");
  });

  it("prefers the admin title override (title* field)", () => {
    const result = resolvePageMeta({
      pageId: "services",
      locale: "en",
      overrides: {
        services: { ...EMPTY_PAGE_SEO_ENTRY, titleEn: "Custom SEO Title" },
      },
      translate: echo,
    });
    expect(result.title).toBe("Custom SEO Title");
  });

  it("ignores the heading override for the meta title", () => {
    const result = resolvePageMeta({
      pageId: "services",
      locale: "en",
      overrides: {
        services: { ...EMPTY_PAGE_SEO_ENTRY, headingEn: "A Long Visible Heading" },
      },
      translate: echo,
    });
    expect(result.title).toBe("Services.meta_title");
  });
});

describe("resolvePageHeading (visible H1 + lede)", () => {
  it("joins multi-part hero title keys into one flat default", () => {
    const result = resolvePageHeading({
      pageId: "home",
      locale: "en",
      overrides: {},
      translate: echo,
    });
    expect(result.title).toBe(
      "Home.hero_title_line_1 Home.hero_title_lead Home.hero_title_word",
    );
    expect(result.description).toBe("Home.hero_paragraph");
  });

  it("falls back to Site.description when a page has no paragraph key", () => {
    const result = resolvePageHeading({
      pageId: "onboarding",
      locale: "en",
      overrides: {},
      translate: echo,
    });
    expect(result.description).toBe("Site.description");
  });

  it("prefers the admin heading override (heading* field), not the title", () => {
    const result = resolvePageHeading({
      pageId: "services",
      locale: "en",
      overrides: {
        services: {
          ...EMPTY_PAGE_SEO_ENTRY,
          titleEn: "SEO Title",
          headingEn: "Custom Visible Heading",
        },
      },
      translate: echo,
    });
    expect(result.title).toBe("Custom Visible Heading");
  });

  it("ignores a blank heading override and uses the default", () => {
    const result = resolvePageHeading({
      pageId: "services",
      locale: "en",
      overrides: { services: { ...EMPTY_PAGE_SEO_ENTRY, headingEn: "   " } },
      translate: echo,
    });
    expect(result.title).toBe("Services.hero_title");
  });

  it("resolves per-locale heading override fields", () => {
    const result = resolvePageHeading({
      pageId: "gallery",
      locale: "ru",
      overrides: {
        gallery: { ...EMPTY_PAGE_SEO_ENTRY, headingRu: "Галерея" },
      },
      translate: echo,
    });
    expect(result.title).toBe("Галерея");
  });

  it("shares the description override with meta", () => {
    const overrides = {
      gallery: { ...EMPTY_PAGE_SEO_ENTRY, descriptionEn: "Shared desc" },
    };
    const heading = resolvePageHeading({
      pageId: "gallery",
      locale: "en",
      overrides,
      translate: echo,
    });
    const meta = resolvePageMeta({
      pageId: "gallery",
      locale: "en",
      overrides,
      translate: echo,
    });
    expect(heading.description).toBe("Shared desc");
    expect(meta.description).toBe("Shared desc");
  });
});
