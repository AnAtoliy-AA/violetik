"use client";

import {
  type ButtonHTMLAttributes,
  type ElementType,
  type PointerEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useRef,
  useState,
} from "react";
import { cn } from "@/shared/lib/cn";

export interface PressableSurfaceProps
  extends Omit<ButtonHTMLAttributes<HTMLElement>, "type"> {
  /** Render as another element (e.g. `a` for navigation surfaces). */
  as?: ElementType;
  /** Disable ripple emission (still scales on press). */
  noRipple?: boolean;
  /** Anchor href — only meaningful when `as` resolves to a link element. */
  href?: string;
  /** Anchor target — only meaningful when `as` resolves to a link element. */
  target?: string;
  /** Anchor rel — only meaningful when `as` resolves to a link element. */
  rel?: string;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

type Ripple = { id: number; x: number; y: number };

let rippleId = 0;

export function PressableSurface({
  as,
  noRipple = false,
  className,
  onPointerDown,
  children,
  ref,
  ...rest
}: PressableSurfaceProps) {
  const localRef = useRef<HTMLElement | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const Component: ElementType = as ?? "button";

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!noRipple) {
        const el = event.currentTarget;
        const rect = el.getBoundingClientRect();
        const x = event.clientX - rect.left - 7;
        const y = event.clientY - rect.top - 7;
        const id = ++rippleId;
        setRipples((prev) => [...prev, { id, x, y }]);
        window.setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 700);
      }
      onPointerDown?.(event);
    },
    [noRipple, onPointerDown],
  );

  const componentProps: Record<string, unknown> = {
    ref: (node: HTMLElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref && "current" in ref)
        (ref as { current: HTMLElement | null }).current = node;
    },
    className: cn(
      "ripple-host inline-flex items-stretch text-left",
      "transition-transform duration-100 ease-out",
      "active:scale-[0.985] motion-reduce:active:scale-100",
      className,
    ),
    onPointerDown: handlePointerDown,
    ...rest,
  };

  if (Component === "button" && !("type" in rest)) {
    componentProps.type = "button";
  }

  return (
    <Component {...componentProps}>
      {children}
      {!noRipple &&
        ripples.map((r) => (
          <span
            key={r.id}
            aria-hidden
            className="ripple"
            style={{ left: r.x, top: r.y }}
          />
        ))}
    </Component>
  );
}
