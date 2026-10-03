import crypto from "node:crypto";
import { runDiscovery } from "@/lib/discovery";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorised(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const h = req.headers.get("authorization") || "";
  const given = h.startsWith("Bearer ") ? h.slice(7) : new URL(req.url).searchParams.get("key") || "";
  return given.length === secret.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

/** Called by a Coolify scheduled task (or any cron): checks feeds, dedupes, queues for review, housekeeping. */
export async function POST(req: Request) {
  if (!authorised(req)) return new Response("Unauthorized", { status: 401 });
  return Response.json(await runDiscovery());
}
export const GET = POST;
