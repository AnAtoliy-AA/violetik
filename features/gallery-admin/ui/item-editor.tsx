"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import {
  galleryItemFormSchema,
  type GalleryItemFormInput,
} from "@/entities/gallery";
import { cn } from "@/shared/lib/cn";
import { buttonClassName } from "@/shared/ui/button";
import {
  AdminImageUpload,
  type AdminImageUploadLabels,
} from "@/shared/ui/admin-image-upload";

export interface GalleryCategoryOption {
  id: string;
  name: string;
}

export interface GalleryItemEditorInitial {
  id: string;
  categoryId: string;
  captionEn: string;
  captionRu: string;
  captionBy: string;
  alt: string;
  src: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
}

export type GalleryItemEditorSubmit = (
  input: GalleryItemFormInput,
) => Promise<{ ok: true } | { ok: false; error: string }>;

export interface GalleryItemEditorProps {
  mode: "create" | "edit";
  initial: GalleryItemEditorInitial;
  categories: readonly GalleryCategoryOption[];
  storageConfigured: boolean;
  onSubmit: GalleryItemEditorSubmit;
}

type UiStatus =
  | { kind: "idle" }
  | { kind: "saved" }
  | { kind: "validation"; issues: Record<string, string> }
  | { kind: "error"; message: string };

export function GalleryItemEditor({
  mode,
  initial,
  categories,
  storageConfigured,
  onSubmit,
}: GalleryItemEditorProps) {
  const t = useTranslations("AdminGallery");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<UiStatus>({ kind: "idle" });

  const [id, setId] = useState(initial.id);
  const [categoryId, setCategoryId] = useState(
    initial.categoryId || categories[0]?.id || "",
  );
  const [captionEn, setCaptionEn] = useState(initial.captionEn);
  const [captionRu, setCaptionRu] = useState(initial.captionRu);
  const [captionBy, setCaptionBy] = useState(initial.captionBy);
  const [alt, setAlt] = useState(initial.alt);
  const [src, setSrc] = useState<string | null>(initial.src);
  const [width, setWidth] = useState<number | null>(initial.width);
  const [height, setHeight] = useState<number | null>(initial.height);

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
      id,
      categoryId,
      captionEn: captionEn || undefined,
      captionRu: captionRu || undefined,
      captionBy: captionBy || undefined,
      alt: alt || undefined,
      src: src ?? undefined,
      width: width ?? undefined,
      height: height ?? undefined,
      sortOrder: initial.sortOrder,
    };
    const parsed = galleryItemFormSchema.safeParse(payload);
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
        {mode === "create" ? t("title_new_item") : t("title_edit_item")}
      </h1>

      <Field id="gitem-slug" label={t("label_slug")} hint={t("label_slug_hint")} error={errFor("id")}>
        <input id="gitem-slug" type="text" value={id} onChange={(e) => setId(e.target.value)} disabled={mode === "edit"} className={inputClass} />
      </Field>

      <Field id="gitem-cat" label={t("label_category")} error={errFor("categoryId")}>
        <select id="gitem-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("label_image")}
        </span>
        <AdminImageUpload
          keyKind="gallery"
          id={id}
          currentSrc={src}
          storageConfigured={storageConfigured}
          labels={uploadLabels}
          onUploaded={({ src: s, width: w, height: h }) => {
            setSrc(s);
            setWidth(w);
            setHeight(h);
          }}
          onRemoved={() => {
            setSrc(null);
            setWidth(null);
            setHeight(null);
          }}
        />
        <span className="text-[11px] text-text-3">{t("label_image_hint")}</span>
      </div>

      <Field id="gitem-alt" label={t("label_alt")} hint={t("label_alt_hint")} error={errFor("alt")}>
        <input id="gitem-alt" type="text" value={alt} onChange={(e) => setAlt(e.target.value)} className={inputClass} />
      </Field>

      <Field id="gitem-cap-en" label={t("label_caption_en")} error={errFor("captionEn")}>
        <input id="gitem-cap-en" type="text" value={captionEn} onChange={(e) => setCaptionEn(e.target.value)} className={inputClass} />
      </Field>
      <Field id="gitem-cap-ru" label={t("label_caption_ru")} error={errFor("captionRu")}>
        <input id="gitem-cap-ru" type="text" value={captionRu} onChange={(e) => setCaptionRu(e.target.value)} className={inputClass} />
      </Field>
      <Field id="gitem-cap-by" label={t("label_caption_by")} error={errFor("captionBy")}>
        <input id="gitem-cap-by" type="text" value={captionBy} onChange={(e) => setCaptionBy(e.target.value)} className={inputClass} />
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
