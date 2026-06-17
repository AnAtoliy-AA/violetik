import { cn } from "@/shared/lib/cn";
import { GlassSurface } from "@/shared/ui/glass-surface";

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      width={10}
      height={10}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 6.5l2.5 2.5 4.5-5" />
    </svg>
  );
}

export interface BookingStepperProps {
  labels: readonly string[];
  /** Zero-based index of the active step. */
  current: number;
  className?: string;
  ariaLabel?: string;
}

export function BookingStepper({
  labels,
  current,
  className,
  ariaLabel = "Booking progress",
}: BookingStepperProps) {
  return (
    <GlassSurface
      tint="cool"
      blur="md"
      rim
      elevation={2}
      role="group"
      aria-label={ariaLabel}
      className={cn("flex flex-col gap-2.5", className)}
    >
      <div className="flex gap-1.5">
        {labels.map((label, i) => (
          <div
            key={label}
            aria-hidden
            className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-line-strong"
          >
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full bg-accent transition-all duration-500 ease-out",
                i < current && "progress-fill",
                i === current && "progress-fill",
                i <= current ? "w-full" : "w-0",
              )}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        {labels.map((label, i) => {
          const isCompleted = i < current;
          const isCurrent = i === current;
          return (
            <span
              key={label}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors duration-fast ease-out",
                isCurrent && "text-accent",
                isCompleted && "text-accent-2",
                !isCurrent && !isCompleted && "text-text-3",
              )}
            >
              {isCompleted && <CheckIcon />}
              <span>{label}</span>
            </span>
          );
        })}
      </div>
    </GlassSurface>
  );
}
