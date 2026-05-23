import type { UserBookingRow } from "@/db/bookings";

export interface BookingBuckets {
  upcoming: UserBookingRow[];
  history: UserBookingRow[];
}

/**
 * Partitions user bookings into "upcoming" and "history" for the
 * profile view. Upcoming = future, status pending or confirmed.
 * History = status completed. Cancelled rows are excluded from both
 * (the spec hides cancelled rows from the customer entirely).
 *
 * Upcoming is sorted ascending (soonest first); history is sorted
 * descending (most recent first).
 */
export function bucketBookings(
  rows: readonly UserBookingRow[],
  now: Date,
): BookingBuckets {
  const upcoming: UserBookingRow[] = [];
  const history: UserBookingRow[] = [];
  for (const row of rows) {
    if (row.status === "cancelled") continue;
    if (row.status === "completed") {
      history.push(row);
      continue;
    }
    // pending or confirmed
    if (row.scheduledFor.getTime() > now.getTime()) {
      upcoming.push(row);
    }
    // past pending/confirmed are ambiguous — admin should reconcile;
    // we omit them rather than misclassify.
  }
  upcoming.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  history.sort((a, b) => b.scheduledFor.getTime() - a.scheduledFor.getTime());
  return { upcoming, history };
}
