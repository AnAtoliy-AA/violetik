import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export interface MarqueeProps extends HTMLAttributes<HTMLDivElement> {
  /** Horizontal gap between items + between the duplicated track halves. */
  gap?: string;
  /** Animation duration override; default 40s. */
  duration?: string;
  /** Pause animation when hovered (default true). */
  pauseOnHover?: boolean;
  children: ReactNode;
}

export function Marquee({
  gap = "2.5rem",
  duration,
  pauseOnHover = true,
  className,
  style,
  children,
  ...rest
}: MarqueeProps) {
  return (
    <div
      className={cn(
        "group relative w-full overflow-hidden",
        "[mask-image:linear-gradient(to_right,transparent_0%,black_8%,black_92%,transparent_100%)]",
        className,
      )}
      style={style}
      {...rest}
    >
      <div
        className={cn(
          "flex w-max items-center motion-safe:animate-[marquee_var(--marquee-duration)_linear_infinite]",
          pauseOnHover && "motion-safe:group-hover:[animation-play-state:paused]",
        )}
        style={
          {
            gap,
            "--marquee-duration": duration ?? "40s",
          } as React.CSSProperties
        }
      >
        <div className="flex items-center shrink-0" style={{ gap }}>
          {children}
        </div>
        <div
          aria-hidden
          className="flex items-center shrink-0"
          style={{ gap }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
