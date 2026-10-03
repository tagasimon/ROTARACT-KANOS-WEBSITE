import "server-only";
import QRCode from "qrcode";
import { db } from "./db";
import { rotatingCode } from "./attendance";
import { absoluteUrl } from "./utils";

export async function livePayload(id: string) {
  const s = await db.attendanceSession.findUnique({ where: { id } });
  if (!s) return null;
  const url = absoluteUrl(`/check-in/${s.token}${s.rotating ? `?c=${rotatingCode(s.secret, s.rotationSeconds)}` : ""}`);
  const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#000000", light: "#ffffff" } });
  const [count, recent] = await Promise.all([
    db.attendanceRecord.count({ where: { sessionId: id, excused: false } }),
    db.attendanceRecord.findMany({ where: { sessionId: id }, include: { member: { select: { person: { select: { name: true } } } } }, orderBy: { checkedInAt: "desc" }, take: 30 }),
  ]);
  const now = new Date();
  return {
    svg,
    url,
    count,
    open: !s.closed && now >= s.opensAt && now <= s.closesAt,
    rotateIn: s.rotating ? s.rotationSeconds - (Math.floor(Date.now() / 1000) % s.rotationSeconds) : 0,
    recent: recent.map((r) => ({ name: r.member.person.name, at: r.checkedInAt.toISOString(), method: r.method === "QR_ACCOUNT" ? "account" : r.method === "QR_PIN" ? "PIN" : r.excused ? "excused" : "manual" })),
  };
}

