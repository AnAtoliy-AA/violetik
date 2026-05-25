import { listApprovedTestimonials } from "@/entities/testimonial";
import { withDevTimeout } from "@/db/dev-timeout";
import { TestimonialCard } from "./testimonial-card";

export async function TestimonialCardAsync() {
  const rows = await withDevTimeout(
    () => listApprovedTestimonials({ limit: 1 }),
    "home.approvedTestimonial",
  );
  return <TestimonialCard testimonial={rows[0] ?? null} />;
}
