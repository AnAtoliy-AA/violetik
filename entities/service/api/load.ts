// Loaders here import @/db/* which depends on `postgres`. Keep this module
// out of any client component or storybook story import graph — route files
// and server components only. The entities/service barrel re-exports types
// only; these loader functions are reached via a deeper path import.
import {
  getServiceById,
  listPublishedCategories,
  listPublishedServices,
} from "@/db/services";
import type {
  CurrencyCode,
  Service as DbService,
  ServiceCategoryRow,
} from "@/db/schema";
import { getStudioPhoto, getStudioPhotos } from "@/db/studio-photos";
import type { StudioPhotoRecord } from "@/db/studio-photos";
import { getSiteSettings } from "@/db/site-settings";
import type { SiteSettings } from "@/entities/site-settings";
import type { Locale } from "@/i18n/routing";
import type { Service, ServiceCategoryRef } from "../model/types";
import { formatMajorAmount } from "./format-currency";

type I18nNameRow = { nameEn: string; nameRu: string; nameBy: string };
type I18nBlurbRow = { blurbEn: string; blurbRu: string; blurbBy: string };

function pickName(row: I18nNameRow, locale: Locale): string {
  if (locale === "ru") return row.nameRu;
  if (locale === "by") return row.nameBy;
  return row.nameEn;
}

function pickBlurb(row: I18nBlurbRow, locale: Locale): string {
  if (locale === "ru") return row.blurbRu;
  if (locale === "by") return row.blurbBy;
  return row.blurbEn;
}

function pickInclude(
  entry: { en: string; ru: string; by: string },
  locale: Locale,
): string {
  return entry[locale];
}

const DURATION_UNIT: Record<Locale, string> = {
  en: "min",
  ru: "мин",
  by: "хв",
};

function formatDuration(minutes: number, locale: Locale): string {
  return `${minutes} ${DURATION_UNIT[locale]}`;
}

function applyDiscount(priceCents: number, settings: SiteSettings): number {
  if (!settings.discountActive || settings.discountPercent === 0) {
    return priceCents;
  }
  return Math.round((priceCents * (100 - settings.discountPercent)) / 100);
}

/**
 * Pure transformation — exported under an underscore so tests can poke
 * at it without needing the DB. Production callers use the loaders
 * below, which assemble the dependencies for you.
 */
export function _toService({
  row,
  category,
  photo,
  locale,
  currency,
  settings,
}: {
  row: DbService;
  category: ServiceCategoryRow;
  photo: StudioPhotoRecord | null;
  locale: Locale;
  currency: CurrencyCode;
  settings: SiteSettings;
}): Service {
  const categoryRef: ServiceCategoryRef = {
    id: category.id,
    name: pickName(category, locale),
  };
  const effectiveCents = applyDiscount(row.priceCents, settings);
  return {
    id: row.id,
    category: categoryRef,
    name: pickName(row, locale),
    blurb: pickBlurb(row, locale),
    includes: (row.includes ?? []).map((entry) => pickInclude(entry, locale)),
    price: Math.round(effectiveCents / 100),
    priceCents: effectiveCents,
    displayPrice: formatMajorAmount({
      amountCents: effectiveCents,
      currency,
      locale,
    }),
    duration: formatDuration(row.durationMinutes, locale),
    durationMinutes: row.durationMinutes,
    sortOrder: row.sortOrder,
    image: photo?.image,
  };
}

function currencyOf(settings: SiteSettings): CurrencyCode {
  return (settings as SiteSettings & { currency?: CurrencyCode }).currency
    ?? "EUR";
}

export async function loadServicesForLocale(
  locale: Locale,
): Promise<Service[]> {
  const [rows, categories, photos, settings] = await Promise.all([
    listPublishedServices(),
    listPublishedCategories(),
    getStudioPhotos("service"),
    getSiteSettings(),
  ]);
  const currency = currencyOf(settings);
  const catById = new Map<string, ServiceCategoryRow>(
    categories.map((c) => [c.id, c]),
  );
  const photoById = new Map<string, StudioPhotoRecord>(
    photos.map((p) => [p.slotId, p]),
  );
  const out: Service[] = [];
  for (const row of rows) {
    const category = catById.get(row.categoryId);
    if (!category) continue;
    out.push(
      _toService({
        row,
        category,
        photo: photoById.get(row.id) ?? null,
        locale,
        currency,
        settings,
      }),
    );
  }
  return out;
}

export async function loadServiceByIdForLocale(
  id: string,
  locale: Locale,
): Promise<Service | null> {
  const [row, settings] = await Promise.all([
    getServiceById(id),
    getSiteSettings(),
  ]);
  if (!row || row.status !== "published") return null;
  const categories = await listPublishedCategories();
  const category = categories.find((c) => c.id === row.categoryId);
  if (!category) return null;
  const photo = await getStudioPhoto("service", id);
  return _toService({
    row,
    category,
    photo,
    locale,
    currency: currencyOf(settings),
    settings,
  });
}

export async function loadPublishedServiceIds(): Promise<string[]> {
  const rows = await listPublishedServices();
  return rows.map((r) => r.id);
}
