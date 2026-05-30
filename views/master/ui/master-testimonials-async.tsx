import { listApprovedTestimonials } from "@/entities/testimonial";
import { withDevTimeout } from "@/db/dev-timeout";
import { MasterTestimonialsList } from "./master-testimonials-list";

export async function MasterTestimonialsAsync({
  masterId,
}: {
  masterId: string;
}) {
  const testimonials = await withDevTimeout(
    () => listApprovedTestimonials({ masterId, limit: 10 }),
    "master.approvedTestimonials",
  );
  return <MasterTestimonialsList testimonials={testimonials} />;
}

export function MasterTestimonialsSkeleton() {
  return (
    <section
      aria-busy
      aria-label="Loading voices"
      className="px-[22px] pb-7"
    >
      <div className="h-3 w-24 rounded-full bg-line-strong animate-pulse" />
      <div className="mt-4 space-y-3.5">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-[140px] w-full rounded-[18px] bg-line-strong animate-pulse"
          />
        ))}
      </div>
    </section>
  );
}
