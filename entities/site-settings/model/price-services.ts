import { resolvePrice } from "./resolve-price";
import type { ResolvedPrice, SiteSettings } from "./types";

/** Minimal shape needed to resolve a service's display price. */
export interface PriceableService {
  id: string;
  price: number;
}

/**
 * Batch-resolves a list of services into a `{ id → ResolvedPrice }` map
 * via {@link resolvePrice}. Centralizes the loop that home, the services
 * catalog, and the booking flow all need so discount / markup
 * presentation stays identical everywhere a service price is shown.
 */
export function priceServices(
  services: readonly PriceableService[],
  settings: SiteSettings,
): Record<string, ResolvedPrice> {
  const out: Record<string, ResolvedPrice> = {};
  for (const s of services) {
    out[s.id] = resolvePrice(`service:${s.id}`, s.price, settings);
  }
  return out;
}
