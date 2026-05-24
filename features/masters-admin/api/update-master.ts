"use server";

import { revalidatePath } from "next/cache";
import { masterFormSchema } from "@/entities/master";
import { updateMaster, setMasterServices } from "@/db/masters-mutations";
import { gateAdmin, joinIssues, type ActionResult } from "./_common";

const patchSchema = masterFormSchema.omit({ id: true });

export async function updateMasterAction(
  id: string,
  patch: unknown,
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: joinIssues(parsed.error) };
  }
  const { serviceIds, ...row } = parsed.data;
  const updated = await updateMaster(id, row);
  if (!updated.ok) return { ok: false, error: updated.error };
  const linked = await setMasterServices(id, serviceIds);
  if (!linked.ok) return { ok: false, error: linked.error };
  revalidatePath("/", "layout");
  return { ok: true };
}
