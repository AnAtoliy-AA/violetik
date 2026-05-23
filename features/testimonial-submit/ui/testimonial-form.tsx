"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { buttonClassName } from "@/shared/ui/button";
import type { SubmitTestimonialResult } from "../api/submit-testimonial-action";

export interface TestimonialFormMaster {
  id: string;
  name: string;
}

export interface TestimonialFormProps {
  masters: readonly TestimonialFormMaster[];
  action: (input: {
    masterId: string;
    body: string;
  }) => Promise<SubmitTestimonialResult>;
}

type Status =
  | { kind: "idle" }
  | { kind: "client_error"; messageKey: string }
  | {
      kind: "server_error";
      reason: Exclude<SubmitTestimonialResult & { ok: false }, never>["reason"];
    }
  | { kind: "success" };

const MAX_BODY = 800;

export function TestimonialForm({ masters, action }: TestimonialFormProps) {
  const t = useTranslations("Profile");
  const [pending, startTransition] = useTransition();
  const [masterId, setMasterId] = useState<string>(masters[0]?.id ?? "");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!masterId) {
      setStatus({ kind: "client_error", messageKey: "testimonial_form_invalid_master" });
      return;
    }
    if (trimmed.length === 0) {
      setStatus({ kind: "client_error", messageKey: "testimonial_form_required" });
      return;
    }
    if (trimmed.length > MAX_BODY) {
      setStatus({ kind: "client_error", messageKey: "testimonial_form_too_long" });
      return;
    }
    startTransition(async () => {
      const result = await action({ masterId, body: trimmed });
      if (result.ok) {
        setStatus({ kind: "success" });
        setBody("");
      } else {
        setStatus({ kind: "server_error", reason: result.reason });
      }
    });
  };

  const errorMessage =
    status.kind === "client_error"
      ? t(status.messageKey as never)
      : status.kind === "server_error"
        ? serverErrorMessage(status.reason, t)
        : null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-[12px] text-text-2">
        <span>{t("testimonial_form_master")}</span>
        <select
          value={masterId}
          onChange={(e) => setMasterId(e.target.value)}
          className={cn("rounded-md border border-line bg-bg px-3 py-2 text-[14px]")}
        >
          {masters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[12px] text-text-2">
        <span>{t("testimonial_form_body")}</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MAX_BODY + 50}
          className={cn(
            "min-h-[100px] resize-y rounded-md border border-line bg-bg px-3 py-2 text-[14px]",
          )}
        />
        <span className="self-end font-mono text-[10px] text-text-3">
          {body.trim().length} / {MAX_BODY}
        </span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className={buttonClassName({ variant: "solid", size: "md" })}
      >
        {pending ? t("testimonial_form_submitting") : t("testimonial_form_submit")}
      </button>
      {errorMessage ? (
        <p role="alert" className="text-[12px] text-text-3">
          {errorMessage}
        </p>
      ) : null}
      {status.kind === "success" ? (
        <p role="status" className="text-[12px] text-accent">
          {t("testimonial_form_success")}
        </p>
      ) : null}
    </form>
  );
}

function serverErrorMessage(
  reason: Exclude<SubmitTestimonialResult & { ok: false }, never>["reason"],
  t: (key: string) => string,
): string {
  switch (reason) {
    case "body_required":
      return t("testimonial_form_required");
    case "body_too_long":
      return t("testimonial_form_too_long");
    case "duplicate_pending":
      return t("testimonial_form_duplicate");
    case "invalid_master":
      return t("testimonial_form_invalid_master");
    case "unauthenticated":
    case "unknown":
    default:
      return t("testimonial_form_required");
  }
}
