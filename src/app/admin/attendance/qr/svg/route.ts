import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { qrSvg } from "@/lib/qr";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "attendance")) return new Response("Not allowed", { status: 403 });
  return new Response(await qrSvg(), { headers: { "Content-Type": "image/svg+xml", "Content-Disposition": 'attachment; filename="kanos-meeting-sign-in-qr.svg"', "Cache-Control": "no-store" } });
}
