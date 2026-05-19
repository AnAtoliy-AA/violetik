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
  }));
}

export interface ConfettiBurstProps {
  count?: number;
}

export function ConfettiBurst({ count = 18 }: ConfettiBurstProps) {
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
            width: d.size,
            height: d.size,
            background: d.color,
          }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: d.rise, opacity: 0.6 }}
          transition={{ duration: d.duration, ease: [0.22, 1, 0.36, 1], delay: d.delay + 0.2 }}
        />
      ))}
    </>
  );
}
