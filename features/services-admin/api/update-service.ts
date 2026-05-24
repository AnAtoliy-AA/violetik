"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { serviceFormSchema } from "@/entities/service/model/schema";
import { updateService } from "@/db/services-mutations";
import { gateAdmin, joinIssues, type ActionResult } from "./_common";

const updateSchema = serviceFormSchema.omit({ id: true });

export async function updateServiceAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const idCheck = z.string().min(1).safeParse(id);
  if (!idCheck.success) return { ok: false, error: "invalid_id" };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: joinIssues(parsed.error) };
  }

  const result = await updateService(id, {
    ...parsed.data,
    updatedBy: gate.updatedBy,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/", "layout");
  return { ok: true };
}
