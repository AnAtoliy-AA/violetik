import "server-only";
import { auth } from "@/auth";
import { getUserById } from "@/db/users";
import type { User } from "@/db/schema";

export type RequireAdminResult =
  | { ok: true; user: User }
  | { ok: false; reason: "unauthorized" | "forbidden" };

export async function requireAdmin(): Promise<RequireAdminResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, reason: "unauthorized" };
  const user = await getUserById(session.user.id);
  if (!user || user.role !== "admin") return { ok: false, reason: "forbidden" };
  return { ok: true, user };
}

export async function getCurrentSessionUser(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getUserById(session.user.id);
}
