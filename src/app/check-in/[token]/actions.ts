"use server";
import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/auth";
import { checkSession, deviceHash, REASON_TEXT, verifyGrant } from "@/lib/attendance";
import { rateLimit } from "@/lib/rate-limit";

export type PinState = { ok?: boolean; error?: string; name?: string; at?: string; already?: boolean };


export async function pinCheckIn(_: PinState, fd: FormData): Promise<PinState> {
  const token = String(fd.get("token") || "");
  const ts = Number(fd.get("ts") || 0);
  const grant = String(fd.get("grant") || "");
  const memberNumber = String(fd.get("memberNumber") || "").trim().toUpperCase();
  const pin = String(fd.get("pin") || "").trim();
  const ip = await clientIp();

  if (!(await rateLimit(`pin:${ip || "x"}`, 12, 600)).ok) return { error: "Too many attempts from this device. Please wait a few minutes." };
  if (!verifyGrant(token, ts, grant)) return { error: "This page has expired. Please scan the QR code again." };

  const check = await checkSession(token, null, ip);
  const rotatingOnly = !check.ok && check.reason === "bad_code"; // grant already proved a recent valid scan
  if (!check.ok && !rotatingOnly) return { error: REASON_TEXT[check.reason] };
  const session = check.session!;

  const member = await db.member.findUnique({ where: { memberNumber }, include: { person: { select: { name: true } } } });
  if (!member || !member.pinHash || !(await bcrypt.compare(pin, member.pinHash))) return { error: "Member ID or PIN is incorrect." };
  if (member.status === "INACTIVE" || member.status === "PENDING") return { error: "Your membership isn't active. Please see the attendance officer." };

  // device check: one phone can't PIN-check-in several different members for the same meeting
  const jar = await cookies();
  let device = jar.get("kn_device")?.value;
  if (!device) {
    device = crypto.randomBytes(16).toString("base64url");
    jar.set("kn_device", device, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 * 2 });
  }
  const h = await headers();
  const dh = deviceHash(device, h.get("user-agent"));
  const other = await db.attendanceRecord.findFirst({ where: { sessionId: session.id, deviceHash: dh, memberId: { not: member.id }, method: "QR_PIN" } });
  if (other) return { error: "This phone has already been used to check in another member for this meeting. Please use your own phone or see the attendance officer." };

  const existing = await db.attendanceRecord.findUnique({ where: { sessionId_memberId: { sessionId: session.id, memberId: member.id } } });
  if (existing) return { ok: true, already: true, name: member.person.name, at: existing.checkedInAt.toISOString() };
  const rec = await db.attendanceRecord.create({
    data: { sessionId: session.id, memberId: member.id, method: "QR_PIN", ip, userAgent: h.get("user-agent")?.slice(0, 250), deviceHash: dh },
  });
  return { ok: true, name: member.person.name, at: rec.checkedInAt.toISOString() };
}
