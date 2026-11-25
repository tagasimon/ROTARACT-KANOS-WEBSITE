import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { makeupCardFor } from "@/lib/meeting/email";

export const dynamic = "force-dynamic";

/** A visitor's make-up card, generated on demand (never stored). */
export async function GET(_: Request, { params }: { params: Promise<{ rid: string }> }) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "attendance")) return new Response("Not allowed", { status: 403 });
  const r = await db.attendanceRecord.findUnique({ where: { id: (await params).rid }, include: { meeting: true } });
  if (!r) return new Response("Not found", { status: 404 });
  const card = await makeupCardFor(r);
  if (!card) return new Response("Make-up cards are only for visiting Rotarians and Rotaractors with a club.", { status: 404 });
  return new Response(Buffer.from(card.bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${card.filename}"`, "Cache-Control": "no-store" },
  });
}
