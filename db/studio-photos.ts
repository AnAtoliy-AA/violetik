import { and, eq } from "drizzle-orm";
import { db, schema } from "./index";
import type { ImageAsset } from "@/entities/studio";

export type StudioPhotoSlotKind = schema.PhotoSlotKind;

export interface StudioPhotoRecord {
  slotKind: StudioPhotoSlotKind;
  slotId: string;
  image: ImageAsset;
  uploadedAt: string;
  uploadedBy: string | null;
}

function rowToRecord(row: schema.StudioPhotoRow): StudioPhotoRecord {
  return {
    slotKind: row.slotKind,
    slotId: row.slotId,
    image: {
      src: row.src,
      alt: row.alt ?? undefined,
      width: row.width ?? undefined,
      height: row.height ?? undefined,
      blurDataURL: row.blurDataUrl ?? undefined,
    },
    uploadedAt: row.uploadedAt.toISOString(),
    uploadedBy: row.uploadedBy,
  };
}

/**
 * Postgres error code 42P01 = undefined_table. Surfaces when migrations
 * haven't been applied yet (CI, fresh dev DB). Treat as "no photos" so
 * the customer pages keep rendering placeholders.
 *
 * Drizzle wraps postgres errors with a `cause` chain, so we walk it.
 */
function isMissingTable(error: unknown): boolean {
  let cur: unknown = error;
  for (let depth = 0; depth < 5 && cur && typeof cur === "object"; depth += 1) {
    if (
      "code" in cur &&
      (cur as { code: unknown }).code === "42P01"
    ) {
      return true;
    }
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

/**
 * Reads every photo for a given slot kind. Returns an empty array when
 * `DATABASE_URL` is unset so the customer pages keep rendering placeholders
 * in CI / local dev without persistence. Also returns an empty array when
 * the table hasn't been migrated yet — degrading without breaking the page.
 */
export async function getStudioPhotos(
  kind: StudioPhotoSlotKind,
): Promise<StudioPhotoRecord[]> {
  if (!db) return [];
  try {
    const rows = await db
      .select()
      .from(schema.studioPhotos)
      .where(eq(schema.studioPhotos.slotKind, kind));
    return rows.map(rowToRecord);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

/** Reads one photo by (slotKind, slotId). Null when unset or no row. */
export async function getStudioPhoto(
  slotKind: StudioPhotoSlotKind,
  slotId: string,
): Promise<StudioPhotoRecord | null> {
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(schema.studioPhotos)
      .where(
        and(
          eq(schema.studioPhotos.slotKind, slotKind),
          eq(schema.studioPhotos.slotId, slotId),
        ),
      )
      .limit(1);
    return rows.length ? rowToRecord(rows[0]) : null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

export interface UpsertStudioPhotoInput {
  slotKind: StudioPhotoSlotKind;
  slotId: string;
  src: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  blurDataUrl?: string | null;
  uploadedBy?: string | null;
}

/**
 * Inserts or replaces the row for a given (slotKind, slotId). Returns the
 * **previous** row's blob URL when it existed so the caller can delete the
 * old asset from Vercel Blob. Returns null when DB isn't configured.
 */
export async function upsertStudioPhoto(
  input: UpsertStudioPhotoInput,
): Promise<{ previousSrc: string | null } | null> {
  if (!db) return null;
  const id = `${input.slotKind}:${input.slotId}`;
  const existing = await getStudioPhoto(input.slotKind, input.slotId);
  await db
    .insert(schema.studioPhotos)
    .values({
      id,
      slotKind: input.slotKind,
      slotId: input.slotId,
      src: input.src,
      alt: input.alt ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      blurDataUrl: input.blurDataUrl ?? null,
      uploadedBy: input.uploadedBy ?? null,
    })
    .onConflictDoUpdate({
      target: [schema.studioPhotos.slotKind, schema.studioPhotos.slotId],
      set: {
        src: input.src,
        alt: input.alt ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        blurDataUrl: input.blurDataUrl ?? null,
        uploadedBy: input.uploadedBy ?? null,
        uploadedAt: new Date(),
      },
    });
  return { previousSrc: existing?.image.src ?? null };
}

/**
 * Deletes the row for a given (slotKind, slotId). Returns the deleted
 * row's blob URL so the caller can delete it from Vercel Blob.
 */
export async function deleteStudioPhoto(
  slotKind: StudioPhotoSlotKind,
  slotId: string,
): Promise<{ deletedSrc: string | null } | null> {
  if (!db) return null;
  const existing = await getStudioPhoto(slotKind, slotId);
  if (!existing) return { deletedSrc: null };
  await db
    .delete(schema.studioPhotos)
    .where(
      and(
        eq(schema.studioPhotos.slotKind, slotKind),
        eq(schema.studioPhotos.slotId, slotId),
      ),
    );
  return { deletedSrc: existing.image.src };
}
