import "server-only";
import type { AnalyticsEvent } from "./event-types";

const MAX_QUEUED = 5_000;

interface QueueState {
  events: AnalyticsEvent[];
  totalReceived: number;
  totalDropped: number;
}

/**
 * Single in-memory queue. Survives across requests on a warm Fluid
 * Compute instance; the goal is "good enough" funnel observability,
 * not analytics-grade durability. A follow-up PR can swap this for a
 * persistent sink (Postgres table or Vercel Queues) once we know the
 * funnel volume.
 */
const state: QueueState =
  (globalThis as { __violettaAnalytics?: QueueState }).__violettaAnalytics ??
  ({
    events: [],
    totalReceived: 0,
    totalDropped: 0,
  } as QueueState);

(globalThis as { __violettaAnalytics?: QueueState }).__violettaAnalytics = state;

export function pushEvent(event: AnalyticsEvent): void {
  state.totalReceived += 1;
  state.events.push(event);
  if (state.events.length > MAX_QUEUED) {
    const overflow = state.events.length - MAX_QUEUED;
    state.totalDropped += overflow;
    state.events.splice(0, overflow);
  }
}

export interface AnalyticsSnapshot {
  total: number;
  dropped: number;
  recent: ReadonlyArray<AnalyticsEvent>;
  byName: Record<string, number>;
}

export function snapshot(limit = 200): AnalyticsSnapshot {
  const byName: Record<string, number> = {};
  for (const e of state.events) {
    byName[e.name] = (byName[e.name] ?? 0) + 1;
  }
  return {
    total: state.totalReceived,
    dropped: state.totalDropped,
    recent: state.events.slice(-limit),
    byName,
  };
}

/** Test-only — reset the in-memory queue between specs. */
export function _resetAnalyticsQueue() {
  state.events = [];
  state.totalReceived = 0;
  state.totalDropped = 0;
}
