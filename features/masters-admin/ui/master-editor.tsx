"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { masterFormSchema } from "@/entities/master/model/schema";
import type { MasterFormInput } from "@/entities/master/model/schema";
import { cn } from "@/shared/lib/cn";
import { buttonClassName } from "@/shared/ui/button";
import { SpecialtyPicker } from "./specialty-picker";

type Status = "draft" | "published" | "archived";

export interface MasterEditorInitial {
  id: string;
  nameEn: string;
  nameRu: string;
  nameBe: string;
  roleEn: string;
  roleRu: string;
  roleBe: string;
  bioEn: string;
  bioRu: string;
  bioBe: string;
  quoteEn: string;
  quoteRu: string;
  quoteBe: string;
  years: number;
  setsLabel: string;
  sortOrder: number;
  status: Status;
  serviceIds: string[];
}

export interface ServiceOption {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

export type MasterEditorSubmit = (
  patch: MasterFormInput,
) => Promise<{ ok: true } | { ok: false; error: string }>;

export interface MasterEditorProps {
  mode: "create" | "edit";
  initial: MasterEditorInitial;
  services: readonly ServiceOption[];
  onSubmit: MasterEditorSubmit;
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

export function MasterEditor({
  mode,
  initial,
  services,
  onSubmit,
  photoSlot,
}: MasterEditorProps) {
  const t = useTranslations("AdminMasters");
  const [isPending, startTransition] = useTransition();
  const [uiStatus, setUiStatus] = useState<UiStatus>({ kind: "idle" });

  const [id, setId] = useState(initial.id);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [nameRu, setNameRu] = useState(initial.nameRu);
  const [nameBe, setNameBe] = useState(initial.nameBe);
  const [roleEn, setRoleEn] = useState(initial.roleEn);
  const [roleRu, setRoleRu] = useState(initial.roleRu);
  const [roleBe, setRoleBe] = useState(initial.roleBe);
  const [bioEn, setBioEn] = useState(initial.bioEn);
  const [bioRu, setBioRu] = useState(initial.bioRu);
  const [bioBe, setBioBe] = useState(initial.bioBe);
  const [quoteEn, setQuoteEn] = useState(initial.quoteEn);
  const [quoteRu, setQuoteRu] = useState(initial.quoteRu);
  const [quoteBe, setQuoteBe] = useState(initial.quoteBe);
  const [years, setYears] = useState(String(initial.years));
  const [setsLabel, setSetsLabel] = useState(initial.setsLabel);
  const [status, setStatus] = useState<Status>(initial.status);
  const [serviceIds, setServiceIds] = useState<string[]>(initial.serviceIds);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setUiStatus({ kind: "idle" });
    const payload: MasterFormInput = {
      id,
      nameEn,
      nameRu,
      nameBe,
      roleEn,
      roleRu,
      roleBe,
      bioEn,
      bioRu,
      bioBe,
      quoteEn,
      quoteRu,
      quoteBe,
      years: Number(years) || 0,
      setsLabel,
      sortOrder: initial.sortOrder,
      status,
      serviceIds,
    };
    const parsed = masterFormSchema.safeParse(payload);
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
        {mode === "create" ? t("title_new_master") : t("title_edit_master")}
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
          id="mst-slug"
          label={t("label_slug")}
          hint={t("label_slug_hint")}
          error={errFor("id")}
        >
          <input
            id="mst-slug"
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            disabled={mode === "edit"}
            className={inputClass}
          />
        </Field>

        <Field id="mst-status" label={t("label_status")}>
          <select
            id="mst-status"
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
          id="mst-years"
          label={t("label_years")}
          error={errFor("years")}
        >
          <input
            id="mst-years"
            type="number"
            inputMode="numeric"
            min={0}
            max={80}
            value={years}
            onChange={(e) => setYears(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field
          id="mst-sets"
          label={t("label_sets")}
          hint={t("label_sets_hint")}
          error={errFor("setsLabel")}
        >
          <input
            id="mst-sets"
            type="text"
            value={setsLabel}
            onChange={(e) => setSetsLabel(e.target.value)}
            className={inputClass}
            maxLength={80}
          />
        </Field>

        <Field
          id="mst-name-en"
          label={t("label_name_en")}
          error={errFor("nameEn")}
        >
          <input
            id="mst-name-en"
            type="text"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          id="mst-name-ru"
          label={t("label_name_ru")}
          error={errFor("nameRu")}
        >
          <input
            id="mst-name-ru"
            type="text"
            value={nameRu}
            onChange={(e) => setNameRu(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          id="mst-name-be"
          label={t("label_name_be")}
          error={errFor("nameBe")}
        >
          <input
            id="mst-name-be"
            type="text"
            value={nameBe}
            onChange={(e) => setNameBe(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field
          id="mst-role-en"
          label={t("label_role_en")}
          error={errFor("roleEn")}
        >
          <input
            id="mst-role-en"
            type="text"
            value={roleEn}
            onChange={(e) => setRoleEn(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          id="mst-role-ru"
          label={t("label_role_ru")}
          error={errFor("roleRu")}
        >
          <input
            id="mst-role-ru"
            type="text"
            value={roleRu}
            onChange={(e) => setRoleRu(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          id="mst-role-be"
          label={t("label_role_be")}
          error={errFor("roleBe")}
        >
          <input
            id="mst-role-be"
            type="text"
            value={roleBe}
            onChange={(e) => setRoleBe(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field
          id="mst-bio-en"
          label={t("label_bio_en")}
          error={errFor("bioEn")}
        >
          <textarea
            id="mst-bio-en"
            value={bioEn}
            onChange={(e) => setBioEn(e.target.value)}
            className={textareaClass}
          />
        </Field>
        <Field
          id="mst-bio-ru"
          label={t("label_bio_ru")}
          error={errFor("bioRu")}
        >
          <textarea
            id="mst-bio-ru"
            value={bioRu}
            onChange={(e) => setBioRu(e.target.value)}
            className={textareaClass}
          />
        </Field>
        <Field
          id="mst-bio-be"
          label={t("label_bio_be")}
          error={errFor("bioBe")}
        >
          <textarea
            id="mst-bio-be"
            value={bioBe}
            onChange={(e) => setBioBe(e.target.value)}
            className={textareaClass}
          />
        </Field>

        <Field
          id="mst-quote-en"
          label={t("label_quote_en")}
          error={errFor("quoteEn")}
        >
          <textarea
            id="mst-quote-en"
            value={quoteEn}
            onChange={(e) => setQuoteEn(e.target.value)}
            className={textareaClass}
          />
        </Field>
        <Field
          id="mst-quote-ru"
          label={t("label_quote_ru")}
          error={errFor("quoteRu")}
        >
          <textarea
            id="mst-quote-ru"
            value={quoteRu}
            onChange={(e) => setQuoteRu(e.target.value)}
            className={textareaClass}
          />
        </Field>
        <Field
          id="mst-quote-be"
          label={t("label_quote_be")}
          error={errFor("quoteBe")}
        >
          <textarea
            id="mst-quote-be"
            value={quoteBe}
            onChange={(e) => setQuoteBe(e.target.value)}
            className={textareaClass}
          />
        </Field>

        <SpecialtyPicker
          services={services}
          value={serviceIds}
          onChange={setServiceIds}
        />

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
