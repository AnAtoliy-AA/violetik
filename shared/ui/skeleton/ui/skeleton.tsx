import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type SkeletonVariant = "line" | "rect" | "circle";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  lines?: number;
  size?: number;
}

const baseVariant: Record<SkeletonVariant, string> = {
  line: "h-3 w-full rounded-sm",
  rect: "w-full rounded-md",
  circle: "rounded-full shrink-0",
};

export function Skeleton({
  variant = "rect",
  lines = 1,
  size = 32,
  className,
  style,
  ...rest
}: SkeletonProps) {
  if (variant === "line" && lines > 1) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-live="polite"
        className={cn("flex flex-col gap-2", className)}
        {...rest}
      >
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "skeleton",
              baseVariant.line,
              i === lines - 1 && "w-2/3",
            )}
          />
        ))}
      </div>
    );
  }

  if (variant === "circle") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-live="polite"
        className={cn("skeleton", baseVariant.circle, className)}
        style={{ width: size, height: size, ...style }}
        {...rest}
      />
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn("skeleton", baseVariant[variant], className)}
      style={style}
      {...rest}
    />
  );
}
