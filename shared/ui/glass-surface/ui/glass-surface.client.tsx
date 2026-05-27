"use client";

import {
  forwardRef,
  useCallback,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { useLiquidPress } from "../lib/use-liquid-press";
import type { GlassSurfaceAs } from "./glass-surface";

type AnyHtmlProps = ComponentPropsWithoutRef<"div"> &
  ComponentPropsWithoutRef<"button">;

export interface InteractiveGlassSurfaceProps
  extends Omit<AnyHtmlProps, "children"> {
  as: GlassSurfaceAs;
  className: string;
  press: boolean;
  specular: boolean;
  children: ReactNode;
}

export const InteractiveGlassSurface = forwardRef<
  HTMLElement,
  InteractiveGlassSurfaceProps
>(function InteractiveGlassSurface(
  { as, className, press, specular, children, ...rest },
  forwardedRef,
) {
  const rootRef = useRef<HTMLElement | null>(null);

  // Callback ref forwards to both the local ref (for useLiquidPress) and the
  // consumer-provided forwardedRef. Avoids the useImperativeHandle stale-handle
  // hazard when the underlying element identity changes.
  const setRoots = useCallback(
    (node: HTMLElement | null) => {
      rootRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as { current: HTMLElement | null }).current = node;
      }
    },
    [forwardedRef],
  );

  useLiquidPress(rootRef, { pressOnly: !specular });

  // `press` is destructured to keep it from leaking onto the DOM via `...rest`.
  void press;

  const Tag = as as "div";
  const props: Record<string, unknown> = {
    ref: setRoots,
    "data-glass": "true",
    className,
    ...rest,
  };
  if (as === "button" && !("type" in rest)) {
    props.type = "button";
  }
  return <Tag {...(props as ComponentPropsWithoutRef<"div">)}>{children}</Tag>;
});
