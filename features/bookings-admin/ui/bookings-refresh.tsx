"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { RefreshButton } from "@/shared/ui/refresh-button";
import { NewItemsPill } from "@/shared/ui/new-items-pill";

const POLL_INTERVAL_MS = 30_000;
const ENDPOINT = "/api/admin/bookings/pending-count";

export interface BookingsRefreshControlsProps {
  initialPendingCount: number;
  ariaRefreshLabel: string;
  newPendingLabel: (n: number) => string;
}

export function BookingsRefreshControls({
  initialPendingCount,
  ariaRefreshLabel,
  newPendingLabel,
}: BookingsRefreshControlsProps) {
  const router = useRouter();
  const [baseline, setBaseline] = useState(initialPendingCount);
  const [latest, setLatest] = useState(initialPendingCount);

  const fetchCount = useCallback(async () => {
    if (
      typeof document !== "undefined" &&
      document.visibilityState !== "visible"
    ) {
      return;
    }
    try {
      const res = await fetch(ENDPOINT, { cache: "no-store" });
      if (!res.ok) {
        console.warn(`[bookings-refresh] non-200: ${res.status}`);
        return;
      }
      const json = (await res.json()) as { count: number };
      setLatest(json.count);
    } catch (err) {
      console.warn("[bookings-refresh] fetch failed:", err);
    }
  }, []);

  // Polling: subscribe to the pending-count endpoint and mirror it into
  // local state. fetchCount reads document.visibilityState and hits the
  // network — it's a genuine "subscribe to external system" effect, and
  // the setLatest inside it is the subscription callback, not a render-
  // derived setter. That's the documented exception to the eslint rule.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchCount();
    const id = setInterval(() => {
      void fetchCount();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchCount]);

  const resetBaseline = useCallback(() => {
    setBaseline(latest);
  }, [latest]);

  // Tab-becomes-visible: refresh and reset baseline. Same behaviour as
  // Pattern A on the sibling admin pages; RefreshButton has
  // disableVisibilityRefresh so this wrapper owns the focus path end-to-end.
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") {
        router.refresh();
        resetBaseline();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [router, resetBaseline]);

  const handlePillClick = useCallback(() => {
    router.refresh();
    resetBaseline();
  }, [router, resetBaseline]);

  const delta = Math.max(0, latest - baseline);

  return (
    <div className="flex items-center gap-2">
      {delta > 0 ? (
        <NewItemsPill
          count={delta}
          label={newPendingLabel(delta)}
          onClick={handlePillClick}
        />
      ) : null}
      <RefreshButton
        ariaLabel={ariaRefreshLabel}
        onRefresh={resetBaseline}
        disableVisibilityRefresh
      />
    </div>
  );
}
