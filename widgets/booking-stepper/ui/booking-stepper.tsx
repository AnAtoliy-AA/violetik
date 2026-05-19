import { cn } from "@/shared/lib/cn";

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
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex flex-col gap-2", className)}
    >
      <div className="flex gap-1.5">
        {labels.map((label, i) => (
          <div
            key={label}
            aria-hidden
            className={cn(
              "h-0.5 flex-1 transition-colors duration-DEFAULT ease-out",
              i <= current ? "bg-accent" : "bg-line-strong",
            )}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {labels.map((label, i) => (
          <span
            key={label}
            aria-current={i === current ? "step" : undefined}
            className={cn(
              "font-mono text-[10px] uppercase tracking-[0.1em] transition-colors duration-fast ease-out",
              i === current ? "text-accent" : "text-text-3",
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
