"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import {
  cancelTestimonialChangeRequest,
  requestTestimonialEdit,
  requestTestimonialRemoval,
} from "@/db/testimonials";
import { listAdminUserIds } from "@/db/users-admin";
import { dispatchNotification } from "@/shared/lib/notifications";

async function notifyAdminsOfChangeRequest(
  testimonialId: string,
  customerLabel: string,
  kind: "edit" | "removal",
) {
  const adminIds = await listAdminUserIds();
  for (const adminId of adminIds) {
    await dispatchNotification(adminId, "testimonial_submitted", {
      titleKey: "category_testimonial_submitted_push_title",
      bodyKey: "category_testimonial_submitted_push_body",
      bodyParams: { customer: customerLabel },
      url: "/admin/testimonials",
      meta: { testimonialId, kind },
    });
  }
}

export type ChangeRequestActionResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "unauthenticated"
        | "not_found"
        | "not_owner"
        | "not_approved"
        | "request_already_pending"
        | "body_required"
        | "body_too_long"
        | "unknown";
    };

const editSchema = z.object({
  testimonialId: z.string().min(1),
  body: z.string(),
});

export async function requestTestimonialEditAction(
  raw: { testimonialId: string; body: string },
): Promise<ChangeRequestActionResult> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, reason: "unauthenticated" };
    const parsed = editSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, reason: "not_found" };
    const body = parsed.data.body.trim();
    if (body.length === 0) return { ok: false, reason: "body_required" };
    if (body.length > 800) return { ok: false, reason: "body_too_long" };
    const result = await requestTestimonialEdit(
      parsed.data.testimonialId,
      user.id,
      body,
    );
    if (!result) return { ok: false, reason: "unknown" };
    if (!result.ok) return { ok: false, reason: result.reason };
    await notifyAdminsOfChangeRequest(
      parsed.data.testimonialId,
      user.firstName ?? user.id,
      "edit",
    );
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[requestTestimonialEditAction] unexpected:", err);
    return { ok: false, reason: "unknown" };
  }
}

const idSchema = z.object({ testimonialId: z.string().min(1) });

export async function requestTestimonialRemovalAction(
  raw: { testimonialId: string },
): Promise<ChangeRequestActionResult> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, reason: "unauthenticated" };
    const parsed = idSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, reason: "not_found" };
    const result = await requestTestimonialRemoval(
      parsed.data.testimonialId,
      user.id,
    );
    if (!result) return { ok: false, reason: "unknown" };
    if (!result.ok) return { ok: false, reason: result.reason };
    await notifyAdminsOfChangeRequest(
      parsed.data.testimonialId,
      user.firstName ?? user.id,
      "removal",
    );
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[requestTestimonialRemovalAction] unexpected:", err);
    return { ok: false, reason: "unknown" };
  }
}

export async function cancelTestimonialChangeRequestAction(
  raw: { testimonialId: string },
): Promise<ChangeRequestActionResult> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, reason: "unauthenticated" };
    const parsed = idSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, reason: "not_found" };
    const row = await cancelTestimonialChangeRequest(
      parsed.data.testimonialId,
      user.id,
    );
    if (!row) return { ok: false, reason: "not_found" };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[cancelTestimonialChangeRequestAction] unexpected:", err);
    return { ok: false, reason: "unknown" };
  }
}
