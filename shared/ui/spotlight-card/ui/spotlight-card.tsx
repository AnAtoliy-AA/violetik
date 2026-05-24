"use client";

import { useCallback, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type Tag = "div" | "article" | "section" | "li";

export interface SpotlightCardProps extends HTMLAttributes<HTMLElement> {
  as?: Tag;
  children: ReactNode;
}

export function SpotlightCard({
  as: Component = "div",
  className,
  children,
  onPointerMove,
  ...rest
}: SpotlightCardProps) {
  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const el = event.currentTarget;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${event.clientX - r.left}px`);
      el.style.setProperty("--my", `${event.clientY - r.top}px`);
      onPointerMove?.(event);
    },
    [onPointerMove],
  );

  // The polymorphic `as` prop expands to a union of intrinsic element types,
  // and TS can't narrow handler / ref typings against that union. The runtime
  // contract — pointer move on the rendered element — is identical regardless
  // of tag, so the rest props are spread through unchanged.
  const Tag = Component as "div";
  return (
    <Tag
      onPointerMove={handlePointerMove}
      className={cn("spotlight rounded-lg", className)}
      {...(rest as HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </Tag>
  );
}
