"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from "react";
import { useLiquidPress } from "../lib/use-liquid-press";
import type { GlassSurfaceAs } from "./glass-surface";

export interface InteractiveGlassSurfaceProps {
  as: GlassSurfaceAs;
  className: string;
  press: boolean;
  specular: boolean;
  children: ReactNode;
  [key: string]: unknown;
}

export const InteractiveGlassSurface = forwardRef<
  HTMLElement,
  InteractiveGlassSurfaceProps
>(function InteractiveGlassSurface(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  { as, className, press: _press, specular, children, ...rest },
  forwardedRef,
) {
  const rootRef = useRef<HTMLElement | null>(null);
  useImperativeHandle(forwardedRef, () => rootRef.current as HTMLElement);
  useLiquidPress(rootRef, { pressOnly: !specular });

  const Tag = as as "div";
  const props: Record<string, unknown> = {
    ref: rootRef,
    "data-glass": "true",
    className,
    ...rest,
  };
  if (as === "button" && !("type" in rest)) {
    props.type = "button";
  }
  return <Tag {...props}>{children}</Tag>;
});
