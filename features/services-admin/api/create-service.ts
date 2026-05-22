"use server";

import { revalidatePath } from "next/cache";
import { serviceFormSchema } from "@/entities/service/model/schema";
import { createService } from "@/db/services-mutations";
import { gateAdmin, joinIssues, type ActionResult } from "./_common";

function slugifyEn(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/**
 * Create accepts either a user-provided slug or auto-derives one from
 * `nameEn` when `id` is missing/empty. Once created, the id is frozen
 * (updateServiceAction omits it from the patch schema).
 */
export async function createServiceAction(
  input: unknown,
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const inputWithSlug =
    typeof input === "object" &&
    input !== null &&
    "id" in input &&
    typeof (input as { id?: string }).id === "string" &&
    (input as { id: string }).id.length > 0
      ? input
      : {
          ...(input as object),
          id: slugifyEn((input as { nameEn?: string }).nameEn ?? ""),
        };

  const parsed = serviceFormSchema.safeParse(inputWithSlug);
  if (!parsed.success) {
    return { ok: false, error: joinIssues(parsed.error) };
  }

  const result = await createService({
    ...parsed.data,
    updatedBy: gate.updatedBy,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/", "layout");
  return { ok: true };
}
