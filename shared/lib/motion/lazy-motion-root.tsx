"use client";

import type { ReactNode } from "react";
import { LazyMotion, domAnimation } from "motion/react";

/**
 * §14 — wrap the locale tree once with LazyMotion + the dom-animation
 * feature bundle. Every consumer imports `m` (the lazy variant) from
 * `motion/react` instead of `motion`; this provider injects the
 * animation engine on first paint and keeps ~35kb of feature code out
 * of the initial JS bundle for visitors who never reach a motion-
 * heavy screen.
 *
 * `strict={false}` so any third-party component that still imports
 * `motion.X` (e.g. inside the react-toast or the magnetic button)
 * keeps working during the migration.
 */
export function LazyMotionRoot({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
