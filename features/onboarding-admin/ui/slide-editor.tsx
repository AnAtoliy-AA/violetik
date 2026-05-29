"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import {
  onboardingSlideFormSchema,
  type OnboardingSlideFormInput,
} from "@/entities/onboarding";
import { cn } from "@/shared/lib/cn";
import { buttonClassName } from "@/shared/ui/button";
import {
  AdminImageUpload,
  type AdminImageUploadLabels,
} from "@/shared/ui/admin-image-upload";

export interface OnboardingSlideEditorInitial {
  id: string;
  eyebrowEn: string;
  eyebrowRu: string;
  eyebrowBy: string;
  titleEn: string;
  titleRu: string;
  titleBy: string;
  bodyEn: string;
  bodyRu: string;
  bodyBy: string;
  src: string | null;
  width: number | null;
  height: number | null;
  variant: number;
  sortOrder: number;
}

export type OnboardingSlideEditorSubmit = (
  input: OnboardingSlideFormInput,
) => Promise<{ ok: true } | { ok: false; error: string }>;

export interface OnboardingSlideEditorProps {
  mode: "create" | "edit";
  initial: OnboardingSlideEditorInitial;
  storageConfigured: boolean;
  onSubmit: OnboardingSlideEditorSubmit;
}

type UiStatus =
  | { kind: "idle" }
  | { kind: "saved" }
  | { kind: "validation"; issues: Record<string, string> }
  | { kind: "error"; message: string };

export function OnboardingSlideEditor({
  mode,
  initial,
  storageConfigured,
  onSubmit,
}: OnboardingSlideEditorProps) {
  const t = useTranslations("AdminOnboarding");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<UiStatus>({ kind: "idle" });

  const [v, setV] = useState(initial);
  const [src, setSrc] = useState<string | null>(initial.src);
  const [width, setWidth] = useState<number | null>(initial.width);
  const [height, setHeight] = useState<number | null>(initial.height);

  const set = (key: keyof OnboardingSlideEditorInitial) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setV((prev) => ({ ...prev, [key]: e.target.value }));

  const uploadLabels: AdminImageUploadLabels = {
    fileLabel: t("label_file"),
    upload: t("upload"),
    uploading: t("uploading"),
    remove: t("remove_image"),
    uploaded: t("uploaded"),
    errorTooLarge: t("error_too_large"),
    errorFailed: t("error_failed"),
    storageNotConfigured: t("storage_not_configured"),
    idRequired: t("validation_id_required"),
  };

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus({ kind: "idle" });
    const payload = {
      id: v.id,
      eyebrowEn: v.eyebrowEn,
      eyebrowRu: v.eyebrowRu,
      eyebrowBy: v.eyebrowBy,
      titleEn: v.titleEn,
      titleRu: v.titleRu,
      titleBy: v.titleBy,
      bodyEn: v.bodyEn,
      bodyRu: v.bodyRu,
      bodyBy: v.bodyBy,
      src: src ?? undefined,
      width: width ?? undefined,
      height: height ?? undefined,
      variant: v.variant,
      sortOrder: initial.sortOrder,
    };
    const parsed = onboardingSlideFormSchema.safeParse(payload);
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
    if (code === "required" || code === "slug_required")
      return t("validation_required");
    if (code === "slug_invalid") return t("validation_slug_invalid");
    return code;
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-[22px] py-6">
      <h1 className="font-display text-[32px] font-light italic leading-tight">
        {mode === "create" ? t("title_new_slide") : t("title_edit_slide")}
      </h1>

      <Field id="slide-slug" label={t("label_slug")} hint={t("label_slug_hint")} error={errFor("id")}>
        <input id="slide-slug" type="text" value={v.id} onChange={set("id")} disabled={mode === "edit"} className={inputClass} />
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">{t("label_image")}</span>
        <AdminImageUpload
          keyKind="onboarding"
          id={v.id}
          currentSrc={src}
          storageConfigured={storageConfigured}
          labels={uploadLabels}
          onUploaded={({ src: s, width: w, height: h }) => { setSrc(s); setWidth(w); setHeight(h); }}
          onRemoved={() => { setSrc(null); setWidth(null); setHeight(null); }}
        />
        <span className="text-[11px] text-text-3">{t("label_image_hint")}</span>
      </div>

      <Field id="slide-variant" label={t("label_variant")} hint={t("label_variant_hint")} error={errFor("variant")}>
        <input id="slide-variant" type="number" min={0} max={5} value={v.variant} onChange={(e) => setV((p) => ({ ...p, variant: Number(e.target.value) }))} className={inputClass} />
      </Field>

      <Field id="slide-eb-en" label={t("label_eyebrow_en")} error={errFor("eyebrowEn")}>
        <input id="slide-eb-en" type="text" value={v.eyebrowEn} onChange={set("eyebrowEn")} className={inputClass} />
      </Field>
      <Field id="slide-eb-ru" label={t("label_eyebrow_ru")} error={errFor("eyebrowRu")}>
        <input id="slide-eb-ru" type="text" value={v.eyebrowRu} onChange={set("eyebrowRu")} className={inputClass} />
      </Field>
      <Field id="slide-eb-by" label={t("label_eyebrow_by")} error={errFor("eyebrowBy")}>
        <input id="slide-eb-by" type="text" value={v.eyebrowBy} onChange={set("eyebrowBy")} className={inputClass} />
      </Field>

      <Field id="slide-ti-en" label={t("label_title_en")} error={errFor("titleEn")}>
        <input id="slide-ti-en" type="text" value={v.titleEn} onChange={set("titleEn")} className={inputClass} />
      </Field>
      <Field id="slide-ti-ru" label={t("label_title_ru")} error={errFor("titleRu")}>
        <input id="slide-ti-ru" type="text" value={v.titleRu} onChange={set("titleRu")} className={inputClass} />
      </Field>
      <Field id="slide-ti-by" label={t("label_title_by")} error={errFor("titleBy")}>
        <input id="slide-ti-by" type="text" value={v.titleBy} onChange={set("titleBy")} className={inputClass} />
      </Field>

      <Field id="slide-bo-en" label={t("label_body_en")} error={errFor("bodyEn")}>
        <textarea id="slide-bo-en" rows={3} value={v.bodyEn} onChange={set("bodyEn")} className={inputClass} />
      </Field>
      <Field id="slide-bo-ru" label={t("label_body_ru")} error={errFor("bodyRu")}>
        <textarea id="slide-bo-ru" rows={3} value={v.bodyRu} onChange={set("bodyRu")} className={inputClass} />
      </Field>
      <Field id="slide-bo-by" label={t("label_body_by")} error={errFor("bodyBy")}>
        <textarea id="slide-bo-by" rows={3} value={v.bodyBy} onChange={set("bodyBy")} className={inputClass} />
      </Field>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className={buttonClassName({ variant: "gold", size: "md" })}>
          {t("cta_save")}
        </button>
        {status.kind === "saved" ? (
          <span role="status" className="text-[12px] text-text-2">{t("saved")}</span>
        ) : status.kind === "error" ? (
          <span role="alert" className="text-[12px] text-accent">{t("save_failed", { error: status.message })}</span>
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
  return (
    <div className="flex flex-col gap-1.5 text-[13px] text-text-2">
      <label htmlFor={id} className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
        {label}
      </label>
      {children}
      {hint ? <span className="text-[11px] text-text-3">{hint}</span> : null}
      {error ? (
        <span className={cn("text-[12px] text-accent")} role="alert">{error}</span>
      ) : null}
    </div>
  );
}
