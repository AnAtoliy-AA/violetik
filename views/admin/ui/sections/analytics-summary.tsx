import { useTranslations } from "next-intl";
import { snapshot } from "@/shared/lib/analytics/queue";
import { ANALYTICS_EVENT_NAMES } from "@/shared/lib/analytics/event-types";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface FunnelRow {
  step: string;
  entered: number;
  completed: number;
  dropRate: number;
}

/**
 * §16 — small "Last 7 days" panel that reads the in-memory analytics
 * queue snapshot, filters to the trailing 7d window, and renders:
 *   - top events by count
 *   - the booking funnel (entered vs completed per step) with drop-rate
 *
 * The queue is in-memory and resets on cold start; this panel exists
 * to give the operator a feel for traffic, not to be the source of
 * truth. A persistent sink can replace `snapshot()` later without
 * touching the panel.
 */
export function AdminAnalyticsSummary() {
  const t = useTranslations("Admin.analytics");
  const snap = snapshot(2000);
  // Per-request "now" is intentional: this is a server component that
  // re-renders on every admin GET (the route is `dynamic = "force-
  // dynamic"`), so each render gets a fresh trailing-7d window.
  // eslint-disable-next-line react-hooks/purity
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  const recent = snap.recent.filter((e) => e.ts >= cutoff);

  const counts = new Map<string, number>();
  for (const name of ANALYTICS_EVENT_NAMES) counts.set(name, 0);
  for (const e of recent) counts.set(e.name, (counts.get(e.name) ?? 0) + 1);

  const top = Array.from(counts.entries())
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const stepEntered = new Map<string, number>();
  const stepCompleted = new Map<string, number>();
  for (const e of recent) {
    const step = typeof e.payload?.step === "string" ? e.payload.step : null;
    if (!step) continue;
    if (e.name === "booking_step_entered") {
      stepEntered.set(step, (stepEntered.get(step) ?? 0) + 1);
    } else if (e.name === "booking_step_completed") {
      stepCompleted.set(step, (stepCompleted.get(step) ?? 0) + 1);
    }
  }
  const funnel: FunnelRow[] = Array.from(stepEntered.entries()).map(
    ([step, entered]) => {
      const completed = stepCompleted.get(step) ?? 0;
      const dropRate = entered === 0 ? 0 : 1 - completed / entered;
      return { step, entered, completed, dropRate };
    },
  );

  return (
    <section className="px-[22px] pb-6">
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
        {t("title")}
      </h2>
      <div className="gilded rounded-[18px] p-5">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <span className="font-display text-[16px] italic">
            {t("window_eyebrow")}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-3">
            {t("total", { count: recent.length })}
          </span>
        </div>

        {top.length === 0 ? (
          <p className="m-0 font-display text-[14px] italic text-text-3">
            {t("empty")}
          </p>
        ) : (
          <ul className="m-0 grid grid-cols-1 gap-1.5 p-0 sm:grid-cols-2">
            {top.map(([name, count]) => {
              // Each event id maps to a friendly label under
              // `Admin.analytics.events.<name>`. If the key is absent
              // (newly added event the translator hasn't covered yet),
              // fall back to the raw snake_case id so the panel stays
              // informative.
              const label = t.has(`events.${name}`)
                ? t(`events.${name}`)
                : name;
              return (
                <li
                  key={name}
                  className="flex items-baseline justify-between gap-3 border-b-[0.5px] border-line py-1.5"
                  title={name}
                >
                  <span className="truncate text-[13px] text-text-2">
                    {label}
                  </span>
                  <span className="font-display text-[18px] italic text-gold">
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {funnel.length > 0 ? (
          <div className="mt-5">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.28em] text-text-3">
              {t("funnel_eyebrow")}
            </div>
            <ul className="m-0 list-none p-0">
              {funnel.map((row) => {
                const stepLabel = t.has(`steps.${row.step}`)
                  ? t(`steps.${row.step}`)
                  : row.step;
                return (
                  <li
                    key={row.step}
                    className="flex items-baseline justify-between gap-3 border-b-[0.5px] border-line py-1.5"
                    title={row.step}
                  >
                    <span className="text-[13px] text-text-2">
                      {stepLabel}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                      {t("funnel_row", {
                        entered: row.entered,
                        completed: row.completed,
                        drop: Math.round(row.dropRate * 100),
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
