import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type PaperGrainProps = HTMLAttributes<HTMLDivElement>;

const NOISE_SVG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.92  0 0 0 0 0.85  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export function PaperGrain({ className, style, ...rest }: PaperGrainProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-[1] opacity-[0.035] mix-blend-overlay",
        className,
      )}
      style={{
        backgroundImage: NOISE_SVG,
        backgroundSize: "160px 160px",
        ...style,
      }}
      {...rest}
    />
  );
}
