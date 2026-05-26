export interface ApprovedTestimonial {
  id: string;
  body: string;
  createdAt: Date;
  authorDisplay: string;
  authorPhotoUrl: string | null;
  authorIsVip: boolean;
  masterId: string;
  /**
   * §11.4 — true when the testimonial author has at least one
   * confirmed or completed booking with the master they reviewed. The
   * UI uses this to render a "VERIFIED" stamp; without a real booking
   * we treat the row as anonymous opinion. Optional so legacy callers
   * (notably the testimonials admin loader in `db/testimonials.ts`,
   * which doesn't run the EXISTS subquery) don't break — consumers
   * should treat `undefined` as unverified.
   */
  hasMatchedBooking?: boolean;
}
