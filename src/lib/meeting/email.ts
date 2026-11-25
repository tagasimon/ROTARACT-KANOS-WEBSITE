import "server-only";
import { db } from "@/lib/db";
import { baseUrl } from "@/lib/utils";
import { MEETING } from "./config";
import { meetingSettings } from "./settings";
import { buildThankYou, variantOf } from "./templates";
import { cardFilename, makeupCardPdf } from "./makeup-card";
import { clockTime, longDate, nextClubEvent } from "./today";

/** Why thank-you emails are off, or null when they're on. Never reveals the key. */
export function emailOffReason(): string | null {
  if (!process.env.RESEND_API_KEY?.trim()) return "RESEND_API_KEY is not set";
  if (!process.env.EMAIL_FROM?.trim()) return "EMAIL_FROM is not set";
  if ((process.env.ATTENDANCE_EMAILS || "").trim().toLowerCase() === "false") return "paused with ATTENDANCE_EMAILS=false";
  return null;
}

type Rec = NonNullable<Awaited<ReturnType<typeof loadRecord>>>;
function loadRecord(id: string) {
  return db.attendanceRecord.findUnique({ where: { id }, include: { meeting: true } });
}

/** The visitor's make-up card, or null for members and prospects. */
export async function makeupCardFor(r: Rec) {
  if (variantOf(r) !== "visitor") return null;
  const bytes = await makeupCardPdf({
    recordId: r.id,
    name: r.name,
    affiliation: r.affiliation as "ROTARIAN" | "ROTARACTOR",
    clubName: r.clubName!,
    meetingTitle: r.meeting.title,
    meetingDate: r.meeting.date,
    venue: r.meeting.venue,
  });
  return { filename: cardFilename(r.name, r.meeting.date), bytes };
}

/** The exact email a record gets: used for sending and for the admin preview. */
export async function composeFor(recordId: string) {
  const r = await loadRecord(recordId);
  if (!r) return null;
  let card: Awaited<ReturnType<typeof makeupCardFor>> = null;
  try {
    card = await makeupCardFor(r);
  } catch (e) {
    console.error("make-up card failed", (e as Error).message);
  }
  const [regular, next] = await Promise.all([meetingSettings(), nextClubEvent()]);
  const mail = buildThankYou({ record: r, meeting: r.meeting, next, regular, siteUrl: baseUrl(), cardAttached: !!card, fmt: { longDate, clock: clockTime } });
  return { record: r, to: r.email, ...mail, card };
}

export type SendResult = "SENT" | "FAILED" | "SKIPPED" | "NO_EMAIL" | "ALREADY_SENT" | "NOT_FOUND";

/**
 * Send one thank-you email. Never throws: the outcome is always written to the record.
 * Automatic sends use a fixed idempotency key so a retry can never email twice;
 * an admin's "Send again" uses a fresh key so Resend really sends it.
 */
export async function sendThankYou(recordId: string, opts: { again?: boolean } = {}): Promise<SendResult> {
  try {
    const r = await db.attendanceRecord.findUnique({ where: { id: recordId }, select: { id: true, email: true, emailStatus: true } });
    if (!r) return "NOT_FOUND";
    if (!r.email) return "NO_EMAIL";
    if (r.emailStatus === "SENT" && !opts.again) return "ALREADY_SENT";
    const off = emailOffReason();
    if (off) {
      await db.attendanceRecord.update({ where: { id: r.id }, data: { emailStatus: "SKIPPED", emailError: `Emails are off: ${off}.` } });
      return "SKIPPED";
    }
    const mail = await composeFor(r.id);
    if (!mail?.to) return "NO_EMAIL";
    const body: Record<string, unknown> = { from: process.env.EMAIL_FROM!.trim(), to: [mail.to], reply_to: MEETING.CLUB_EMAIL, subject: mail.subject, html: mail.html, text: mail.text };
    if (mail.card) body.attachments = [{ filename: mail.card.filename, content: Buffer.from(mail.card.bytes).toString("base64") }];
    let status = 0;
    let message = "";
    try {
      const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
          "Content-Type": "application/json",
          "Idempotency-Key": opts.again ? `attendance-${r.id}-again-${Date.now()}` : `attendance-${r.id}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      status = res.status;
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { message?: string; name?: string } | null;
        message = j?.message || j?.name || res.statusText || "Request failed";
      }
    } catch (e) {
      message = (e as Error).name === "TimeoutError" ? "Timed out after 20 seconds" : (e as Error).message || "Network error";
    }
    if (status >= 200 && status < 300) {
      await db.attendanceRecord.update({ where: { id: r.id }, data: { emailStatus: "SENT", emailSentAt: new Date(), emailError: null } });
      return "SENT";
    }
    await db.attendanceRecord.update({ where: { id: r.id }, data: { emailStatus: "FAILED", emailError: `${status ? `Resend ${status}: ` : ""}${message}`.slice(0, 300) } });
    return "FAILED";
  } catch (e) {
    console.error("thank-you email failed", (e as Error).message);
    await db.attendanceRecord.update({ where: { id: recordId }, data: { emailStatus: "FAILED", emailError: ((e as Error).message || "Unexpected error").slice(0, 300) } }).catch(() => {});
    return "FAILED";
  }
}
