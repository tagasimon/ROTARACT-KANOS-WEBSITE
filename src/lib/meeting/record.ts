import "server-only";
import { Prisma, type Affiliation, type SignInMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { isEmail, normalisePhone } from "@/lib/phone";
import { MEETING } from "./config";
import { findClub } from "./clubs";

export type SignInInput = { status: string; kind: string; club: string; clubOther: string; name: string; email: string; phone: string; website: string };
export type CleanSignIn = { name: string; email: string | null; phone: string | null; isGuest: boolean; affiliation: Affiliation; clubName: string | null };

const clip = (v: FormDataEntryValue | null, max: number) =>
  String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/** Read every field, clipped and cleaned. The browser's checks are only a convenience; this is the real one. */
export function readInput(fd: FormData): SignInInput {
  return {
    status: clip(fd.get("status"), 20),
    kind: clip(fd.get("kind"), 20),
    club: clip(fd.get("club"), 140),
    clubOther: clip(fd.get("clubOther"), 140),
    name: clip(fd.get("name"), 120),
    email: clip(fd.get("email"), 200),
    phone: clip(fd.get("phone"), 40),
    website: clip(fd.get("website"), 200),
  };
}

/** Validate a sign-in. `requireContact` is off for an admin adding someone by hand. */
export function validate(i: SignInInput, { requireContact = true } = {}): { ok: true; clean: CleanSignIn } | { ok: false; error: string } {
  if (i.status !== "member" && i.status !== "visiting") return { ok: false, error: "Tell us whether you are a member or visiting." };
  const visiting = i.status === "visiting";
  if (visiting && !["ROTARIAN", "ROTARACTOR", "PROSPECT"].includes(i.kind)) return { ok: false, error: "Choose visiting Rotarian, visiting Rotaractor or prospect." };
  const kind = i.kind as Affiliation;
  const typed = i.club === "__other" ? i.clubOther : i.club;
  if (visiting && kind !== "PROSPECT" && !typed) return { ok: false, error: "Please choose (or type) your club." };
  if (i.name.length < 2) return { ok: false, error: "Please enter your full name." };
  const email = i.email ? i.email.toLowerCase() : null;
  if (email && !isEmail(email)) return { ok: false, error: "That email address doesn't look right." };
  const phone = i.phone ? normalisePhone(i.phone) : null;
  if (i.phone && !phone) return { ok: false, error: "That phone number looks too short." };
  if (requireContact && !email && !phone) return { ok: false, error: "Please give an email address or a phone number." };

  if (!visiting)
    return { ok: true, clean: { name: i.name, email, phone, isGuest: false, affiliation: MEETING.CLUB_TYPE === "ROTARY" ? "ROTARIAN" : "ROTARACTOR", clubName: MEETING.CLUB_NAME } };
  if (kind === "PROSPECT") return { ok: true, clean: { name: i.name, email, phone, isGuest: true, affiliation: "PROSPECT", clubName: null } };
  const listed = findClub(typed, kind === "ROTARIAN" ? "ROTARY" : "ROTARACT");
  return { ok: true, clean: { name: i.name, email, phone, isGuest: true, affiliation: kind, clubName: listed?.name ?? typed } };
}

/** A non-archived directory member with this email or phone, if any. */
async function findMember(email: string | null, phone: string | null) {
  if (!email && !phone) return null;
  const where: Prisma.MemberWhereInput[] = [];
  if (email) where.push({ email: { equals: email, mode: "insensitive" } });
  if (phone) where.push({ phone });
  const direct = await db.member.findFirst({ where: { status: { not: "ARCHIVED" }, OR: where }, select: { id: true } });
  if (direct || !phone) return direct;
  // Phones typed in by hand may not be normalised yet.
  const withPhones = await db.member.findMany({ where: { status: { not: "ARCHIVED" }, phone: { not: null } }, select: { id: true, phone: true } });
  return withPhones.find((m) => normalisePhone(m.phone) === phone) ?? null;
}

/**
 * Record (or update) one person's sign-in at a meeting.
 * The same person signing in twice (same email, phone or member) updates their row instead of adding one.
 */
export async function recordSignIn(meetingId: string, c: CleanSignIn, opts: { method: SignInMethod; recordedById?: string | null }) {
  const member = await findMember(c.email, c.phone);
  for (let attempt = 0; attempt < 2; attempt++) {
    const match: Prisma.AttendanceRecordWhereInput[] = [];
    if (c.email) match.push({ email: c.email });
    if (c.phone) match.push({ phone: c.phone });
    if (member) match.push({ memberId: member.id });
    const existing = match.length ? await db.attendanceRecord.findFirst({ where: { meetingId, OR: match }, orderBy: { checkedInAt: "asc" } }) : null;

    try {
      if (existing) {
        // Don't take a memberId that another row in this meeting already holds.
        const memberTaken = member && existing.memberId !== member.id ? await db.attendanceRecord.findFirst({ where: { meetingId, memberId: member.id, id: { not: existing.id } }, select: { id: true } }) : null;
        const emailChanged = !!c.email && c.email !== existing.email;
        const record = await db.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            name: c.name,
            isGuest: c.isGuest,
            affiliation: c.affiliation,
            clubName: c.clubName,
            email: c.email ?? existing.email,
            phone: c.phone ?? existing.phone,
            ...(member && !memberTaken ? { memberId: member.id } : {}),
            ...(emailChanged && existing.emailStatus !== "SENT" ? { emailStatus: null, emailError: null } : {}),
          },
        });
        return { record, duplicate: true };
      }
      const record = await db.attendanceRecord.create({
        data: { meetingId, memberId: member?.id ?? null, ...c, method: opts.method, recordedById: opts.recordedById ?? null },
      });
      return { record, duplicate: false };
    } catch (e) {
      // Two sign-ins for the same member at the same moment: read again and update the winner.
      if (attempt === 0 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  throw new Error("Could not record the sign-in");
}
