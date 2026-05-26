"use client";

import Image from "next/image";
import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { upload } from "@vercel/blob/client";
import {
  finalizeStudioPhotoUploadAction,
  deleteStudioPhotoAction,
  type FinalizeStudioPhotoUploadResult,
  type DeleteStudioPhotoResult,
} from "../api/upload-studio-photo";
import type { PhotoSlot } from "../model/slot";
import type { ImageAsset } from "@/entities/studio";
import { buttonClassName } from "@/shared/ui/button";
import { FloatingInput } from "@/shared/ui/floating-input";
import { cn } from "@/shared/lib/cn";
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_MB,
} from "@/shared/lib/photo-storage/limits";
import { buildBlobKey } from "@/shared/lib/photo-storage/keys";

function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export interface PhotoUploadRowProps {
  slot: PhotoSlot;
  current: ImageAsset | null;
  /** True when BLOB_READ_WRITE_TOKEN is present on the server. */
  storageConfigured: boolean;
}

interface PendingFile {
  file: File;
  preview: string;
  width: number;
  height: number;
}

export function PhotoUploadRow({
  slot,
  current,
  storageConfigured,
}: PhotoUploadRowProps) {
  const t = useTranslations("Admin.photos");
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [oversizeBytes, setOversizeBytes] = useState<number | null>(null);
  const [alt, setAlt] = useState<string>(current?.alt ?? "");
  const [uploadResult, setUploadResult] =
    useState<FinalizeStudioPhotoUploadResult | null>(null);
  const [isUploading, startUpload] = useTransition();

  const [deleteState, deleteAction, deletePending] = useActionState<
    DeleteStudioPhotoResult | null,
    FormData
  >(deleteStudioPhotoAction, null);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setOversizeBytes(null);
    setUploadResult(null);
    const file = event.target.files?.[0];
    if (!file) {
      setPending(null);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPending(null);
      setOversizeBytes(file.size);
      return;
    }
    const preview = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      setPending({
        file,
        preview,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.src = preview;
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending || !alt.trim()) return;
    const { file, width, height } = pending;
    const pathname = buildBlobKey(slot.kind, slot.id, file.type);
    startUpload(async () => {
      try {
        const blob = await upload(pathname, file, {
          access: "public",
          handleUploadUrl: "/api/admin/photos/upload-token",
          contentType: file.type,
        });
        const result = await finalizeStudioPhotoUploadAction({
          slotKind: slot.kind,
          slotId: slot.id,
          alt,
          src: blob.url,
          pathname: blob.pathname,
          width,
          height,
        });
        setUploadResult(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error ?? "unknown");
        setUploadResult({
          ok: false,
          error: "upload_failed",
          detail: message,
        });
      }
    });
  }

  const previewSrc = pending?.preview ?? current?.src ?? null;
  const errorMessage = oversizeBytes
    ? t("upload_error_too_large", {
        size: formatMb(oversizeBytes),
        max: MAX_PHOTO_MB,
      })
    : uploadResult && !uploadResult.ok
      ? t(`upload_error_${uploadResult.error}` as const)
      : null;
  const errorDetail =
    uploadResult && !uploadResult.ok && !oversizeBytes
      ? uploadResult.detail
      : null;

  return (
    <article
      data-testid={`photo-row-${slot.kind}-${slot.id}`}
      className="gilded rounded-[18px] p-5"
    >
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
            · {slot.kind} ·
          </div>
          <h3 className="mt-1 font-display text-[18px] italic">{slot.label}</h3>
        </div>
        <div className="text-right font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
          {slot.hint}
        </div>
      </header>

      <div className="mt-4 grid grid-cols-[120px_1fr] gap-4">
        <div className="gilded glass-top relative aspect-[5/6] overflow-hidden rounded-lg bg-bg-2">
          {previewSrc ? (
            <Image
              src={previewSrc}
              alt={alt || slot.label}
              fill
              sizes="120px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 60% 50% at 50% 40%, #7d3a6f 0%, #1a0f1f 80%)",
              }}
            />
          )}
        </div>

        <div className="flex flex-col gap-3">
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <FloatingInput
              label={t("alt_label")}
              name="alt"
              required
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              hint={t("alt_hint")}
            />

            <label className="block">
              <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                {t("file_label")}
              </span>
              <input
                type="file"
                name="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={onFileChange}
                disabled={!storageConfigured || isUploading}
                required
                className="mt-1.5 block w-full text-[13px] text-text-2 file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-line-strong file:bg-transparent file:px-3 file:py-1.5 file:text-text file:hover:bg-surface/60 disabled:cursor-not-allowed disabled:opacity-40"
              />
            </label>

            {!storageConfigured ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
                {t("storage_not_configured")}
              </p>
            ) : null}

            {errorMessage ? (
              <div role="alert" className="space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-rose">
                  {errorMessage}
                </p>
                {errorDetail ? (
                  <p className="break-all font-mono text-[10px] text-text-3">
                    {errorDetail}
                  </p>
                ) : null}
              </div>
            ) : null}

            {uploadResult && uploadResult.ok ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
                {t("upload_success")}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={
                !storageConfigured || isUploading || pending === null
              }
              className={cn(
                buttonClassName({ variant: "solid", size: "sm" }),
                "self-start min-w-[120px]",
              )}
            >
              {isUploading ? t("uploading") : t("upload")}
            </button>
          </form>

          {current ? (
            <form
              action={deleteAction}
              className="inline-flex items-center gap-2"
            >
              <input type="hidden" name="slotKind" value={slot.kind} />
              <input type="hidden" name="slotId" value={slot.id} />
              <button
                type="submit"
                disabled={deletePending}
                className={buttonClassName({ variant: "ghost", size: "sm" })}
              >
                {deletePending ? "…" : t("remove")}
              </button>
              {deleteState && deleteState.ok ? (
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-3">
                  {t("removed")}
                </span>
              ) : null}
            </form>
          ) : null}
        </div>
      </div>
    </article>
  );
}
