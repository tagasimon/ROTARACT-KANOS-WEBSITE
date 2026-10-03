import "server-only";
import { db } from "./db";
import { clientIp } from "./auth";
import type { Prisma } from "@prisma/client";

export async function audit(
  userId: string | null | undefined,
  action: string,
  entity: string,
  entityId?: string | null,
  summary?: string,
  data?: Prisma.InputJsonValue,
) {
  try {
    await db.auditLog.create({
      data: { userId: userId ?? null, action, entity, entityId: entityId ?? null, summary, data, ip: await clientIp().catch(() => null) },
    });
  } catch (e) {
    console.error("audit failed", e);
  }
}
