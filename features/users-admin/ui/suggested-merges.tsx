import { Link } from "@/i18n/navigation";
import type { MergeSignal } from "@/db/users-admin";

export interface SuggestedMergeUser {
  id: string;
  displayName: string;
  photoUrl: string | null;
}

export interface SuggestedMergeRow {
  a: SuggestedMergeUser;
  b: SuggestedMergeUser;
  score: number;
  signals: MergeSignal[];
}

export interface SuggestedMergesProps {
  title: string;
  reviewLabel: string;
  signalLabels: Record<MergeSignal, string>;
  candidates: SuggestedMergeRow[];
}

export function SuggestedMerges(props: SuggestedMergesProps) {
  if (props.candidates.length === 0) return null;

  return (
    <section className="px-[22px] pb-6">
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
        {props.title}
      </h2>
      <ul className="flex flex-col gap-2">
        {props.candidates.map((row) => (
          <li
            key={`${row.a.id}::${row.b.id}`}
            className="gilded flex flex-wrap items-center justify-between gap-3 rounded-[12px] px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-display text-[16px] italic">
                {row.a.displayName}
              </span>
              <span className="text-text-3">↔</span>
              <span className="font-display text-[16px] italic">
                {row.b.displayName}
              </span>
              <span className="ml-3 flex flex-wrap gap-1">
                {row.signals.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border-[0.5px] border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-text-3"
                  >
                    {props.signalLabels[s]}
                  </span>
                ))}
              </span>
            </div>
            <Link
              href={`/admin/users/${row.a.id}/merge/${row.b.id}`}
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent"
            >
              {props.reviewLabel} →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
