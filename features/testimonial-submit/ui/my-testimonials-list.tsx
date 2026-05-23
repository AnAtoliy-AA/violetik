"use client";

import { useTranslations } from "next-intl";
import type { Testimonial, TestimonialStatus } from "@/db/schema";

export interface MyTestimonialsListProps {
  rows: readonly Testimonial[];
  masterNameById: Record<string, string>;
}

export function MyTestimonialsList({
  rows,
  masterNameById,
}: MyTestimonialsListProps) {
  const t = useTranslations("Profile");

  if (rows.length === 0) {
    return (
      <p className="text-[13px] text-text-3">{t("testimonials_empty")}</p>
    );
  }

  const statusLabel = (s: TestimonialStatus): string =>
    s === "pending"
      ? t("status_pending")
      : s === "approved"
        ? t("status_approved")
        : t("status_rejected");

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li
          key={r.id}
          className="rounded-[18px] border-[0.5px] border-line px-4 py-3"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-[16px] italic">
              {masterNameById[r.masterId] ?? "(unknown master)"}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
              {statusLabel(r.status)}
            </span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-[13px] text-text-2">
            {r.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
