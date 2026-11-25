import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { qrPng } from "@/lib/qr";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "attendance")) return new Response("Not allowed", { status: 403 });
  return new Response(new Uint8Array(await qrPng()), { headers: { "Content-Type": "image/png", "Content-Disposition": 'attachment; filename="kanos-meeting-sign-in-qr.png"', "Cache-Control": "no-store" } });
}
