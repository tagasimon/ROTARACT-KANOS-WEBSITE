import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { memberStats } from "./attendance";
import { getSettings } from "./settings";
import { fmtDate } from "./utils";

export type ReportFilters = { from?: string; to?: string; yearId?: string; month?: string; type?: string; committeeId?: string; status?: string; memberId?: string };

/** Resolve filters into a date window + member set. Month = "YYYY-MM". */
export async function resolveFilters(f: ReportFilters) {
  let from: Date | undefined, to: Date | undefined;
  if (f.yearId) {
    const y = await db.rotaractYear.findUnique({ where: { id: f.yearId } });
    if (y) { from = y.startDate; to = y.endDate; }
  }
  if (f.month && /^\d{4}-\d{2}$/.test(f.month)) {
    const [y, m] = f.month.split("-").map(Number);
    from = new Date(Date.UTC(y, m - 1, 1) - 3 * 3600000);
    to = new Date(Date.UTC(y, m, 1) - 3 * 3600000 - 1);
  }
  if (f.from) from = new Date(`${f.from}T00:00:00+03:00`);
  if (f.to) to = new Date(`${f.to}T23:59:59+03:00`);
  const memberWhere: Prisma.MemberWhereInput = {};
  if (f.status) memberWhere.status = f.status as never;
  else memberWhere.status = { in: ["ACTIVE", "HONORARY"] };
  if (f.committeeId) memberWhere.person = { committeeMemberships: { some: { committeeId: f.committeeId } } };
  if (f.memberId) memberWhere.id = f.memberId;
  return { from, to, memberWhere };
}

export async function attendanceReport(f: ReportFilters) {
  const { from, to, memberWhere } = await resolveFilters(f);
  const s = await getSettings();
  const members = await db.member.findMany({ where: memberWhere, include: { person: { select: { name: true, slug: true } } }, orderBy: { person: { name: "asc" } } });
  const { sessions, stats } = await memberStats({ from, to, memberIds: members.map((m) => m.id), type: f.type || undefined });
  const rows = members.map((m) => ({ member: m, ...stats.get(m.id)! })).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));

  const sessionIds = sessions.map((x) => x.id);
  const sessionsFull = await db.attendanceSession.findMany({
    where: { id: { in: sessionIds } },
    select: { id: true, title: true, startsAt: true, type: true, yearId: true, _count: { select: { records: { where: { excused: false, memberId: { in: members.map((m) => m.id) } } } } } },
    orderBy: { startsAt: "asc" },
  });
  const overTime = sessionsFull.map((x) => ({ label: fmtDate(x.startsAt, { day: "numeric", month: "short" }), title: x.title, present: x._count.records }));
  const monthMap = new Map<string, { label: string; total: number; n: number }>();
  for (const x of sessionsFull) {
    const k = fmtDate(x.startsAt, { month: "short", year: "2-digit" });
    const e = monthMap.get(k) || { label: k, total: 0, n: 0 };
    e.total += x._count.records; e.n++;
    monthMap.set(k, e);
  }
  const byMonth = [...monthMap.values()].map((m) => ({ label: m.label, average: Math.round((m.total / m.n) * 10) / 10, sessions: m.n }));
  const typeMap = new Map<string, { total: number; n: number }>();
  for (const x of sessionsFull) {
    const e = typeMap.get(x.type) || { total: 0, n: 0 };
    e.total += x._count.records; e.n++;
    typeMap.set(x.type, e);
  }
  const byType = [...typeMap.entries()].map(([type, v]) => ({ type, average: Math.round((v.total / v.n) * 10) / 10, sessions: v.n })).sort((a, b) => b.average - a.average);

  // by Rotaract year (always all years, unfiltered by date, for the trend)
  const years = await db.rotaractYear.findMany({ orderBy: { startDate: "asc" }, include: { attendance: { where: { countsTowardRate: true }, select: { _count: { select: { records: { where: { excused: false } } } } } } } });
  const byYear = years.filter((y) => y.attendance.length).map((y) => ({ label: y.label, average: Math.round((y.attendance.reduce((a, b) => a + b._count.records, 0) / y.attendance.length) * 10) / 10 }));

  const totalAtt = rows.reduce((a, r) => a + r.attended, 0);
  const totalExp = rows.reduce((a, r) => a + r.expected, 0);
  const startToday = new Date(Date.UTC(new Date(Date.now() + 3 * 3600000).getUTCFullYear(), new Date(Date.now() + 3 * 3600000).getUTCMonth(), new Date(Date.now() + 3 * 3600000).getUTCDate()) - 3 * 3600000);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 3 * 3600000);
  const [presentToday, eventsThisMonth] = await Promise.all([
    db.attendanceRecord.count({ where: { checkedInAt: { gte: startToday }, excused: false } }),
    db.attendanceSession.count({ where: { startsAt: { gte: monthStart } } }),
  ]);
  const fourWeeks = Date.now() - 28 * 86400000;
  const followUp = rows.filter((r) => r.expected >= 3 && ((r.rate ?? 0) * 100 < s.attendanceFollowUpThreshold || !r.lastAttendance || r.lastAttendance.getTime() < fourWeeks));
  return {
    rows,
    sessions: sessionsFull,
    metrics: {
      members: members.length,
      presentToday,
      rate: totalExp ? totalAtt / totalExp : null,
      average: sessionsFull.length ? sessionsFull.reduce((a, b) => a + b._count.records, 0) / sessionsFull.length : null,
      eventsThisMonth,
      perfect: rows.filter((r) => r.expected > 0 && r.attended === r.expected).length,
      followUp: followUp.length,
    },
    followUp,
    overTime,
    byMonth,
    byYear,
    byType,
    threshold: s.attendanceFollowUpThreshold,
  };
}
