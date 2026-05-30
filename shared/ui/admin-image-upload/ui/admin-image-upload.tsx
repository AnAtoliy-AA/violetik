"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import { buttonClassName } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { MAX_PHOTO_BYTES } from "@/shared/lib/photo-storage/limits";
import { buildBlobKey } from "@/shared/lib/photo-storage/keys";

export interface AdminImageUploadResult {
  src: string;
  width: number;
  height: number;
}

export interface AdminImageUploadLabels {
  fileLabel: string;
  upload: string;
  uploading: string;
  remove: string;
  uploaded: string;
  errorTooLarge: string;
  errorFailed: string;
  storageNotConfigured: string;
  idRequired: string;
}

export interface AdminImageUploadProps {
  /** Blob key namespace, e.g. "gallery" or "onboarding". */
  keyKind: string;
  /** Slug identifying the owning row; used to build the blob key. */
  id: string;
  /** Currently-stored image URL (gradient fallback shown when null). */
  currentSrc?: string | null;
  /** True when BLOB_READ_WRITE_TOKEN is present on the server. */
  storageConfigured: boolean;
  labels: AdminImageUploadLabels;
  /** Fires after a successful client-direct upload with the new URL. */
  onUploaded: (result: AdminImageUploadResult) => void;
  /** Fires when the admin clears the current image. */
  onRemoved?: () => void;
}

interface Pending {
  file: File;
  preview: string;
  width: number;
  height: number;
}

/**
 * Client-direct image upload for admin row editors (gallery items,
 * onboarding slides). Uploads straight to Vercel Blob via the shared
 * `/api/admin/photos/upload-token` route, then hands the resulting URL +
 * dimensions back to the parent form via `onUploaded`. Palette extraction
 * happens server-side in the owning create/update action.
 */
export function AdminImageUpload({
  keyKind,
  id,
  currentSrc,
  storageConfigured,
  labels,
  onUploaded,
  onRemoved,
}: AdminImageUploadProps) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedSrc, setUploadedSrc] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setUploadedSrc(null);
    const file = event.target.files?.[0];
    if (!file) {
      setPending(null);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPending(null);
      setError(labels.errorTooLarge);
      return;
    }
    const preview = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () =>
      setPending({
        file,
        preview,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    img.src = preview;
  }

  function onUploadClick() {
    if (!pending) return;
    if (!id.trim()) {
      setError(labels.idRequired);
      return;
    }
    const { file, width, height } = pending;
    const pathname = buildBlobKey(keyKind, id, file.type);
    startUpload(async () => {
      try {
        const blob = await upload(pathname, file, {
          access: "public",
          handleUploadUrl: "/api/admin/photos/upload-token",
          contentType: file.type,
        });
        setUploadedSrc(blob.url);
        onUploaded({ src: blob.url, width, height });
      } catch {
        setError(labels.errorFailed);
      }
    });
  }

  const previewSrc = pending?.preview ?? uploadedSrc ?? currentSrc ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[120px_1fr] gap-4">
        <div className="gilded glass-top relative aspect-[5/6] overflow-hidden rounded-lg bg-bg-2">
          {previewSrc ? (
            <Image
              src={previewSrc}
              alt=""
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

        <div className="flex flex-col gap-2">
          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
              {labels.fileLabel}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={onFileChange}
              disabled={!storageConfigured || isUploading}
              className="mt-1.5 block w-full rounded text-[13px] text-text-2 file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-line-strong file:bg-transparent file:px-3 file:py-1.5 file:text-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-40"
            />
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onUploadClick}
              disabled={!storageConfigured || isUploading || pending === null}
              className={cn(
                buttonClassName({ variant: "solid", size: "sm" }),
                "min-w-[100px]",
              )}
            >
              {isUploading ? labels.uploading : labels.upload}
            </button>
            {(currentSrc || uploadedSrc) && onRemoved ? (
              <button
                type="button"
                onClick={() => {
                  setPending(null);
                  setUploadedSrc(null);
                  onRemoved();
                }}
                className={buttonClassName({ variant: "ghost", size: "sm" })}
              >
                {labels.remove}
              </button>
            ) : null}
          </div>

          {!storageConfigured ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-3">
              {labels.storageNotConfigured}
            </p>
          ) : null}
          {uploadedSrc ? (
            <p
              role="status"
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent"
            >
              {labels.uploaded}
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-rose"
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
