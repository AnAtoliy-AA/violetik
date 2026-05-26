"use client";

import type { ReactNode } from "react";
import { useInView } from "@/shared/lib/use-in-view";

export interface DeferUntilVisibleProps {
  /** The real subtree; mounts only after the placeholder enters viewport. */
  children: ReactNode;
  /** Rendered before the section becomes visible. Should reserve roughly the same height. */
  placeholder?: ReactNode;
  /** How far ahead of the viewport to start hydrating. Defaults to 400px. */
  rootMargin?: string;
}

/**
 * §14.4 — generic "render only when scrolled into view" gate. Backs the
 * brief's `next/dynamic + ssr: false` recommendation for non-critical
 * below-the-fold sections (`AtelierMotion`, `MembershipCard`, …) but
 * fits the App Router + Server Component split better: the parent stays
 * a server component, and the heavy subtree just defers until needed.
 *
 * The wrapper itself ships zero JS bytes worth of subtree code until
 * the IntersectionObserver fires, so a visitor who never scrolls past
 * the hero never pays for those motion / video components.
 */
export function DeferUntilVisible({
  children,
  placeholder = null,
  rootMargin = "400px",
}: DeferUntilVisibleProps) {
  const [observerRef, inView] = useInView<HTMLDivElement>({ rootMargin });
  return <div ref={observerRef}>{inView ? children : placeholder}</div>;
}
