"use client";

import { useEffect } from "react";
import { emitAnalytics } from "./emit";
import type { AnalyticsEventName } from "./event-types";

export interface MountEventProps {
  event: AnalyticsEventName;
  payload?: Record<string, string | number | boolean>;
}

/**
 * Fires a single analytics event on first mount and nothing else.
 * Drop into any server component tree to attribute a page view
 * without converting the whole view to a client component.
 */
export function MountEvent({ event, payload }: MountEventProps) {
  useEffect(() => {
    emitAnalytics(event, payload);
    // payload is intentionally not in deps — the event is meant to
    // fire once per mount; downstream re-renders of the parent should
    // never re-fire it. We capture the initial payload only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
  return null;
}
