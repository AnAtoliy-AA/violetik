"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  m,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { cn } from "@/shared/lib/cn";

export interface MagneticButtonProps {
  children: ReactNode;
  /** Pointer-to-center distance at which the button starts being pulled. */
  radius?: number;
  /** Maximum displacement in pixels at zero distance. */
  strength?: number;
  className?: string;
}

const SPRING = { stiffness: 220, damping: 22, mass: 0.6 } as const;

export function MagneticButton({
  children,
  radius = 120,
  strength = 8,
  className,
}: MagneticButtonProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, SPRING);
  const sy = useSpring(my, SPRING);

  useEffect(() => {
    if (reduceMotion) return;
    // Skip on touch devices — `(hover: hover)` filters them out. jsdom doesn't
    // implement matchMedia at all, so we treat its absence as "no hover."
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mql.matches) return;

    function onMove(event: PointerEvent) {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const distance = Math.hypot(dx, dy);
      if (distance > radius) {
        mx.set(0);
        my.set(0);
        return;
      }
      const pull = (1 - distance / radius) * strength;
      const norm = distance === 0 ? 0 : 1 / distance;
      mx.set(dx * norm * pull);
      my.set(dy * norm * pull);
    }

    function onLeave() {
      mx.set(0);
      my.set(0);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [mx, my, radius, strength, reduceMotion]);

  if (reduceMotion) {
    return (
      <div ref={ref} className={cn("inline-flex", className)}>
        {children}
      </div>
    );
  }

  return (
    <m.div
      ref={ref}
      data-magnetic="true"
      className={cn("inline-flex", className)}
      style={{ x: sx, y: sy, willChange: "transform" }}
    >
      {children}
    </m.div>
  );
}
