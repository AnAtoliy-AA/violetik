import type { ReactNode } from "react";
import Image from "next/image";
import { buildAuthorDisplay } from "@/entities/testimonial/lib/build-author-display";
import type { AdminTestimonialRow } from "@/db/testimonials";
import type { TestimonialStatus } from "@/db/schema";
import type { Locale } from "@/i18n/routing";

export interface TestimonialRowLabels {
  submittedAt: string;
  decidedAt: string;
  statusPending: string;
  statusApproved: string;
  statusRejected: string;
}

export interface TestimonialRowProps {
  row: AdminTestimonialRow;
  locale: Locale;
  labels: TestimonialRowLabels;
  decisionSlot?: ReactNode;
}

function statusLabel(s: TestimonialStatus, labels: TestimonialRowLabels): string {
  if (s === "approved") return labels.statusApproved;
  if (s === "rejected") return labels.statusRejected;
  return labels.statusPending;
}

function masterName(row: AdminTestimonialRow, locale: Locale): string {
  if (locale === "ru") return row.masterNameRu;
  if (locale === "by") return row.masterNameBy;
  return row.masterNameEn;
}

const FMT: Record<Locale, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat("en", { dateStyle: "medium" }),
  ru: new Intl.DateTimeFormat("ru", { dateStyle: "medium" }),
  by: new Intl.DateTimeFormat("be-BY", { dateStyle: "medium" }),
};

export function TestimonialRow({
  row,
  locale,
  labels,
  decisionSlot,
}: TestimonialRowProps) {
  const author = buildAuthorDisplay({
    firstName: row.authorFirstName,
    lastName: row.authorLastName,
    username: row.authorUsername,
    email: row.authorEmail,
  });
  const dim = row.status === "rejected" ? "opacity-60" : "";
  return (
    <li className={`gilded rounded-[18px] p-5 ${dim}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {row.authorPhotoUrl ? (
            <span className="relative size-7 overflow-hidden rounded-full">
              <Image
                src={row.authorPhotoUrl}
                alt={author}
                fill
                sizes="28px"
                unoptimized
                className="object-cover"
              />
            </span>
          ) : (
            <span
              aria-hidden
              className="size-7 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, var(--color-rose), var(--color-plum))",
              }}
            />
          )}
          <span className="font-display text-[18px] italic">{author}</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
          {statusLabel(row.status, labels)}
        </span>
      </div>
      <p className="mt-3 text-[14px] leading-[1.55] text-text-2">{row.body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
        <span>
          {labels.submittedAt}: {FMT[locale].format(row.createdAt)}
        </span>
        {row.decidedAt ? (
          <span>
            {labels.decidedAt}: {FMT[locale].format(row.decidedAt)}
          </span>
        ) : null}
        <span>· <span>{masterName(row, locale)}</span></span>
      </div>
      {decisionSlot ? <div className="mt-3">{decisionSlot}</div> : null}
    </li>
  );
}
