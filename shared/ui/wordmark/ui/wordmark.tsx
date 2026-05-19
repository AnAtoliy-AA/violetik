import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type Size = "xs" | "sm" | "md" | "lg";

export interface WordmarkProps extends HTMLAttributes<HTMLDivElement> {
  size?: Size;
}

const sizeClass: Record<Size, string> = {
  xs: "text-xl",
  sm: "text-3xl",
  md: "text-5xl",
  lg: "text-7xl",
};

export function Wordmark({ size = "md", className, ...rest }: WordmarkProps) {
  return (
    <div
      className={cn(
        "font-display italic leading-none",
        sizeClass[size],
        className,
      )}
      {...rest}
    >
      <span className="block">Violetta</span>
      <span className="block font-mono not-italic tracking-[0.32em] text-[0.18em] mt-2 text-gold">
        B·E·A·U·T·Y
      </span>
    </div>
  );
}
