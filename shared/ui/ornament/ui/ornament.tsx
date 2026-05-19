import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type OrnamentProps = HTMLAttributes<HTMLDivElement>;

export function Ornament({ className, ...rest }: OrnamentProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn("flex items-center gap-3 text-text-3", className)}
      {...rest}
    >
      <span className="flex-1 h-px bg-line" />
      <span className="size-1.5 rotate-45 bg-accent" />
      <span className="flex-1 h-px bg-line" />
    </div>
  );
}
