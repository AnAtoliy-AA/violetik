"use client";

import { useCallback, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { GlassSurface } from "@/shared/ui/glass-surface";

type Tag = "div" | "article" | "section" | "li";

export type SpotlightCardVariant = "solid" | "glass";

export interface SpotlightCardProps extends HTMLAttributes<HTMLElement> {
  as?: Tag;
  variant?: SpotlightCardVariant;
  children: ReactNode;
}

export function SpotlightCard({
  as: Component = "div",
  variant = "solid",
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

  if (variant === "glass") {
    // The polymorphic `as` prop expands to a union of intrinsic element types,
    // and TS can't narrow handler / ref typings against that union. The runtime
    // contract is identical regardless of tag, so rest props are spread through.
    const TagInner = Component as "div";
    return (
      <GlassSurface
        tint="warm"
        blur="lg"
        rim={false}
        specular
        elevation={1}
        className={cn("rounded-lg", className)}
        {...(rest as HTMLAttributes<HTMLDivElement>)}
      >
        {/* Forward consumer-passed onPointerMove composed with the spotlight
          * tracker so the inner element handles both. */}
        <TagInner
          onPointerMove={handlePointerMove}
          className="spotlight rounded-lg"
        >
          {children}
        </TagInner>
      </GlassSurface>
    );
  }

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
