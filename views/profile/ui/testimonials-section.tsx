import {
  submitTestimonialAction,
  TestimonialForm,
  MyTestimonialsList,
} from "@/features/testimonial-submit";
import { listUserTestimonials } from "@/db/testimonials";
import { getCachedPublishedMasters } from "../api/loaders";

export async function TestimonialsSection({
  userId,
  locale,
}: {
  userId: string;
  locale: string;
}) {
  const [testimonials, publishedMasters] = await Promise.all([
    listUserTestimonials(userId),
    getCachedPublishedMasters(),
  ]);

  const masterNameById = Object.fromEntries(
    publishedMasters.map((m) => {
      const name =
        locale === "ru" ? m.nameRu : locale === "by" ? m.nameBy : m.nameEn;
      return [m.id, name];
    }),
  );
  const formMasters = publishedMasters.map((m) => ({
    id: m.id,
    name: locale === "ru" ? m.nameRu : locale === "by" ? m.nameBy : m.nameEn,
  }));

  return (
    <>
      <div className="mt-4">
        <TestimonialForm
          masters={formMasters}
          action={submitTestimonialAction}
        />
      </div>
      <div className="mt-6">
        <MyTestimonialsList
          rows={testimonials}
          masterNameById={masterNameById}
        />
      </div>
    </>
  );
}
