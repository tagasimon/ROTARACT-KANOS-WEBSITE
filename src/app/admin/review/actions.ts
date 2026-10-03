"use server";
import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { mergeEvents } from "@/lib/admin/review";

type Kind = "event" | "socialPost" | "person" | "project" | "historyEntry" | "leadershipAssignment" | "achievement" | "projectMilestone" | "districtVisit";
const PUBLISHABLE = new Set<Kind>(["event", "socialPost", "project", "historyEntry", "achievement"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (k: Kind) => (db as any)[k];

export async function reviewAction(kind: Kind, id: string, op: "approve" | "reject" | "verify" | "approve_verify") {
  const user = await requireArea(kind === "person" || kind === "leadershipAssignment" ? "people" : "review");
  const data: Record<string, unknown> = {};
  if ((op === "approve" || op === "approve_verify") && PUBLISHABLE.has(kind)) data.publishStatus = "PUBLISHED";
  if (op === "reject" && PUBLISHABLE.has(kind)) data.publishStatus = "REJECTED";
  if (op === "verify" || op === "approve_verify") Object.assign(data, { verification: "VERIFIED", verifiedAt: new Date(), verifiedById: user.id });
  if (op === "reject" && !PUBLISHABLE.has(kind)) Object.assign(data, { verification: "UNVERIFIED" });
  await d(kind).update({ where: { id }, data });
  await audit(user.id, op, kind, id);
  revalidatePath("/", "layout");
}

export async function mergeAction(intoId: string, fromId: string) {
  const user = await requireArea("events");
  await mergeEvents(intoId, fromId);
  await audit(user.id, "merge", "event", intoId, `Merged ${fromId} into ${intoId}`);
  revalidatePath("/", "layout");
}

export async function notDuplicate(aId: string, bId: string) {
  const user = await requireArea("events");
  const key = "dismissed_duplicates";
  const row = await db.siteSetting.findUnique({ where: { key } });
  const list = new Set((row?.value as string[]) || []);
  list.add([aId, bId].sort().join(":"));
  await db.siteSetting.upsert({ where: { key }, create: { key, value: [...list] }, update: { value: [...list] } });
  await audit(user.id, "dismiss_duplicate", "event", aId, `${aId} ≠ ${bId}`);
  revalidatePath("/admin/review");
}
