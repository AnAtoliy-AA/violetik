"use server";

import { revalidatePath } from "next/cache";
import { archiveService } from "@/db/services-mutations";
import { gateAdmin, type ActionResult } from "./_common";

/**
 * Archiving a service does NOT delete the matching studio_photos row.
 * Restore flips status back to "published" and the imagery comes back
 * immediately. Admin can replace/remove the photo via /admin/photos or
 * the inline slot in the service editor.
 */
export async function archiveServiceAction(id: string): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const result = await archiveService(id, gate.updatedBy);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/", "layout");
  return { ok: true };
}
