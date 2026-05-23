/**
 * IANA timezone helpers backed by `Intl.supportedValuesOf("timeZone")`.
 * Node 18+ guarantees the API.
 *
 * Node's `Intl.supportedValuesOf("timeZone")` returns canonical zones and
 * intentionally omits `UTC` / `Etc/*` aliases. We prepend `UTC` so callers
 * can offer it as a universal default in pickers.
 */

let cached: readonly string[] | null = null;

export function getTimeZoneList(): readonly string[] {
  if (cached) return cached;
  cached = Object.freeze(["UTC", ...Intl.supportedValuesOf("timeZone")]);
  return cached;
}

const ZONE_SET = new Set(getTimeZoneList());

export function isValidTimeZone(tz: string): boolean {
  return ZONE_SET.has(tz);
}
