"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  deleteGoogleToken,
  getActiveGoogleToken,
} from "@/db/google-tokens";
import { revokeToken } from "@/shared/lib/google-calendar";

/**
 * Best-effort disconnect. Tells Google to revoke the refresh token, then
 * deletes the row locally regardless of revoke outcome. Re-renders the
 * admin page so the UI flips back to "Connect".
 */
export async function disconnectGoogleCalendar(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const existing = await getActiveGoogleToken();
  if (existing) {
    await revokeToken(existing.refreshToken);
    await deleteGoogleToken(existing.userId);
  }
  revalidatePath("/", "layout");
}
