import { eq } from "drizzle-orm";
import { db, schema } from "./index";

/**
 * Pure DB writes for onboarding slides. No auth — server actions gate the
 * caller. Mirrors `db/gallery-mutations.ts` for db-null and missing-table
 * tolerance.
 */

function isMissingTable(error: unknown): boolean {
  let cur: unknown = error;
  for (let depth = 0; depth < 5 && cur && typeof cur === "object"; depth += 1) {
    if ("code" in cur && (cur as { code: unknown }).code === "42P01") {
      return true;
    }
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

export type MutationResult =
  | { ok: true }
  | { ok: false; error: "db_unavailable" };

const DB_UNAVAILABLE: MutationResult = { ok: false, error: "db_unavailable" };

function withGuard<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  return fn().catch((error) => {
    if (isMissingTable(error)) return fallback;
    throw error;
  });
}

export async function createOnboardingSlide(
  input: schema.NewOnboardingSlide & { updatedBy?: string | null },
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!.insert(schema.onboardingSlides).values({
      ...input,
      sortOrder: input.sortOrder ?? 0,
      variant: input.variant ?? 1,
    });
    return { ok: true };
  }, DB_UNAVAILABLE);
}

export async function updateOnboardingSlide(
  id: string,
  patch: Partial<schema.NewOnboardingSlide> & { updatedBy?: string | null },
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!
      .update(schema.onboardingSlides)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.onboardingSlides.id, id));
    return { ok: true };
  }, DB_UNAVAILABLE);
}

/**
 * Hard-deletes a slide and returns its (possibly null) blob `src` so the
 * caller can purge it from Vercel Blob.
 */
export async function deleteOnboardingSlide(
  id: string,
): Promise<{ deletedSrc: string | null } | null> {
  if (!db) return null;
  return withGuard<{ deletedSrc: string | null } | null>(async () => {
    const rows = await db!
      .select({ src: schema.onboardingSlides.src })
      .from(schema.onboardingSlides)
      .where(eq(schema.onboardingSlides.id, id))
      .limit(1);
    await db!
      .delete(schema.onboardingSlides)
      .where(eq(schema.onboardingSlides.id, id));
    return { deletedSrc: rows[0]?.src ?? null };
  }, null);
}

export async function reorderOnboardingSlides(
  orderedIds: readonly string[],
): Promise<MutationResult> {
  if (!db) return DB_UNAVAILABLE;
  return withGuard<MutationResult>(async () => {
    await db!.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i += 1) {
        await tx
          .update(schema.onboardingSlides)
          .set({ sortOrder: i + 1, updatedAt: new Date() })
          .where(eq(schema.onboardingSlides.id, orderedIds[i]!));
      }
    });
    return { ok: true };
  }, DB_UNAVAILABLE);
}
