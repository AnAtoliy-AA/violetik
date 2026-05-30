import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import by from "@/messages/by.json";
import { PAGE_SEO_PAGES } from "./registry";
import { pageSeoEntrySchema } from "./schema";
import { resolvePageHeading, resolvePageMeta } from "../lib/resolve-heading";
import { EMPTY_PAGE_SEO_ENTRY } from "./types";
import type { Locale } from "@/i18n/routing";

/**
 * The admin Page SEO form prefills each field with the page's default value
 * and submits the lot through `pageSeoEntrySchema`. So the app's OWN
 * defaults must always satisfy that schema — otherwise an admin who opens
 * the editor and just hits "Save" gets a validation error on copy they
 * never touched. (This regressed once: the welcome tagline at 80 chars was
 * the default SEO title and tripped the 70-char title cap — the reason the
 * SEO title and the visible page heading are now separate fields.)
 *
 * This guards every page × locale default — SEO title, page heading, and
 * description — against the schema limits.
 */
const MESSAGES: Record<Locale, Record<string, Record<string, string>>> = {
  en: en as never,
  ru: ru as never,
  by: by as never,
};

function translateFor(locale: Locale) {
  return (namespace: string, key: string) => {
    const value = MESSAGES[locale]?.[namespace]?.[key];
    if (typeof value !== "string") {
      throw new Error(`Missing translation ${locale}/${namespace}.${key}`);
    }
    return value;
  };
}

const SUFFIX: Record<Locale, "En" | "Ru" | "By"> = {
  en: "En",
  ru: "Ru",
  by: "By",
};

describe("page SEO defaults are always saveable", () => {
  for (const page of PAGE_SEO_PAGES) {
    it(`${page.id}: default title + heading + description pass the save schema`, () => {
      const entry = { id: page.id, ...EMPTY_PAGE_SEO_ENTRY };
      for (const locale of ["en", "ru", "by"] as const) {
        const translate = translateFor(locale);
        const meta = resolvePageMeta({ pageId: page.id, locale, overrides: {}, translate });
        const heading = resolvePageHeading({
          pageId: page.id,
          locale,
          overrides: {},
          translate,
        });
        const s = SUFFIX[locale];
        entry[`title${s}`] = meta.title;
        entry[`heading${s}`] = heading.title;
        entry[`description${s}`] = meta.description;
      }
      const result = pageSeoEntrySchema.safeParse(entry);
      expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    });
  }
});
