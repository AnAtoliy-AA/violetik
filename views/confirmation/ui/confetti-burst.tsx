"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";

const COLORS = ["var(--color-accent)", "var(--color-violet)", "var(--color-rose)"];

interface Dot {
  top: string;
  left: string;
  size: number;
  rise: number;
  color: string;
  duration: number;
  delay: number;
  /** Every 7th confetti is a hairline ring instead of a solid dot. */
  ring: boolean;
  /** Per-dot rotation target in degrees. */
  rotate: number;
}

function buildDots(count: number): Dot[] {
  return Array.from({ length: count }, (_, i) => ({
    top: `${10 + ((i * 53) % 80)}%`,
    left: `${(i * 71) % 100}%`,
    size: 3 + (i % 3),
    rise: -50 - (i % 4) * 20,
    color: COLORS[i % 3],
    duration: 1.8 + (i % 4) * 0.2,
    delay: (i * 30) / 1000,
    ring: i % 7 === 0,
    rotate: ((i * 47) % 360) + 360,
  }));
}

export interface ConfettiBurstProps {
  count?: number;
}

export function ConfettiBurst({ count = 28 }: ConfettiBurstProps) {
  const reduceMotion = useReducedMotion();
  const dots = useMemo(() => buildDots(count), [count]);

  if (reduceMotion) return null;

  return (
    <>
      {dots.map((d, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            top: d.top,
            left: d.left,
            width: d.ring ? 6 : d.size,
            height: d.ring ? 6 : d.size,
            background: d.ring ? "transparent" : d.color,
            border: d.ring ? `1px solid ${d.color}` : undefined,
          }}
          initial={{ y: 40, opacity: 0, rotate: 0 }}
          animate={{ y: d.rise, opacity: 0.6, rotate: d.rotate }}
          transition={{
            duration: d.duration,
            ease: [0.22, 1, 0.36, 1],
            delay: d.delay + 0.2,
          }}
        />
      ))}
    </>
  );
}
