"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/shared/lib/auth-server";
import {
  adminSoftDeleteTestimonial,
  decideTestimonial,
  resolveTestimonialEdit,
  resolveTestimonialRemoval,
} from "@/db/testimonials";
import { dispatchNotification } from "@/shared/lib/notifications";

async function notifyTestimonialOwner(row: {
  id: string;
  userId: string;
  status: string;
}) {
  await dispatchNotification(row.userId, "testimonial_decision", {
    titleKey: "category_testimonial_decision_push_title",
    bodyKey: "category_testimonial_decision_push_body",
    bodyParams: { status: row.status },
    url: "/profile",
    meta: { testimonialId: row.id },
  });
}

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
  await notifyTestimonialOwner(row);
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
  await notifyTestimonialOwner(row);
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export async function approveEditRequest(
  id: string,
): Promise<AdminTestimonialActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await resolveTestimonialEdit(id, gate.user.id, true);
  if (!row) return { ok: false, reason: "not-found" };
  await notifyTestimonialOwner(row);
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export async function rejectEditRequest(
  id: string,
): Promise<AdminTestimonialActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await resolveTestimonialEdit(id, gate.user.id, false);
  if (!row) return { ok: false, reason: "not-found" };
  await notifyTestimonialOwner(row);
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export async function approveRemovalRequest(
  id: string,
): Promise<AdminTestimonialActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await resolveTestimonialRemoval(id, gate.user.id, true);
  if (!row) return { ok: false, reason: "not-found" };
  await notifyTestimonialOwner(row);
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export async function rejectRemovalRequest(
  id: string,
): Promise<AdminTestimonialActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await resolveTestimonialRemoval(id, gate.user.id, false);
  if (!row) return { ok: false, reason: "not-found" };
  await notifyTestimonialOwner(row);
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export async function adminDeleteTestimonial(
  id: string,
): Promise<AdminTestimonialActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, reason: gate.reason };
  const row = await adminSoftDeleteTestimonial(id, gate.user.id);
  if (!row) return { ok: false, reason: "not-found" };
  await notifyTestimonialOwner(row);
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}
