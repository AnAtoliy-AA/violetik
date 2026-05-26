"use client";

import { ANALYTICS_EVENT_NAMES } from "./event-types";
import type { AnalyticsEventName } from "./event-types";

const SESSION_KEY = "violetta.analytics-session";
const BATCH_INTERVAL_MS = 4_000;
const MAX_BATCH = 20;

interface QueuedEvent {
  name: AnalyticsEventName;
  payload?: Record<string, string | number | boolean>;
  ts: number;
  route: string;
}

const queue: QueuedEvent[] = [];
let flushHandle: ReturnType<typeof setTimeout> | null = null;

function getSessionId(): string {
  if (typeof window === "undefined") return "anon";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s-${Math.random().toString(36).slice(2)}-${Date.now()}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

function flush() {
  if (queue.length === 0) {
    flushHandle = null;
    return;
  }
  const batch = queue.splice(0, MAX_BATCH);
  const sessionId = getSessionId();
  const body = JSON.stringify(
    batch.map((e) => ({
      name: e.name,
      sessionId,
      route: e.route,
      ts: e.ts,
      payload: e.payload,
    })),
  );

  // sendBeacon survives page-unload — preferred when available.
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/event", blob);
      if (ok) {
        flushHandle = null;
        return;
      }
    } catch {
      /* fall through to fetch */
    }
  }

  void fetch("/api/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    /* swallowed — analytics is fire-and-forget */
  });
  flushHandle = null;
}

/**
 * Fire-and-forget client emit. Calls are debounced into a 20-event
 * batch with a 4s flush window so a screen-load that fires 5 events
 * costs one network round-trip, not five.
 */
export function emitAnalytics(
  name: AnalyticsEventName,
  payload?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;
  if (!ANALYTICS_EVENT_NAMES.includes(name)) return;
  queue.push({
    name,
    payload,
    ts: Date.now(),
    route: window.location.pathname,
  });
  if (queue.length >= MAX_BATCH) {
    flush();
    return;
  }
  if (flushHandle === null) {
    flushHandle = setTimeout(flush, BATCH_INTERVAL_MS);
  }
}

/** Force-flush — call from `beforeunload`-style listeners if you have one. */
export function flushAnalyticsNow(): void {
  if (flushHandle !== null) {
    clearTimeout(flushHandle);
    flushHandle = null;
  }
  flush();
}
