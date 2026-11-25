"use server";
import { after } from "next/server";
import { clientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { MEETING } from "@/lib/meeting/config";
import { db } from "@/lib/db";
import { readInput, recordSignIn, validate } from "@/lib/meeting/record";
import { clockTime, getOrCreateTodaysMeeting, longDate, previewTodaysMeeting } from "@/lib/meeting/today";
import { emailOffReason, sendThankYou } from "@/lib/meeting/email";
import { variantOf } from "@/lib/meeting/templates";

export type AttendState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "ok"; firstName: string; duplicate: boolean; meetingLine: string; emailNote: "none" | "email" | "card" };

const first = (name: string) => name.trim().split(/\s+/)[0] || "there";
const lineFor = (m: { title: string; date: Date }) => `${m.title} · ${longDate(m.date)} · ${clockTime(m.date)}`;

export async function signIn(_: AttendState, fd: FormData): Promise<AttendState> {
  const input = readInput(fd);

  // 1. Honeypot: a bot filled the hidden field. Look successful, save nothing.
  if (input.website) return { status: "ok", firstName: first(input.name), duplicate: false, meetingLine: lineFor(await previewTodaysMeeting()), emailNote: "none" };

  // 2. Rate limit per connection
  const ip = (await clientIp()) || "unknown";
  const rl = await rateLimit(`attend:${ip}`, MEETING.SIGN_INS_PER_HOUR, 3600);
  if (!rl.ok) return { status: "error", error: "There have been too many sign-ins from this connection in the last hour. Please try again a little later, or ask a club officer to add you." };

  // 3. Validate, find today's meeting, record
  const groups = (await db.buddyGroup.findMany({ select: { id: true } })).map((g) => g.id);
  const v = validate(input, { groups });
  if (!v.ok) return { status: "error", error: v.error };
  const meeting = await getOrCreateTodaysMeeting();
  const { record, duplicate } = await recordSignIn(meeting.id, v.clean, { method: "QR" });

  // 4. The thank-you email goes out after the response, so signing in stays instant and never fails because of email.
  let emailNote: "none" | "email" | "card" = "none";
  if (record.email && record.emailStatus !== "SENT") {
    if (!emailOffReason()) emailNote = variantOf(record) === "visitor" ? "card" : "email";
    after(() => sendThankYou(record.id));
  }
  return { status: "ok", firstName: first(record.name), duplicate, meetingLine: lineFor(meeting), emailNote };
}
