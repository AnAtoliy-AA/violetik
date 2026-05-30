import { describe, expect, it } from "vitest";
import { resolvePageSeo, resolvePageSeoEntry } from "./resolve";
import { EMPTY_PAGE_SEO_ENTRY, type PageSeoEntry } from "./types";

const entry: PageSeoEntry = {
  titleEn: "Editorial nails in Berlin",
  titleRu: "",
  titleBy: "  ",
  descriptionEn: "Hand-painted gel design, one chair.",
  descriptionRu: "Дизайн ногтей",
  descriptionBy: "",
};

describe("resolvePageSeoEntry", () => {
  it("returns the locale-specific title and description", () => {
    expect(resolvePageSeoEntry(entry, "en")).toEqual({
      title: "Editorial nails in Berlin",
      description: "Hand-painted gel design, one chair.",
    });
  });

  it("omits blank fields so callers fall back to defaults", () => {
    expect(resolvePageSeoEntry(entry, "ru")).toEqual({
      description: "Дизайн ногтей",
    });
  });

  it("treats whitespace-only values as no override", () => {
    expect(resolvePageSeoEntry(entry, "by")).toEqual({});
  });

  it("returns an empty object for an undefined entry", () => {
    expect(resolvePageSeoEntry(undefined, "en")).toEqual({});
  });

  it("returns an empty object for a fully blank entry", () => {
    expect(resolvePageSeoEntry(EMPTY_PAGE_SEO_ENTRY, "en")).toEqual({});
  });
});

describe("resolvePageSeo", () => {
  it("looks the entry up by page id", () => {
    const overrides = { home: entry };
    expect(resolvePageSeo(overrides, "home", "en")).toEqual({
      title: "Editorial nails in Berlin",
      description: "Hand-painted gel design, one chair.",
    });
  });

  it("returns an empty object for an unknown page id", () => {
    expect(resolvePageSeo({ home: entry }, "gallery", "en")).toEqual({});
  });
});
