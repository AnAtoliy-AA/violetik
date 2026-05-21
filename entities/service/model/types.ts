import type { CurrencyCode } from "@/db/schema";
import type { ImageAsset } from "@/entities/studio";

/**
 * Runtime category reference attached to each loaded Service. Only `id`
 * and a locale-resolved `name` are exposed to UI — the full row stays in
 * the DB layer.
 */
export interface ServiceCategoryRef {
  id: string;
  name: string;
}

/**
 * Runtime Service shape used by every UI component. Built by
 * `entities/service/api/load.ts` for the active locale; UI never looks
 * up locale columns directly.
 *
 * - `price` is a major-units number kept for back-compat with snapshot
 *   tests that read `service.price`.
 * - `priceCents` is the canonical integer-minor-units amount.
 * - `displayPrice` is the pre-formatted string — what every "€95" used
 *   to be. Consumers SHOULD prefer `displayPrice` over `price` so the
 *   global currency setting applies.
 * - `duration` is the localized display string (e.g. "75 min" /
 *   "75 мин" / "75 хв"). `durationMinutes` is the integer used by
 *   booking submit + the slots route.
 * - `includes` is the locale-resolved bullet list.
 */
export interface Service {
  id: string;
  category: ServiceCategoryRef;
  name: string;
  blurb: string;
  includes: string[];
  price: number;
  priceCents: number;
  displayPrice: string;
  duration: string;
  durationMinutes: number;
  sortOrder: number;
  image?: ImageAsset;
}

export type { CurrencyCode };
