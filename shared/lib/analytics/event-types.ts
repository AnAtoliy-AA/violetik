/**
 * Event vocabulary for the Phase 2 analytics stream. Each event is a
 * tag + an optional shallow payload. No PII — `userId` and `email` are
 * intentionally absent. SessionId is generated client-side and reset
 * on hard reload.
 *
 * Add new tags here so the server route can validate them and the
 * admin dashboard can enumerate the funnel.
 */
export const ANALYTICS_EVENT_NAMES = [
  "welcome_landed",
  "welcome_cta_step_inside",
  "welcome_cta_tonight",
  "onboarding_completed",
  "onboarding_skipped",
  "home_next_opening_tapped",
  "service_detail_opened",
  "service_detail_pairs_with_opened",
  "booking_step_entered",
  "booking_step_completed",
  "booking_save_sheet_shown",
  "booking_save_sheet_resumed",
  "booking_submit_success",
  "booking_submit_error",
  "confirmation_share_link_copied",
  "confirmation_add_to_calendar",
  "palette_switched",
  "tonight_ribbon_tapped",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  sessionId: string;
  route: string;
  ts: number;
  /**
   * Tag-scoped, JSON-serialisable payload. Examples:
   *  - service_detail_opened → { serviceId }
   *  - booking_step_entered → { step }
   *  - palette_switched → { palette }
   * No free-form keys — keep this finite or the dashboard becomes a swamp.
   */
  payload?: Record<string, string | number | boolean>;
}
