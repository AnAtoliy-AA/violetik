"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { categoryFormSchema } from "@/entities/service/model/schema";
import type { CategoryFormInput } from "@/entities/service/model/schema";
import { cn } from "@/shared/lib/cn";
import { buttonClassName } from "@/shared/ui/button";

type Status = "draft" | "published" | "archived";

export interface CategoryEditorInitial {
  id: string;
  nameEn: string;
  nameRu: string;
  nameBy: string;
  sortOrder: number;
  status: Status;
}

export type CategoryEditorSubmit = (
  patch: CategoryFormInput,
) => Promise<{ ok: true } | { ok: false; error: string }>;

export interface CategoryEditorProps {
  mode: "create" | "edit";
  initial: CategoryEditorInitial;
  onSubmit: CategoryEditorSubmit;
  /**
   * When the admin tries to archive a category that still has services,
   * the parent surfaces the blocking count and the editor renders an
   * inline error. Phase 2 only — see archive-category server action.
   */
  archiveBlockingCount?: number;
}

type UiStatus =
  | { kind: "idle" }
  | { kind: "saved" }
  | { kind: "validation"; issues: Record<string, string> }
  | { kind: "error"; message: string };

export function CategoryEditor({
  mode,
  initial,
  onSubmit,
  archiveBlockingCount,
}: CategoryEditorProps) {
  const t = useTranslations("AdminServices");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<UiStatus>({ kind: "idle" });

  const [id, setId] = useState(initial.id);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [nameRu, setNameRu] = useState(initial.nameRu);
  const [nameBy, setNameBe] = useState(initial.nameBy);
  const [rowStatus, setRowStatus] = useState<Status>(initial.status);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus({ kind: "idle" });
    const payload: CategoryFormInput = {
      id,
      nameEn,
      nameRu,
      nameBy,
      sortOrder: initial.sortOrder,
      status: rowStatus,
    };
    const parsed = categoryFormSchema.safeParse(payload);
    if (!parsed.success) {
      const issues: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!(path in issues)) issues[path] = issue.message;
      }
      setStatus({ kind: "validation", issues });
      return;
    }
    startTransition(async () => {
      const result = await onSubmit(parsed.data);
      if (result.ok) setStatus({ kind: "saved" });
      else setStatus({ kind: "error", message: result.error });
    });
  }

  const issues =
    status.kind === "validation" ? status.issues : ({} as Record<string, string>);
  const errFor = (path: string): string | null => {
    const code = issues[path];
    if (!code) return null;
    if (code === "required") return t("validation_required");
    if (code === "slug_invalid") return t("validation_slug_invalid");
    if (code === "slug_required") return t("validation_required");
    return code;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 px-[22px] py-6"
    >
      <h1 className="font-display text-[32px] font-light italic leading-tight">
        {mode === "create" ? t("title_new_category") : t("title_edit_category")}
      </h1>

      {archiveBlockingCount && archiveBlockingCount > 0 ? (
        <p
          role="alert"
          className="rounded border-[0.5px] border-accent bg-surface-2 p-3 text-[13px] text-accent"
        >
          {t("archive_blocked", { n: archiveBlockingCount })}
        </p>
      ) : null}

      <Field
        id="cat-slug"
        label={t("label_slug")}
        hint={t("label_slug_hint")}
        error={errFor("id")}
      >
        <input
          id="cat-slug"
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value)}
          disabled={mode === "edit"}
          className={inputClass}
        />
      </Field>

      <Field
        id="cat-name-en"
        label={t("label_name_en")}
        error={errFor("nameEn")}
      >
        <input
          id="cat-name-en"
          type="text"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field
        id="cat-name-ru"
        label={t("label_name_ru")}
        error={errFor("nameRu")}
      >
        <input
          id="cat-name-ru"
          type="text"
          value={nameRu}
          onChange={(e) => setNameRu(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field
        id="cat-name-be"
        label={t("label_name_by")}
        error={errFor("nameBy")}
      >
        <input
          id="cat-name-be"
          type="text"
          value={nameBy}
          onChange={(e) => setNameBe(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field id="cat-status" label={t("label_status")}>
        <select
          id="cat-status"
          value={rowStatus}
          onChange={(e) => setRowStatus(e.target.value as Status)}
          className={inputClass}
        >
          <option value="draft">{t("status_draft")}</option>
          <option value="published">{t("status_published")}</option>
          <option value="archived">{t("status_archived")}</option>
        </select>
      </Field>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={buttonClassName({ variant: "gold", size: "md" })}
        >
          {t("cta_save")}
        </button>
        {status.kind === "saved" ? (
          <span role="status" className="text-[12px] text-text-2">
            {t("saved")}
          </span>
        ) : status.kind === "error" ? (
          <span role="alert" className="text-[12px] text-accent">
            {t("save_failed", { error: status.message })}
          </span>
        ) : null}
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded border border-line bg-surface px-3 py-2 text-[14px]";

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5 text-[13px] text-text-2">
      <label
        htmlFor={id}
        className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <span id={hintId} className="text-[11px] text-text-3">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className={cn("text-[12px] text-accent")} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
