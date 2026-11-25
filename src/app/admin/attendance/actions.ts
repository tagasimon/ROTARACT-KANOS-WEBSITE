"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireArea } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { readInput, recordSignIn, validate } from "@/lib/meeting/record";
import { sendThankYou } from "@/lib/meeting/email";

const back = (meetingId: string, msg: string, error = false) => redirect(`/admin/attendance/${meetingId}?${error ? "error" : "msg"}=${encodeURIComponent(msg)}`);

/** An admin adds someone by hand: same checks as the public form, but no contact details needed, and no automatic email. */
export async function addPerson(fd: FormData) {
  const user = await requireArea("attendance");
  const meetingId = String(fd.get("meetingId") || "");
  const meeting = await db.meeting.findUnique({ where: { id: meetingId }, select: { id: true } });
  if (!meeting) redirect("/admin/attendance?error=That+meeting+no+longer+exists.");
  const who = String(fd.get("who") || "");
  const f = new FormData();
  f.set("status", who === "member" ? "member" : "visiting");
  f.set("kind", who === "member" ? "" : who);
  for (const k of ["club", "name", "email", "phone"]) f.set(k, String(fd.get(k) || ""));
  const v = validate(readInput(f), { requireContact: false });
  if (!v.ok) back(meetingId, v.error, true);
  const ok = v as Extract<typeof v, { ok: true }>;
  const { record, duplicate } = await recordSignIn(meetingId, ok.clean, { method: "MANUAL", recordedById: user.id });
  await audit(user.id, duplicate ? "update" : "add", "attendance", record.id, `${duplicate ? "Updated" : "Added"} ${record.name} by hand`, { meetingId });
  revalidatePath(`/admin/attendance/${meetingId}`);
  back(meetingId, duplicate ? `${record.name} was already signed in; their details were updated.` : `${record.name} added.`);
}

export async function removeRecord(fd: FormData) {
  const user = await requireArea("attendance");
  const r = await db.attendanceRecord.findUnique({ where: { id: String(fd.get("id") || "") } });
  if (!r) redirect("/admin/attendance");
  await db.attendanceRecord.delete({ where: { id: r.id } });
  await audit(user.id, "remove", "attendance", r.id, `Removed ${r.name}`, { meetingId: r.meetingId });
  back(r.meetingId, `${r.name} removed.`);
}

export async function sendOne(fd: FormData) {
  const user = await requireArea("attendance");
  const id = String(fd.get("id") || "");
  const again = fd.get("again") === "1";
  const r = await db.attendanceRecord.findUnique({ where: { id }, select: { meetingId: true, name: true } });
  if (!r) redirect("/admin/attendance");
  const result = await sendThankYou(id, { again });
  await audit(user.id, "email", "attendance", id, `${again ? "Sent again" : "Sent"} thank-you to ${r.name}: ${result}`, { meetingId: r.meetingId });
  const msg = { SENT: `Email sent to ${r.name}.`, FAILED: `The email to ${r.name} failed. See the reason in the table.`, SKIPPED: "Emails are off, so nothing was sent.", NO_EMAIL: `${r.name} has no email address.`, ALREADY_SENT: `${r.name} already has their email.`, NOT_FOUND: "That sign-in no longer exists." }[result];
  back(r.meetingId, msg, result === "FAILED" || result === "SKIPPED");
}

export async function sendPending(fd: FormData) {
  const user = await requireArea("attendance");
  const meetingId = String(fd.get("meetingId") || "");
  const pending = await db.attendanceRecord.findMany({ where: { meetingId, email: { not: null }, OR: [{ emailStatus: null }, { emailStatus: { not: "SENT" } }] }, select: { id: true } });
  const results: Record<string, number> = {};
  for (const p of pending) {
    const r = await sendThankYou(p.id);
    results[r] = (results[r] || 0) + 1;
  }
  await audit(user.id, "send pending", "attendance", meetingId, `Sent ${pending.length} pending thank-you emails`, results);
  const parts = [results.SENT && `${results.SENT} sent`, results.FAILED && `${results.FAILED} failed`, results.SKIPPED && `${results.SKIPPED} skipped (emails are off)`].filter(Boolean);
  back(meetingId, parts.length ? `Pending emails: ${parts.join(", ")}.` : "Nothing was waiting to be sent.", !!results.FAILED || !!results.SKIPPED);
}

export async function renameMeeting(fd: FormData) {
  const user = await requireArea("attendance");
  const id = String(fd.get("id") || "");
  const title = String(fd.get("title") || "").replace(/\s+/g, " ").trim().slice(0, 140);
  if (title.length < 2) back(id, "Give the meeting a name.", true);
  const m = await db.meeting.update({ where: { id }, data: { title } });
  await audit(user.id, "rename", "meeting", id, `Renamed to "${m.title}"`);
  back(id, "Meeting renamed.");
}

export async function deleteMeeting(fd: FormData) {
  const user = await requireArea("attendance");
  const id = String(fd.get("id") || "");
  const m = await db.meeting.findUnique({ where: { id }, include: { _count: { select: { records: true } } } });
  if (!m) redirect("/admin/attendance");
  await db.meeting.delete({ where: { id } });
  await audit(user.id, "delete", "meeting", id, `Deleted "${m.title}" (${m.day.toISOString().slice(0, 10)}) and its ${m._count.records} sign-ins`);
  redirect(`/admin/attendance?msg=${encodeURIComponent(`Deleted "${m.title}" and its ${m._count.records} sign-ins.`)}`);
}
