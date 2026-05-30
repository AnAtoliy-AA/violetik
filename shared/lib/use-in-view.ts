"use client";

import { useEffect, useRef, useState } from "react";

export interface UseInViewOptions {
  /** Default: 200px so we hydrate just before the user reaches the card. */
  rootMargin?: string;
  /** Once true, stay true. Defaults to true — gallery never un-loads. */
  once?: boolean;
}

/**
 * SSR-safe IntersectionObserver hook. Used by gallery cards below the
 * fold to defer the real NailTile + image network request until the
 * card is actually about to enter the viewport. Falls back to "true"
 * synchronously when IntersectionObserver is unsupported so legacy
 * browsers still show content.
 */
export function useInView<T extends Element>({
  rootMargin = "200px",
  once = true,
}: UseInViewOptions = {}): readonly [
  (node: T | null) => void,
  boolean,
] {
  const [inView, setInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setRef = (node: T | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) obs.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { rootMargin, threshold: 0 },
    );
    obs.observe(node);
    observerRef.current = obs;
  };

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  return [setRef, inView] as const;
}
