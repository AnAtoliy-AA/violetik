// Loading placeholders for each Suspense boundary on the profile page.
// Each skeleton mirrors the rough shape and vertical rhythm of its real
// counterpart so the layout doesn't jump when data arrives.

function Block({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-line-strong ${className}`}
    />
  );
}

export function ProfileHeroSkeleton() {
  return (
    <section
      aria-busy
      aria-label="Loading profile"
      className="relative overflow-hidden px-[22px] pt-4 pb-7"
    >
      <div className="flex items-center gap-4">
        <Block className="size-[68px] rounded-full" />
        <div className="flex-1 space-y-2">
          <Block className="h-3 w-14 rounded-full" />
          <Block className="h-9 w-44" />
          <Block className="h-3 w-24 rounded-full" />
        </div>
      </div>
    </section>
  );
}

export function UpcomingBookingsSkeleton() {
  return (
    <div aria-busy aria-label="Loading upcoming visits">
      <Block className="mt-3 h-[176px] w-full rounded-[28px]" />
    </div>
  );
}

export function BookingHistorySkeleton() {
  return (
    <ul aria-busy aria-label="Loading visit history" className="mt-3 divide-y divide-line">
      {[0, 1, 2].map((i) => (
        <li key={i} className="py-3.5">
          <Block className="h-5 w-40" />
          <Block className="mt-2 h-3 w-24 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

export function TestimonialsSectionSkeleton() {
  return (
    <div aria-busy aria-label="Loading testimonials" className="space-y-6">
      <Block className="mt-4 h-[200px] w-full rounded-3xl" />
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <Block key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
