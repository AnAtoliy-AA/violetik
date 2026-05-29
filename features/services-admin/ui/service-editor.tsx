"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { serviceFormSchema } from "@/entities/service/model/schema";
import type { ServiceFormInput } from "@/entities/service/model/schema";
import { cn } from "@/shared/lib/cn";
import { buttonClassName } from "@/shared/ui/button";
import {
  IncludesFieldset,
  type IncludeEntry,
} from "./includes-fieldset";
import { MasterPicker, type MasterOption } from "./master-picker";

type Status = "draft" | "published" | "archived";

export interface ServiceEditorInitial {
  id: string;
  categoryId: string;
  nameEn: string;
  nameRu: string;
  nameBy: string;
  blurbEn: string;
  blurbRu: string;
  blurbBy: string;
  includes: IncludeEntry[];
  priceCents: number;
  durationMinutes: number;
  sortOrder: number;
  status: Status;
  /** Masters linked to this service. Optional; defaults to none. */
  masterIds?: string[];
}

export interface CategoryOption {
  id: string;
  name: string;
}

export type ServiceEditorSubmit = (
  patch: ServiceFormInput,
) => Promise<{ ok: true } | { ok: false; error: string }>;

export interface ServiceEditorProps {
  mode: "create" | "edit";
  initial: ServiceEditorInitial;
  categories: readonly CategoryOption[];
  /** Masters available to link. Omit to hide the picker. */
  masters?: readonly MasterOption[];
  onSubmit: ServiceEditorSubmit;
  /** Optional photo slot — rendered when present, swapped for null on create. */
  photoSlot?: React.ReactNode;
}

type UiStatus =
  | { kind: "idle" }
  | { kind: "saved" }
  | { kind: "validation"; issues: Record<string, string> }
  | { kind: "error"; message: string };

const inputClass =
  "w-full rounded border border-line bg-surface px-3 py-2 text-[14px]";
const textareaClass =
  "w-full min-h-[80px] rounded border border-line bg-surface px-3 py-2 text-[14px]";

