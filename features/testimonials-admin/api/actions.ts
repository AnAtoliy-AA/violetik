"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/shared/lib/auth-server";
import { decideTestimonial } from "@/db/testimonials";

export type AdminTestimonialActionResult =
  | { ok: true; id: string }
  | { ok: false; reason: "unauthorized" | "forbidden" | "not-found" };

export async function approveTestimonial(
  id: string,
): Promise<AdminTestimonialActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await decideTestimonial({
    id,
    action: "approve",
    decidedBy: gate.user.id,
  });
  if (!row) return { ok: false, reason: "not-found" };
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export async function rejectTestimonial(
  id: string,
): Promise<AdminTestimonialActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await decideTestimonial({
    id,
    action: "reject",
    decidedBy: gate.user.id,
  });
  if (!row) return { ok: false, reason: "not-found" };
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}
