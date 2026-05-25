// Suspense fallbacks for the async sections of the home page.
// Each skeleton mirrors the rough vertical rhythm of its real counterpart
// so the layout doesn't jump when the data arrives.

function Block({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-line-strong ${className}`}
    />
  );
}

export function MasterStripSkeleton() {
  return (
    <section
      aria-busy
      aria-label="Loading master"
      className="px-[22px] pb-9 md:px-12"
    >
      <Block className="h-3 w-24 rounded-full" />
      <div className="mt-4 flex items-center gap-4">
        <Block className="size-[88px] rounded-full" />
        <div className="flex-1 space-y-2">
          <Block className="h-7 w-44" />
          <Block className="h-3 w-32 rounded-full" />
        </div>
      </div>
    </section>
  );
}

export function TestimonialCardSkeleton() {
  return (
    <section
      aria-busy
      aria-label="Loading testimonial"
      className="px-[22px] pb-9 md:px-12"
    >
      <Block className="h-[180px] w-full rounded-[28px]" />
    </section>
  );
}

export function HomeFooterSkeleton() {
  return (
    <section
      aria-busy
      aria-label="Loading studio details"
      className="px-[22px] pt-6 pb-10 md:px-12"
    >
      <Block className="h-3 w-32 rounded-full" />
      <Block className="mt-3 h-4 w-2/3" />
      <Block className="mt-2 h-3 w-1/2 rounded-full" />
    </section>
  );
}
