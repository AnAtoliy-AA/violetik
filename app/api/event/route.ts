import { NextResponse } from "next/server";
import { ANALYTICS_EVENT_NAMES } from "@/shared/lib/analytics/event-types";
import type { AnalyticsEventName } from "@/shared/lib/analytics/event-types";
import { pushEvent } from "@/shared/lib/analytics/queue";
import { rateLimit } from "@/shared/lib/security/rate-limit";

const NAME_SET = new Set<string>(ANALYTICS_EVENT_NAMES);
const MAX_PAYLOAD_KEYS = 16;
const MAX_BATCH = 50;
// Public, unauthenticated endpoint — cap per-IP to blunt flooding.
const RATE_LIMIT = { limit: 100, windowMs: 60_000 };

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "anon";
}

function isValidPayload(p: unknown): p is Record<string, string | number | boolean> {
  if (p === undefined || p === null) return true;
  if (typeof p !== "object") return false;
  const entries = Object.entries(p as Record<string, unknown>);
  if (entries.length > MAX_PAYLOAD_KEYS) return false;
  return entries.every(
    ([, v]) =>
      typeof v === "string" || typeof v === "number" || typeof v === "boolean",
  );
}

interface IncomingEvent {
  name: string;
  sessionId?: string;
  route?: string;
  ts?: number;
  payload?: unknown;
}

export async function POST(req: Request) {
  const limit = rateLimit(`event:${clientIp(req)}`, RATE_LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
        },
      },
    );
  }

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const raw = (
    Array.isArray(parsed) ? parsed : [parsed]
  ) as ReadonlyArray<IncomingEvent>;
  if (raw.length === 0 || raw.length > MAX_BATCH) {
    return NextResponse.json({ error: "invalid_batch" }, { status: 400 });
  }

  let accepted = 0;
  for (const item of raw) {
    if (!item || typeof item.name !== "string" || !NAME_SET.has(item.name)) {
      continue;
    }
    if (!isValidPayload(item.payload)) continue;
    const sessionId = typeof item.sessionId === "string" ? item.sessionId : "anon";
    const route = typeof item.route === "string" ? item.route : "/";
    const ts =
      typeof item.ts === "number" && Number.isFinite(item.ts) ? item.ts : Date.now();
    pushEvent({
      name: item.name as AnalyticsEventName,
      sessionId,
      route,
      ts,
      payload: (item.payload as Record<string, string | number | boolean>) ??
        undefined,
    });
    accepted += 1;
  }

  return NextResponse.json({ accepted });
}
