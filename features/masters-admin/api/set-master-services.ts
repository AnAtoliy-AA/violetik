"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { slugSchema } from "@/entities/service/model/schema";
import { setMasterServices } from "@/db/masters-mutations";
import { gateAdmin, joinIssues, type ActionResult } from "./_common";

const serviceIdsSchema = z.array(slugSchema).max(200);

export async function setMasterServicesAction(
  masterId: string,
  serviceIds: unknown,
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  const parsed = serviceIdsSchema.safeParse(serviceIds);
  if (!parsed.success) {
    return { ok: false, error: joinIssues(parsed.error) };
  }
  const result = await setMasterServices(masterId, parsed.data);
  revalidatePath("/", "layout");
  if (result.ok) return { ok: true };
  return { ok: false, error: result.error };
}
