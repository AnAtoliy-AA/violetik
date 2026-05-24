"use server";

import { revalidatePath } from "next/cache";
import { restoreCategory } from "@/db/services-mutations";
import { gateAdmin, type ActionResult } from "./_common";

export async function restoreCategoryAction(
  id: string,
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const result = await restoreCategory(id, gate.updatedBy);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/", "layout");
  return { ok: true };
}
