/**
 * Returns true when `scheduledFor` is in the past or fewer than
 * `minLeadMinutes` away from `now`. Pure: no I/O, no clock access.
 *
 * Used by both the slot API (to drop stale candidates) and the
 * submit server action (to reject race-condition submissions).
 */
export function isTooSoon(
  scheduledFor: Date,
  now: Date,
  minLeadMinutes: number,
): boolean {
  return scheduledFor.getTime() - now.getTime() < minLeadMinutes * 60_000;
}
