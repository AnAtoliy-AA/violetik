import { requireAdmin } from "@/shared/lib/auth-server";
import { countPendingBookings } from "@/db/bookings";

export async function GET(): Promise<Response> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    const status = gate.reason === "unauthorized" ? 401 : 403;
    return Response.json({ error: gate.reason }, { status });
  }
  const count = await countPendingBookings();
  return Response.json({ count }, { headers: { "Cache-Control": "no-store" } });
}
