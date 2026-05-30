import { describe, expect, it } from "vitest";
import { resolvePageHeading } from "./resolve-heading";
import { EMPTY_PAGE_SEO_ENTRY } from "../model/types";

// A translate() that echoes "namespace.key" so assertions can see exactly
// which keys were composed, without depending on real message JSON.
const echo = (namespace: string, key: string) => `${namespace}.${key}`;

describe("resolvePageHeading", () => {
  it("joins multi-part hero title keys into one flat default", () => {
    const result = resolvePageHeading({
      pageId: "home",
      locale: "en",
      overrides: {},
      translate: echo,
    });
    expect(result.title).toBe("Home.hero_title_line_1 Home.hero_title_lead Home.hero_title_word");
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

  it("prefers a non-blank admin override over the translation default", () => {
    const result = resolvePageHeading({
      pageId: "services",
      locale: "en",
      overrides: {
        services: {
          ...EMPTY_PAGE_SEO_ENTRY,
          titleEn: "Custom Title",
          descriptionEn: "Custom description",
        },
      },
      translate: echo,
    });
    expect(result.title).toBe("Custom Title");
    expect(result.description).toBe("Custom description");
  });

  it("ignores a blank override and uses the default", () => {
    const result = resolvePageHeading({
      pageId: "services",
      locale: "en",
      overrides: { services: { ...EMPTY_PAGE_SEO_ENTRY, titleEn: "   " } },
      translate: echo,
    });
    expect(result.title).toBe("Services.hero_title");
  });

  it("resolves per-locale override fields", () => {
    const result = resolvePageHeading({
      pageId: "gallery",
      locale: "ru",
      overrides: {
        gallery: { ...EMPTY_PAGE_SEO_ENTRY, titleRu: "Галерея" },
      },
      translate: echo,
    });
    expect(result.title).toBe("Галерея");
  });
});
