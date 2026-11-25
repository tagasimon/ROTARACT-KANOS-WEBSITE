import "server-only";
import type { Affiliation } from "@prisma/client";
import { db } from "@/lib/db";
import { findClub, foldName } from "./clubs";
import { localParts, localToUtc } from "./today";

type Lite = { isGuest: boolean; affiliation: Affiliation | null; clubName: string | null; memberId?: string | null };

export function countsOf(rs: Lite[]) {
  const guests = rs.filter((r) => r.isGuest);
  return {
    total: rs.length,
    members: rs.length - guests.length,
    guests: guests.length,
    rotarians: guests.filter((r) => r.affiliation === "ROTARIAN").length,
    rotaractors: guests.filter((r) => r.affiliation === "ROTARACTOR").length,
    prospects: guests.filter((r) => r.affiliation === "PROSPECT").length,
    clubs: new Set(guests.filter((r) => r.affiliation !== "PROSPECT" && r.clubName).map((r) => foldName(findClub(r.clubName!)?.name ?? r.clubName!))).size,
  };
}

/** Rotary years run 1 July – 30 June. The start of the current one, in Kampala. */
export function rotaryYearStart(now = new Date()) {
  const { y, m } = localParts(now);
  return localToUtc(`${m >= 7 ? y : y - 1}-07-01`);
}

export async function meetingsWithCounts(opts: { take?: number; since?: Date } = {}) {
  const meetings = await db.meeting.findMany({
    where: opts.since ? { date: { gte: opts.since } } : undefined,
    include: { records: { select: { isGuest: true, affiliation: true, clubName: true } } },
    orderBy: { date: "desc" },
    take: opts.take,
  });
  return meetings.map(({ records, ...m }) => ({ ...m, counts: countsOf(records) }));
}

/** Visiting clubs (prospects excluded), canonicalised against the club list. */
export async function guestsByClub(scope: "year" | "all") {
  const recs = await db.attendanceRecord.findMany({
    where: { isGuest: true, affiliation: { in: ["ROTARIAN", "ROTARACTOR"] }, clubName: { not: null }, ...(scope === "year" ? { meeting: { date: { gte: rotaryYearStart() } } } : {}) },
    select: { name: true, email: true, phone: true, affiliation: true, clubName: true, meeting: { select: { id: true, date: true } } },
  });
  const byClub = new Map<string, { club: string; district: string | null; type: string; visits: Set<string>; people: Set<string>; last: Date }>();
  for (const r of recs) {
    const listed = findClub(r.clubName!, r.affiliation === "ROTARIAN" ? "ROTARY" : "ROTARACT");
    const name = listed?.name ?? r.clubName!;
    const key = foldName(name);
    const row = byClub.get(key) ?? { club: name, district: listed?.district ?? null, type: listed?.type ?? (r.affiliation === "ROTARIAN" ? "ROTARY" : "ROTARACT"), visits: new Set(), people: new Set(), last: r.meeting.date };
    row.visits.add(`${r.meeting.id}|${(r.email || r.phone || r.name).toLowerCase()}`);
    row.people.add((r.email || r.phone || r.name).toLowerCase());
    if (r.meeting.date > row.last) row.last = r.meeting.date;
    byClub.set(key, row);
  }
  return [...byClub.values()]
    .map((r) => ({ club: r.club, district: r.district, type: r.type, visits: r.visits.size, people: r.people.size, lastVisit: r.last }))
    .sort((a, b) => b.visits - a.visits || +b.lastVisit - +a.lastVisit);
}

/** Each current member's attendance at weekly meetings this Rotary year (since they joined, if later). */
export async function memberRates() {
  const since = rotaryYearStart();
  const [members, weekly, attended] = await Promise.all([
    db.member.findMany({ where: { status: { in: ["ACTIVE", "PENDING"] } }, select: { id: true, memberNumber: true, membershipDate: true, person: { select: { name: true } }, buddyGroup: { select: { id: true, name: true } } }, orderBy: { person: { name: "asc" } } }),
    db.meeting.findMany({ where: { type: "WEEKLY", date: { gte: since } }, select: { id: true, date: true } }),
    db.attendanceRecord.findMany({ where: { memberId: { not: null }, meeting: { date: { gte: since } } }, select: { memberId: true, meetingId: true, meeting: { select: { date: true, type: true } } } }),
  ]);
  const weeklyIds = new Set(weekly.map((w) => w.id));
  return members.map((m) => {
    const from = m.membershipDate && m.membershipDate > since ? m.membershipDate : since;
    const expected = weekly.filter((w) => w.date >= from).length;
    const mine = attended.filter((a) => a.memberId === m.id);
    const weeklyAttended = new Set(mine.filter((a) => weeklyIds.has(a.meetingId)).map((a) => a.meetingId)).size;
    const last = mine.reduce<Date | null>((d, a) => (!d || a.meeting.date > d ? a.meeting.date : d), null);
    return { id: m.id, name: m.person.name, memberNumber: m.memberNumber, group: m.buddyGroup?.name ?? null, groupId: m.buddyGroup?.id ?? null, attended: weeklyAttended, expected, rate: expected ? Math.round((weeklyAttended / expected) * 100) : null, last };
  });
}

/** Members' weekly attendance this Rotary year, added up per buddy group (best first). */
export function ratesByGroup(rates: Awaited<ReturnType<typeof memberRates>>) {
  const groups = new Map<string, { group: string; groupId: string | null; members: number; attended: number; expected: number }>();
  for (const r of rates) {
    const key = r.groupId ?? "";
    const g = groups.get(key) || { group: r.group ?? "No buddy group", groupId: r.groupId, members: 0, attended: 0, expected: 0 };
    g.members++;
    g.attended += r.attended;
    g.expected += r.expected;
    groups.set(key, g);
  }
  return [...groups.entries()]
    .map(([key, g]) => ({ ...g, none: !key, rate: g.expected ? Math.round((g.attended / g.expected) * 100) : null }))
    .sort((a, b) => Number(a.none) - Number(b.none) || (b.rate ?? -1) - (a.rate ?? -1) || a.group.localeCompare(b.group));
}
