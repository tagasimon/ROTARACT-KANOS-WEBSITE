import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "ok", time: new Date().toISOString() });
  } catch (e) {
    return Response.json({ status: "error", db: "unreachable", error: (e as Error).message }, { status: 503 });
  }
}
