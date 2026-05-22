"use server";

import { revalidatePath } from "next/cache";
import { restoreMaster } from "@/db/masters-mutations";
import { gateAdmin, type ActionResult } from "./_common";

export async function restoreMasterAction(id: string): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  const result = await restoreMaster(id);
  revalidatePath("/", "layout");
  if (result.ok) return { ok: true };
  return { ok: false, error: result.error };
}
