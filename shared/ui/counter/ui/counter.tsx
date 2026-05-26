"use client";

import { type HTMLAttributes, useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { cn } from "@/shared/lib/cn";

export interface CounterProps extends HTMLAttributes<HTMLSpanElement> {
  value: number;
  /** Animation duration in seconds. Default 1.4. */
  duration?: number;
  /** Pad to at least N digits so the strip width stays steady. */
  minDigits?: number;
  /** Suffix appended after the digits (e.g. "+", "★"). */
  suffix?: string;
}

const DIGIT_HEIGHT_EM = 1.05;

function DigitColumn({
  target,
  duration,
}: {
  target: number;
  duration: number;
}) {
  const reduced = useReducedMotion();
  const mv = useMotionValue(reduced ? target : 0);
  const y = useTransform(mv, (v) => `-${v * DIGIT_HEIGHT_EM}em`);

  useEffect(() => {
    if (reduced) {
      mv.set(target);
      return;
    }
    const controls = animate(mv, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [target, duration, reduced, mv]);

  return (
    <span
      className="relative inline-block overflow-hidden tabular-nums"
      style={{ height: `${DIGIT_HEIGHT_EM}em`, verticalAlign: "baseline" }}
    >
      <span aria-hidden className="invisible">
        0
      </span>
      <motion.span
        aria-hidden
        className="absolute left-0 top-0 flex flex-col"
        style={{ y, lineHeight: DIGIT_HEIGHT_EM }}
      >
        {Array.from({ length: 10 }).map((_, n) => (
          <span key={n}>{n}</span>
        ))}
      </motion.span>
    </span>
  );
}

export function Counter({
  value,
  duration = 1.4,
  minDigits = 1,
  suffix,
  className,
  ...rest
}: CounterProps) {
  const target = Math.max(0, Math.floor(value));
  const digits = String(target).padStart(minDigits, "0").split("").map(Number);

  return (
    <span
      className={cn("inline-flex items-baseline tabular-nums", className)}
      {...rest}
    >
      <span className="sr-only" data-testid="counter-value">
        {target}
      </span>
      <span aria-hidden className="inline-flex">
        {digits.map((d, i) => (
          <DigitColumn
            key={`${digits.length}-${i}`}
            target={d}
            duration={duration}
          />
        ))}
      </span>
      {suffix && (
        <span aria-hidden className="ml-1">
          {suffix}
        </span>
      )}
    </span>
  );
}
