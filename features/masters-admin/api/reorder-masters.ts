"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { slugSchema } from "@/entities/service/model/schema";
import { reorderMasters } from "@/db/masters-mutations";
import { gateAdmin, joinIssues, type ActionResult } from "./_common";

const idsSchema = z.array(slugSchema).min(1).max(200);

export async function reorderMastersAction(
  ids: unknown,
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) {
    return { ok: false, error: joinIssues(parsed.error) };
  }
  const result = await reorderMasters(parsed.data);
  revalidatePath("/", "layout");
  if (result.ok) return { ok: true };
  return { ok: false, error: result.error };
}
