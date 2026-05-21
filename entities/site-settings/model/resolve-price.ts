import type { PriceOverrideKey, ResolvedPrice, SiteSettings } from "./types";

/**
 * Single source of truth for "what does this price display as?".
 * Overlay order: catalog price → admin override (if set) → global
 * discount (if active). A price of 0 short-circuits to "free" and
 * is never discounted, so the Member tier's "Free" rendering
 * survives a global percentage promo.
 */
export function resolvePrice(
  key: PriceOverrideKey,
  catalogPrice: number,
  settings: SiteSettings,
): ResolvedPrice {
  const override = settings.priceOverrides[key];
  const base = typeof override === "number" ? override : catalogPrice;

  if (base === 0) {
    return { base: 0, effective: 0, hasDiscount: false };
  }

  if (!settings.discountActive || settings.discountPercent === 0) {
    return { base, effective: base, hasDiscount: false };
  }

  const effective = Math.round(base * (1 - settings.discountPercent / 100));
  return { base, effective, hasDiscount: true };
}