/** Converts a major-units string ("95", "95.5") to integer minor units. */
function majorToCents(input: string): number {
  const n = Number(input);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function centsToMajor(cents: number): string {
  if (cents === 0) return "0";
  const major = cents / 100;
  // Strip trailing .00 for whole values so "95" stays "95".
  return Number.isInteger(major) ? String(major) : major.toString();
}

export function ServiceEditor({
  mode,
  initial,
  categories,
  masters,
  onSubmit,
  photoSlot,
}: ServiceEditorProps) {
  const t = useTranslations("AdminServices");
  const [isPending, startTransition] = useTransition();
  const [uiStatus, setUiStatus] = useState<UiStatus>({ kind: "idle" });

  const [id, setId] = useState(initial.id);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [nameRu, setNameRu] = useState(initial.nameRu);
  const [nameBy, setNameBe] = useState(initial.nameBy);
  const [blurbEn, setBlurbEn] = useState(initial.blurbEn);
  const [blurbRu, setBlurbRu] = useState(initial.blurbRu);
  const [blurbBy, setBlurbBe] = useState(initial.blurbBy);
  const [includes, setIncludes] = useState<IncludeEntry[]>(initial.includes);
  const [priceMajor, setPriceMajor] = useState(centsToMajor(initial.priceCents));
  const [durationMinutes, setDurationMinutes] = useState(
    String(initial.durationMinutes),
  );
  const [status, setStatus] = useState<Status>(initial.status);
  const [masterIds, setMasterIds] = useState<string[]>(initial.masterIds ?? []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setUiStatus({ kind: "idle" });
    const payload: ServiceFormInput = {
      id,
      categoryId,
      nameEn,
      nameRu,
      nameBy,
      blurbEn,
      blurbRu,
      blurbBy,
      includes,
      priceCents: majorToCents(priceMajor),
      durationMinutes: Number(durationMinutes) || 0,
      sortOrder: initial.sortOrder,
      status,
      masterIds,
    };
    const parsed = serviceFormSchema.safeParse(payload);
    if (!parsed.success) {
      const issues: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!(path in issues)) issues[path] = issue.message;
      }
      setUiStatus({ kind: "validation", issues });
      return;
    }
    startTransition(async () => {
      const result = await onSubmit(parsed.data);
      if (result.ok) setUiStatus({ kind: "saved" });
      else setUiStatus({ kind: "error", message: result.error });
    });
  }

  const issues =
    uiStatus.kind === "validation"
      ? uiStatus.issues
      : ({} as Record<string, string>);
  const errFor = (path: string): string | null => {
    const code = issues[path];
    if (!code) return null;
    if (code === "required") return t("validation_required");
    if (code === "slug_invalid") return t("validation_slug_invalid");
    if (code === "slug_required") return t("validation_required");
    return code;
  };

  return (
    <div className="flex flex-col gap-6 px-[22px] py-6">
      <h1 className="font-display text-[32px] font-light italic leading-tight">
        {mode === "create" ? t("title_new_service") : t("title_edit_service")}
      </h1>

      {photoSlot ? (
        <div>
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
            {t("label_photo")}
          </div>
          {photoSlot}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Field
          id="svc-slug"
        label={t("label_slug")}
        hint={t("label_slug_hint")}
        error={errFor("id")}
      >
        <input
          id="svc-slug"
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value)}
          disabled={mode === "edit"}
          className={inputClass}
        />
      </Field>

      <Field
        id="svc-category"
        label={t("label_category")}
        error={errFor("categoryId")}
      >
        <select
          id="svc-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={inputClass}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field id="svc-status" label={t("label_status")}>
        <select
          id="svc-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          className={inputClass}
        >
          <option value="draft">{t("status_draft")}</option>
          <option value="published">{t("status_published")}</option>
          <option value="archived">{t("status_archived")}</option>
        </select>
      </Field>

      <Field
        id="svc-name-en"
        label={t("label_name_en")}
        error={errFor("nameEn")}
      >
        <input
          id="svc-name-en"
          type="text"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field
        id="svc-name-ru"
        label={t("label_name_ru")}
        error={errFor("nameRu")}
      >
        <input
          id="svc-name-ru"
          type="text"
          value={nameRu}
          onChange={(e) => setNameRu(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field
        id="svc-name-be"
        label={t("label_name_by")}
        error={errFor("nameBy")}
      >
        <input
          id="svc-name-be"
          type="text"
          value={nameBy}
          onChange={(e) => setNameBe(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field
        id="svc-blurb-en"
        label={t("label_blurb_en")}
        error={errFor("blurbEn")}
      >
        <textarea
          id="svc-blurb-en"
          value={blurbEn}
          onChange={(e) => setBlurbEn(e.target.value)}
          className={textareaClass}
        />
      </Field>

      <Field
        id="svc-blurb-ru"
        label={t("label_blurb_ru")}
        error={errFor("blurbRu")}
      >
        <textarea
          id="svc-blurb-ru"
          value={blurbRu}
          onChange={(e) => setBlurbRu(e.target.value)}
          className={textareaClass}
        />
      </Field>

      <Field
        id="svc-blurb-be"
        label={t("label_blurb_by")}
        error={errFor("blurbBy")}
      >
        <textarea
          id="svc-blurb-be"
          value={blurbBy}
          onChange={(e) => setBlurbBe(e.target.value)}
          className={textareaClass}
        />
      </Field>

      <IncludesFieldset items={includes} onChange={setIncludes} />

      {masters ? (
        <MasterPicker
          masters={masters}
          value={masterIds}
          onChange={setMasterIds}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <Field
          id="svc-price"
          label={t("label_price")}
          error={errFor("priceCents")}
        >
          <input
            id="svc-price"
            type="text"
            inputMode="decimal"
            value={priceMajor}
            onChange={(e) => setPriceMajor(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          id="svc-duration"
          label={t("label_duration")}
          error={errFor("durationMinutes")}
        >
          <input
            id="svc-duration"
            type="number"
            inputMode="numeric"
            min={1}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={buttonClassName({ variant: "gold", size: "md" })}
        >
          {t("cta_save")}
        </button>
        {uiStatus.kind === "saved" ? (
          <span role="status" className="text-[12px] text-text-2">
            {t("saved")}
          </span>
        ) : uiStatus.kind === "error" ? (
          <span role="alert" className="text-[12px] text-accent">
            {t("save_failed", { error: uiStatus.message })}
          </span>
        ) : null}
      </div>
      </form>
    </div>
  );
}

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
        <span className="text-[11px] text-text-3">{hint}</span>
      ) : null}
      {error ? (
        <span className={cn("text-[12px] text-accent")} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
