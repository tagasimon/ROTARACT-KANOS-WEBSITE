"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { newToken } from "@/lib/attendance";
import { yearIdForDate } from "@/lib/years";
import type { EventType } from "@prisma/client";

const kla = (v: string) => new Date(`${v}:00+03:00`);

export async function createSession(fd: FormData) {
  const user = await requireArea("attendance");
  const title = String(fd.get("title") || "").trim();
  const startsRaw = String(fd.get("startsAt") || "");
  if (!title || !startsRaw) redirect("/admin/attendance/sessions/new?error=Title%20and%20start%20time%20are%20required");
  const startsAt = kla(startsRaw);
  const before = Math.max(0, Number(fd.get("openBefore") || 30));
  const after = Math.max(15, Number(fd.get("closeAfter") || 180));
  const s = await db.attendanceSession.create({
    data: {
      title,
      type: (String(fd.get("type") || "CLUB_MEETING") as EventType),
      eventId: String(fd.get("eventId") || "") || null,
      startsAt,
      opensAt: new Date(startsAt.getTime() - before * 60000),
      closesAt: new Date(startsAt.getTime() + after * 60000),
      venue: String(fd.get("venue") || "") || null,
      token: newToken(),
      secret: newToken(24),
      rotating: fd.get("rotating") === "on",
      rotationSeconds: Math.min(300, Math.max(15, Number(fd.get("rotationSeconds") || 30))),
      ipAllowlist: String(fd.get("ipAllowlist") || "").trim() || null,
      countsTowardRate: fd.get("countsTowardRate") === "on",
      yearId: await yearIdForDate(startsAt),
      createdById: user.id,
    },
  });
  await audit(user.id, "create", "attendanceSession", s.id, title);
  redirect(`/admin/attendance/sessions/${s.id}`);
}

export async function setClosed(id: string, closed: boolean) {
  const user = await requireArea("attendance");
  await db.attendanceSession.update({ where: { id }, data: { closed } });
  await audit(user.id, closed ? "close" : "reopen", "attendanceSession", id);
  revalidatePath(`/admin/attendance/sessions/${id}`);
}

export async function extendSession(id: string, minutes: number) {
  const user = await requireArea("attendance");
  const s = await db.attendanceSession.findUniqueOrThrow({ where: { id } });
  const base = s.closesAt > new Date() ? s.closesAt : new Date();
  await db.attendanceSession.update({ where: { id }, data: { closesAt: new Date(base.getTime() + minutes * 60000), closed: false } });
  await audit(user.id, "extend", "attendanceSession", id, `+${minutes} min`);
  revalidatePath(`/admin/attendance/sessions/${id}`);
}

export async function regenerateToken(id: string) {
  const user = await requireArea("attendance");
  await db.attendanceSession.update({ where: { id }, data: { token: newToken(), secret: newToken(24) } });
  await audit(user.id, "regenerate_qr", "attendanceSession", id);
  revalidatePath(`/admin/attendance/sessions/${id}`);
}

export async function addManual(sessionId: string, fd: FormData) {
  const user = await requireArea("attendance");
  const memberIds = fd.getAll("memberId").map(String).filter(Boolean);
  const excused = fd.get("excused") === "on";
  const note = String(fd.get("note") || "") || null;
  for (const memberId of memberIds) {
    await db.attendanceRecord.upsert({
      where: { sessionId_memberId: { sessionId, memberId } },
      create: { sessionId, memberId, method: "MANUAL", excused, note, adjustedById: user.id },
      update: { excused, note: note ?? undefined, adjustedById: user.id },
    });
  }
  await audit(user.id, "checkin_adjust", "attendanceSession", sessionId, `Manual: ${memberIds.length} member(s)${excused ? " excused" : ""}`);
  revalidatePath(`/admin/attendance/sessions/${sessionId}`);
  revalidatePath("/admin/attendance/records");
}

export async function removeRecord(recordId: string) {
  const user = await requireArea("attendance");
  const r = await db.attendanceRecord.delete({ where: { id: recordId } });
  await audit(user.id, "checkin_remove", "attendanceRecord", recordId, `member ${r.memberId} session ${r.sessionId}`, r as never);
  revalidatePath(`/admin/attendance/sessions/${r.sessionId}`);
  revalidatePath("/admin/attendance/records");
}

export async function toggleExcused(recordId: string) {
  const user = await requireArea("attendance");
  const r = await db.attendanceRecord.findUniqueOrThrow({ where: { id: recordId } });
  await db.attendanceRecord.update({ where: { id: recordId }, data: { excused: !r.excused, adjustedById: user.id } });
  await audit(user.id, "checkin_adjust", "attendanceRecord", recordId, r.excused ? "unexcused" : "excused");
  revalidatePath(`/admin/attendance/sessions/${r.sessionId}`);
  revalidatePath("/admin/attendance/records");
}
