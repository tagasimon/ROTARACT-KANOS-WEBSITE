import { db } from "@/lib/db";
import { baseUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    const appUrl = baseUrl();
    const raw = (process.env.APP_URL || "").trim();
    const appUrlOk = !!raw && appUrl !== "http://localhost:3000" && /^https?:\/\//i.test(raw);
    return Response.json({
      status: "ok",
      db: "ok",
      appUrl,
      appUrlOk,
      ...(appUrlOk ? {} : { warning: "APP_URL is missing or not a full http(s):// address. QR codes and links will be wrong until it is fixed." }),
      time: new Date().toISOString(),
    });
  } catch (e) {
    return Response.json({ status: "error", db: "unreachable", error: (e as Error).message }, { status: 503 });
  }
}
