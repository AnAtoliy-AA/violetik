"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { reorderServices } from "@/db/services-mutations";
import { gateAdmin, joinIssues, type ActionResult } from "./_common";

const ids = z.array(z.string().min(1)).min(1);

export async function reorderServicesAction(
  orderedIds: unknown,
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = ids.safeParse(orderedIds);
  if (!parsed.success) return { ok: false, error: joinIssues(parsed.error) };

  const result = await reorderServices(parsed.data);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/", "layout");
  return { ok: true };
}
