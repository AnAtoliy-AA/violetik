"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { Testimonial, TestimonialStatus } from "@/db/schema";
import { buttonClassName } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import {
  cancelTestimonialChangeRequestAction,
  requestTestimonialEditAction,
  requestTestimonialRemovalAction,
} from "../api/change-request-actions";

export interface MyTestimonialsListProps {
  rows: readonly Testimonial[];
  masterNameById: Record<string, string>;
}

type RowMode = "idle" | "edit" | "removal";

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

  // 'removed' rows are hidden from the user (admin soft-deleted).
  const visible = rows.filter((r) => r.status !== "removed");

  const statusLabel = (s: TestimonialStatus): string =>
    s === "pending"
      ? t("status_pending")
      : s === "approved"
        ? t("status_approved")
        : s === "rejected"
          ? t("status_rejected")
          : "";

  return (
    <ul className="flex flex-col gap-3">
      {visible.map((r) => (
        <Row key={r.id} row={r} master={masterNameById[r.masterId] ?? "(unknown master)"} statusLabel={statusLabel(r.status)} />
      ))}
    </ul>
  );
}

function Row({
  row,
  master,
  statusLabel,
}: {
  row: Testimonial;
  master: string;
  statusLabel: string;
}) {
  const t = useTranslations("Profile");
  const [mode, setMode] = useState<RowMode>("idle");
  const [draft, setDraft] = useState(row.pendingEditBody ?? row.body);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasEditRequest = row.pendingEditBody !== null;
  const hasRemovalRequest = row.pendingRemoval;
  const hasOpenRequest = hasEditRequest || hasRemovalRequest;
  const isApproved = row.status === "approved";

  function reset() {
    setMode("idle");
    setError(null);
    setDraft(row.pendingEditBody ?? row.body);
  }

  function submitEdit() {
    setError(null);
    startTransition(async () => {
      const res = await requestTestimonialEditAction({
        testimonialId: row.id,
        body: draft,
      });
      if (!res.ok) {
        setError(t(`testimonials_error_${res.reason}` as const) || res.reason);
      } else {
        setMode("idle");
      }
    });
  }

  function submitRemoval() {
    setError(null);
    startTransition(async () => {
      const res = await requestTestimonialRemovalAction({
        testimonialId: row.id,
      });
      if (!res.ok) {
        setError(t(`testimonials_error_${res.reason}` as const) || res.reason);
      } else {
        setMode("idle");
      }
    });
  }

  function cancelRequest() {
    setError(null);
    startTransition(async () => {
      const res = await cancelTestimonialChangeRequestAction({
        testimonialId: row.id,
      });
      if (!res.ok) {
        setError(t(`testimonials_error_${res.reason}` as const) || res.reason);
      }
    });
  }

  return (
    <li className="rounded-[18px] border-[0.5px] border-line px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-[16px] italic">{master}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
          {statusLabel}
        </span>
      </div>

      {mode === "edit" ? (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            maxLength={800}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-[13px]"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={submitEdit}
              className={buttonClassName({ variant: "gold", size: "sm" })}
            >
              {t("testimonials_submit_edit")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={reset}
              className={buttonClassName({ variant: "ghost", size: "sm" })}
            >
              {t("testimonials_cancel")}
            </button>
          </div>
        </div>
      ) : mode === "removal" ? (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-[13px] text-text-2">
            {t("testimonials_confirm_removal")}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={submitRemoval}
              className={buttonClassName({ variant: "gold", size: "sm" })}
            >
              {t("testimonials_confirm_removal_yes")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={reset}
              className={buttonClassName({ variant: "ghost", size: "sm" })}
            >
              {t("testimonials_cancel")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1.5 line-clamp-2 text-[13px] text-text-2">
            {row.body}
          </p>
          {hasOpenRequest ? (
            <div className="mt-2 flex flex-col gap-1.5 rounded-md border-[0.5px] border-line-strong/70 bg-surface-2/50 px-3 py-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                {hasRemovalRequest
                  ? t("testimonials_request_removal_pending")
                  : t("testimonials_request_edit_pending")}
              </span>
              {hasEditRequest && row.pendingEditBody ? (
                <p className="text-[12px] text-text-2">{row.pendingEditBody}</p>
              ) : null}
              <button
                type="button"
                disabled={pending}
                onClick={cancelRequest}
                className={cn(
                  buttonClassName({ variant: "ghost", size: "sm" }),
                  "self-start",
                )}
              >
                {t("testimonials_cancel_request")}
              </button>
            </div>
          ) : isApproved ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setMode("edit")}
                className={buttonClassName({ variant: "ghost", size: "sm" })}
              >
                {t("testimonials_request_edit")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setMode("removal")}
                className={buttonClassName({ variant: "ghost", size: "sm" })}
              >
                {t("testimonials_request_removal")}
              </button>
            </div>
          ) : null}
        </>
      )}

      {error ? (
        <p role="alert" className="mt-2 text-[12px] text-accent">
          {error}
        </p>
      ) : null}
    </li>
  );
}
