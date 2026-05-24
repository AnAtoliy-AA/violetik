"use server";

import { revalidatePath } from "next/cache";
import { archiveMaster } from "@/db/masters-mutations";
import { gateAdmin, type ActionResult } from "./_common";

export async function archiveMasterAction(id: string): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  const result = await archiveMaster(id);
  revalidatePath("/", "layout");
  if (result.ok) return { ok: true };
  if (result.error === "master_has_upcoming_bookings") {
    return {
      ok: false,
      error: result.error,
      blockingCount: result.blockingCount,
    };
  }
  return { ok: false, error: result.error };
}
