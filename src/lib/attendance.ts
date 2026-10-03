import "server-only";
import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

/** Random URL-safe token for the QR payload. */
export const newToken = (bytes = 12) => crypto.randomBytes(bytes).toString("base64url");

/** Short rotating code: HMAC(secret, window). Valid for the current and previous window. */
export function rotatingCode(secret: string, rotationSeconds: number, at = Date.now()) {
  const win = Math.floor(at / 1000 / rotationSeconds);
  return crypto.createHmac("sha256", secret + (process.env.SESSION_SECRET || "")).update(String(win)).digest("base64url").slice(0, 8);
}

export function verifyRotatingCode(secret: string, rotationSeconds: number, code: string | null | undefined) {
  if (!code) return false;
  const now = Date.now();
  const valid = [rotatingCode(secret, rotationSeconds, now), rotatingCode(secret, rotationSeconds, now - rotationSeconds * 1000)];
  return valid.some((v) => v.length === code.length && crypto.timingSafeEqual(Buffer.from(v), Buffer.from(code)));
}

export type SessionCheck =
  | { ok: true; session: Prisma.AttendanceSessionGetPayload<object> }
  | { ok: false; reason: "not_found" | "closed" | "not_open_yet" | "expired" | "bad_code" | "network" ; session?: Prisma.AttendanceSessionGetPayload<object> };

/** Server-side validation of a QR scan. */
export async function checkSession(token: string, code?: string | null, ip?: string | null): Promise<SessionCheck> {
  const session = await db.attendanceSession.findUnique({ where: { token } });
  if (!session) return { ok: false, reason: "not_found" };
  const now = new Date();
  if (session.closed) return { ok: false, reason: "closed", session };
  if (now < session.opensAt) return { ok: false, reason: "not_open_yet", session };
  if (now > session.closesAt) return { ok: false, reason: "expired", session };
  if (session.rotating && !verifyRotatingCode(session.secret, session.rotationSeconds, code)) return { ok: false, reason: "bad_code", session };
  if (session.ipAllowlist) {
    const prefixes = session.ipAllowlist.split(",").map((s) => s.trim()).filter(Boolean);
    if (prefixes.length && !(ip && prefixes.some((p) => ip.startsWith(p)))) return { ok: false, reason: "network", session };
  }
  return { ok: true, session };
}

export const REASON_TEXT: Record<string, string> = {
  not_found: "This check-in code isn't valid.",
  closed: "Check-in for this meeting has closed.",
  not_open_yet: "Check-in hasn't opened yet. Try again closer to the start time.",
  expired: "This QR code has expired. Ask the attendance officer for the current one.",
  bad_code: "This QR code has changed. Please scan the code currently on screen.",
  network: "Check-in is only available on the venue network for this meeting.",
};

/** Short-lived (5 min) grant issued when a valid scan loads the page. */
export function signGrant(token: string, ts: number) {
  return crypto.createHmac("sha256", process.env.SESSION_SECRET || "dev").update(`grant.${token}.${ts}`).digest("base64url").slice(0, 22);
}
export function verifyGrant(token: string, ts: number, grant: string | null | undefined) {
  if (!grant || !ts || Date.now() - ts > 5 * 60 * 1000 || ts > Date.now() + 60000) return false;
  const want = signGrant(token, ts);
  return want.length === grant.length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(grant));
}

export function deviceHash(deviceId: string | undefined, ua: string | null) {
  return crypto.createHash("sha256").update(`${deviceId || ""}|${ua || ""}`).digest("hex").slice(0, 32);
}

// ───────────────────────── statistics ─────────────────────────

export type MemberStats = {
  memberId: string;
  expected: number;
  attended: number;
  excused: number;
  rate: number | null;
  lastAttendance: Date | null;
  streak: number;
  longestStreak: number;
};

/**
 * Attendance stats for members across the counted sessions in a window.
 * A session is "expected" for a member if it happened after they joined.
 * Excused absences are removed from the denominator.
 */
export async function memberStats(opts: { from?: Date; to?: Date; memberIds?: string[]; type?: string } = {}) {
  const to = opts.to && opts.to < new Date() ? opts.to : new Date();
  const sessions = await db.attendanceSession.findMany({
    where: { countsTowardRate: true, startsAt: { gte: opts.from, lte: to }, ...(opts.type ? { type: opts.type as never } : {}) },
    select: { id: true, startsAt: true },
    orderBy: { startsAt: "asc" },
  });
  const members = await db.member.findMany({
    where: opts.memberIds ? { id: { in: opts.memberIds } } : {},
    select: { id: true, membershipDate: true, createdAt: true },
  });
  const records = await db.attendanceRecord.findMany({
    where: { sessionId: { in: sessions.map((s) => s.id) }, ...(opts.memberIds ? { memberId: { in: opts.memberIds } } : {}) },
    select: { sessionId: true, memberId: true, checkedInAt: true, excused: true },
  });
  const byMember = new Map<string, Map<string, { at: Date; excused: boolean }>>();
  for (const r of records) {
    if (!byMember.has(r.memberId)) byMember.set(r.memberId, new Map());
    byMember.get(r.memberId)!.set(r.sessionId, { at: r.checkedInAt, excused: r.excused });
  }
  const out = new Map<string, MemberStats>();
  for (const m of members) {
    const joined = m.membershipDate || m.createdAt;
    const mine = byMember.get(m.id) || new Map();
    const exp = sessions.filter((s) => s.startsAt >= new Date(joined.getTime() - 86400000) || mine.has(s.id));
    let attended = 0, excused = 0, streak = 0, longest = 0, run = 0;
    let last: Date | null = null;
    for (const s of exp) {
      const r = mine.get(s.id);
      if (r?.excused) { excused++; continue; }
      if (r) {
        attended++;
        run++;
        longest = Math.max(longest, run);
        if (!last || r.at > last) last = r.at;
      } else run = 0;
    }
    // current streak = run at the end of the list
    streak = run;
    const denom = exp.length - excused;
    out.set(m.id, { memberId: m.id, expected: denom, attended, excused, rate: denom > 0 ? attended / denom : null, lastAttendance: last, streak, longestStreak: longest });
  }
  return { sessions, stats: out };
}
