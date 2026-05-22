"use server";

import { revalidatePath } from "next/cache";
import { masterFormSchema } from "@/entities/master";
import { createMaster, setMasterServices } from "@/db/masters-mutations";
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

export async function createMasterAction(input: unknown): Promise<ActionResult> {
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

  const parsed = masterFormSchema.safeParse(inputWithSlug);
  if (!parsed.success) {
    return { ok: false, error: joinIssues(parsed.error) };
  }
  const { serviceIds, ...row } = parsed.data;
  const created = await createMaster(row);
  if (!created.ok) return { ok: false, error: created.error };
  const linked = await setMasterServices(parsed.data.id, serviceIds);
  if (!linked.ok) return { ok: false, error: linked.error };
  revalidatePath("/", "layout");
  return { ok: true };
}
