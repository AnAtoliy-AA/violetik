"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentSessionUser } from "@/shared/lib/auth-server";
import { getMasterById } from "@/db/masters";
import { createTestimonial } from "@/db/testimonials";
import { listAdminUserIds } from "@/db/users-admin";
import { dispatchNotification } from "@/shared/lib/notifications";
import { rateLimit } from "@/shared/lib/security/rate-limit";

const inputSchema = z.object({
  masterId: z.string().min(1),
  body: z.string(),
  // §11.3 — optional. Lets a customer tag a review to the specific
  // service they sat for. Service detail page filters by this when
  // present; legacy rows stay master-level.
  serviceId: z.string().min(1).optional(),
});

// Per-user cap to stop review spam.
const RATE_LIMIT = { limit: 5, windowMs: 10 * 60_000 };

export type SubmitTestimonialResult =
  | { ok: true; id: string }
  | {
      ok: false;
      reason:
        | "unauthenticated"
        | "invalid_master"
        | "body_required"
        | "body_too_long"
        | "duplicate_pending"
        | "rate_limited"
        | "unknown";
    };

export async function submitTestimonialAction(
  rawInput: { masterId: string; body: string; serviceId?: string | null },
): Promise<SubmitTestimonialResult> {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return { ok: false, reason: "unauthenticated" };

    if (!rateLimit(`testimonial:${user.id}`, RATE_LIMIT).ok) {
      return { ok: false, reason: "rate_limited" };
    }

    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) return { ok: false, reason: "invalid_master" };

    const body = parsed.data.body.trim();
    if (body.length === 0) return { ok: false, reason: "body_required" };
    if (body.length > 800) return { ok: false, reason: "body_too_long" };

    const master = await getMasterById(parsed.data.masterId);
    if (!master || master.status !== "published") {
      return { ok: false, reason: "invalid_master" };
    }

    const result = await createTestimonial({
      userId: user.id,
      masterId: parsed.data.masterId,
      body,
      serviceId: parsed.data.serviceId ?? null,
    });
    if (!result) {
      return { ok: false, reason: "unknown" };
    }
    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }

    const adminIds = await listAdminUserIds();
    for (const adminId of adminIds) {
      await dispatchNotification(adminId, "testimonial_submitted", {
        titleKey: "category_testimonial_submitted_push_title",
        bodyKey: "category_testimonial_submitted_push_body",
        bodyParams: { customer: user.firstName ?? user.id },
        url: "/admin/testimonials",
        meta: { testimonialId: result.row.id, kind: "new" },
      });
    }

    revalidatePath("/", "layout");
    return { ok: true, id: result.row.id };
  } catch (err) {
    console.error("[submitTestimonialAction] unexpected:", err);
    return { ok: false, reason: "unknown" };
  }
}
