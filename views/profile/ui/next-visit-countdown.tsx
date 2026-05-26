"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Counter } from "@/shared/ui/counter";

export interface NextVisitCountdownProps {
  /** ISO string of the next-visit scheduled time. */
  scheduledForIso: string;
}

interface Snapshot {
  bucket: "now" | "in_hours" | "tomorrow" | "in_days" | "today";
  value: number;
}

function snapshot(target: Date, now: Date = new Date()): Snapshot | null {
  const deltaMs = target.getTime() - now.getTime();
  if (deltaMs < 0) return null;

  const hours = Math.floor(deltaMs / 3_600_000);
  if (hours < 1) return { bucket: "now", value: 0 };

  const targetMidnight = new Date(target);
  targetMidnight.setHours(0, 0, 0, 0);
  const nowMidnight = new Date(now);
  nowMidnight.setHours(0, 0, 0, 0);
  const dayDelta = Math.round(
    (targetMidnight.getTime() - nowMidnight.getTime()) / 86_400_000,
  );

  if (dayDelta === 0) return { bucket: "today", value: hours };
  if (dayDelta === 1) return { bucket: "tomorrow", value: hours };
  if (hours < 24) return { bucket: "in_hours", value: hours };
  return { bucket: "in_days", value: dayDelta };
}

export function NextVisitCountdown({ scheduledForIso }: NextVisitCountdownProps) {
  const t = useTranslations("Profile.countdown");
  const target = useMemo(() => new Date(scheduledForIso), [scheduledForIso]);
  const [snap, setSnap] = useState<Snapshot | null>(() => snapshot(target));

  useEffect(() => {
    // Update every minute. Cheap enough; no animation frames needed —
    // Counter handles the digit roll on its own when value changes.
    const id = window.setInterval(() => {
      setSnap(snapshot(target));
    }, 60_000);
    return () => window.clearInterval(id);
  }, [target]);

  if (!snap) return null;

  if (snap.bucket === "now") {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent-2">
        {t("now")}
      </span>
    );
  }

  if (snap.bucket === "today" || snap.bucket === "tomorrow") {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-2">
        {snap.bucket === "today" ? t("today") : t("tomorrow")}
      </span>
    );
  }

  const labelKey = snap.bucket === "in_hours" ? "in_hours" : "in_days";
  // Split the translation around the {n} placeholder so the Counter
  // primitive can render the digit roll inline.
  const raw = t(labelKey, { n: snap.value });
  const numText = String(snap.value);
  const [before, after = ""] = raw.split(numText);

  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-2">
      {before}
      <Counter value={snap.value} duration={0.5} className="mx-0.5" />
      {after}
    </span>
  );
}
