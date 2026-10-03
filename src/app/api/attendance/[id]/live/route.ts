import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { livePayload } from "@/lib/attendance-live";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "attendance")) return new Response("Forbidden", { status: 403 });
  const p = await livePayload((await params).id);
  if (!p) return new Response("Not found", { status: 404 });
  return Response.json(p, { headers: { "Cache-Control": "no-store" } });
}
