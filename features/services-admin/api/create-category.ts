"use server";

import { revalidatePath } from "next/cache";
import { categoryFormSchema } from "@/entities/service/model/schema";
import { createCategory } from "@/db/services-mutations";
import { gateAdmin, joinIssues, type ActionResult } from "./_common";

export async function createCategoryAction(
  input: unknown,
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: joinIssues(parsed.error) };
  }

  const result = await createCategory({ ...parsed.data, updatedBy: gate.updatedBy });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/", "layout");
  return { ok: true };
}
