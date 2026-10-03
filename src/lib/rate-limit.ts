import "server-only";
import { db } from "./db";

/** Fixed-window limiter stored in Postgres (no Redis needed on a small VPS). */
export async function rateLimit(key: string, limit: number, windowSec: number) {
  const now = new Date();
  const row = await db.rateLimit.findUnique({ where: { key } });
  if (!row || row.resetAt < now) {
    await db.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, resetAt: new Date(now.getTime() + windowSec * 1000) },
      update: { count: 1, resetAt: new Date(now.getTime() + windowSec * 1000) },
    });
    return { ok: true, remaining: limit - 1 };
  }
  if (row.count >= limit) return { ok: false, remaining: 0 };
  await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return { ok: true, remaining: limit - row.count - 1 };
}
