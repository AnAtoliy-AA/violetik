import { eq } from "drizzle-orm";
import { db, schema } from "./index";

/**
 * Pure DB reads for the admin-managed onboarding carousel. Returns empty
 * arrays / null when DATABASE_URL is unset and tolerant of the table not
 * being migrated yet (42P01) — mirrors `db/gallery.ts`.
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

export async function listOnboardingSlides(): Promise<
  schema.OnboardingSlideRow[]
> {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(schema.onboardingSlides)
      .orderBy(schema.onboardingSlides.sortOrder);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function getOnboardingSlideById(
  id: string,
): Promise<schema.OnboardingSlideRow | null> {
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(schema.onboardingSlides)
      .where(eq(schema.onboardingSlides.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}
