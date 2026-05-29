import type { PriceOverrideKey, ResolvedPrice, SiteSettings } from "./types";

/**
 * Single source of truth for "what does this price display as?".
 * Overlay order: catalog price → admin override (if set) → one of two
 * mutually exclusive presentations:
 *   • Anchor markup (if active): inflate the struck "old" price above the
 *     real price, which becomes the current price. Takes precedence over
 *     the discount when both are active.
 *   • Global discount (if active): lower the effective price below the base.
 * A price of 0 short-circuits to "free" and is never marked up or
 * discounted, so the Member tier's "Free" rendering survives a promo.
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

  if (settings.markupActive && settings.markupPercent > 0) {
    const inflated = Math.round(base * (1 + settings.markupPercent / 100));
    return { base: inflated, effective: base, hasDiscount: true };
  }

  if (!settings.discountActive || settings.discountPercent === 0) {
    return { base, effective: base, hasDiscount: false };
  }

  const effective = Math.round(base * (1 - settings.discountPercent / 100));
  return { base, effective, hasDiscount: true };
}
