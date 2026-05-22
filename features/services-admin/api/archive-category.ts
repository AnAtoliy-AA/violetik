"use server";

import { revalidatePath } from "next/cache";
import {
  archiveCategory,
  countNonArchivedServicesInCategory,
} from "@/db/services-mutations";
import { gateAdmin } from "./_common";

export type ArchiveCategoryResult =
  | { ok: true }
  | { ok: false; error: string; blockingServiceCount?: number };

export async function archiveCategoryAction(
  id: string,
): Promise<ArchiveCategoryResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const blockingServiceCount = await countNonArchivedServicesInCategory(id);
  if (blockingServiceCount > 0) {
    return {
      ok: false,
      error: "category_has_active_services",
      blockingServiceCount,
    };
  }

  const result = await archiveCategory(id, gate.updatedBy);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/", "layout");
  return { ok: true };
}
