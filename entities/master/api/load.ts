// server-only — accesses the database. Never import from a client
// component.
import {
  listAllMasters,
  listPublishedMasters,
  getMasterById,
  getServiceIdsForMaster,
  getMasterIdsForService,
} from "@/db/masters";
import { getStudioPhoto } from "@/db/studio-photos";
import type { Master, MasterStatus } from "../model/types";
import type { Master as MasterRow } from "@/db/schema";

type Locale = "en" | "ru" | "be";

function pickLocale(
  row: MasterRow,
  locale: Locale,
  field: "name" | "role" | "bio" | "quote",
): string {
  const key =
    locale === "ru"
      ? (`${field}Ru` as const)
      : locale === "be"
        ? (`${field}Be` as const)
        : (`${field}En` as const);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (row as any)[key] ?? "";
}

async function rowToMaster(row: MasterRow, locale: Locale): Promise<Master> {
  const [photo, serviceIds] = await Promise.all([
    getStudioPhoto("master", row.id),
    getServiceIdsForMaster(row.id),
  ]);
  return {
    id: row.id,
    name: pickLocale(row, locale, "name"),
    role: pickLocale(row, locale, "role"),
    bio: pickLocale(row, locale, "bio"),
    quote: pickLocale(row, locale, "quote"),
    years: row.years,
    setsLabel: row.setsLabel,
    sortOrder: row.sortOrder,
    status: row.status as MasterStatus,
    image: photo?.image ?? undefined,
    serviceIds,
    telegramUsername: row.telegramUsername ?? null,
  };
}

export async function loadMastersForLocale(
  locale: Locale,
  opts?: { publishedOnly?: boolean },
): Promise<Master[]> {
  const rows = opts?.publishedOnly
    ? await listPublishedMasters()
    : await listAllMasters();
  return Promise.all(rows.map((r) => rowToMaster(r, locale)));
}

export async function loadMasterBySlugForLocale(
  slug: string,
  locale: Locale,
): Promise<Master | null> {
  const row = await getMasterById(slug);
  if (!row) return null;
  return rowToMaster(row, locale);
}

export async function loadPublishedMasterCount(): Promise<number> {
  const rows = await listPublishedMasters();
  return rows.length;
}

export async function loadEligibleMastersForService(
  serviceId: string,
  locale: Locale,
): Promise<Master[]> {
  const ids = await getMasterIdsForService(serviceId);
  if (ids.length === 0) return [];
  const all = await loadMastersForLocale(locale, { publishedOnly: true });
  return all.filter((m) => ids.includes(m.id));
}
