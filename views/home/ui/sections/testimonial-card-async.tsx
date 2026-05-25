import { listApprovedTestimonials } from "@/entities/testimonial";
import { TestimonialCard } from "./testimonial-card";

export async function TestimonialCardAsync() {
  const rows = await listApprovedTestimonials({ limit: 1 });
  return <TestimonialCard testimonial={rows[0] ?? null} />;
}
