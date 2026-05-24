const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * A customer can self-cancel only when the visit is strictly more
 * than 24 hours away. Exactly-24h is not enough — the customer must
 * contact the master directly below the threshold (see spec §3).
 */
export function canSelfCancel(now: Date, scheduledFor: Date): boolean {
  return scheduledFor.getTime() - now.getTime() > TWENTY_FOUR_HOURS_MS;
}
