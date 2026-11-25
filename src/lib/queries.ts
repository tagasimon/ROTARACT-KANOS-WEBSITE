import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { getSettings } from "./settings";
import { getCurrentYear } from "./years";

// ── public visibility filters ──
export const publicPerson: Prisma.PersonWhereInput = { isPublic: true };
export const publicEvent: Prisma.EventWhereInput = { publishStatus: "PUBLISHED", mergedIntoId: null };
export const publicProject: Prisma.ProjectWhereInput = { publishStatus: "PUBLISHED" };
export const publicStory: Prisma.StoryWhereInput = { publishStatus: "PUBLISHED" };

export const personCardSelect = {
  slug: true,
  name: true,
  honorific: true,
  professionalTitle: true,
  organization: true,
  photo: true,
  verification: true,
  type: true,
} satisfies Prisma.PersonSelect;

export const eventCardInclude = {
  organizer: { select: { name: true, type: true, isSelf: true } },
} satisfies Prisma.EventInclude;

export function startOfToday() {
  // Kampala is UTC+3 with no DST
  const now = new Date(Date.now() + 3 * 3600000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 3 * 3600000);
}

export const upcomingEventsWhere = (): Prisma.EventWhereInput => ({
  ...publicEvent,
  status: { not: "CANCELLED" },
  OR: [{ date: { gte: startOfToday() } }, { endDate: { gte: startOfToday() } }],
});

export async function getUpcomingEvents(take = 6, extra: Prisma.EventWhereInput = {}) {
  return db.event.findMany({
    where: { AND: [upcomingEventsWhere(), extra] },
    include: eventCardInclude,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take,
  });
}

/** Club snapshot — every number is computed from the database. */
export const getSnapshot = cache(async () => {
  const s = await getSettings();
  const year = await getCurrentYear();
  const [members, projects, events, achievements, locations, communitiesMetric] = await Promise.all([
    db.member.count({ where: { status: "ACTIVE" } }),
    db.project.count({ where: publicProject }),
    db.event.count({ where: { ...publicEvent, organizer: { isSelf: true } } }),
    db.achievement.count({ where: { publishStatus: "PUBLISHED" } }),
    db.project.findMany({ where: { ...publicProject, locationName: { not: null } }, select: { locationName: true }, distinct: ["locationName"] }),
    db.impactMetric.findUnique({ where: { key: "communities_reached" } }),
  ]);
  const charter = s.charterDate ? new Date(s.charterDate) : null;
  const yearsOfService = charter ? Math.floor((Date.now() - charter.getTime()) / (365.25 * 86400000)) : null;
  const communities = communitiesMetric?.visible ? communitiesMetric.value : locations.length;
  // Until member records are entered, fall back to the documented roll count (an ImpactMetric with a key starting "members").
  let memberCount = members;
  let membersFromRoll = false;
  if (!memberCount) {
    const roll = await db.impactMetric.findFirst({ where: { key: { startsWith: "members" } }, orderBy: { asOf: "desc" } });
    if (roll) { memberCount = roll.value; membersFromRoll = true; }
  }
  return {
    founded: charter,
    foundedVerified: s.charterVerified,
    yearsOfService,
    members: memberCount,
    membersFromRoll,
    projects,
    events,
    achievements,
    communities,
    currentYear: year?.label ?? null,
    currentYearSlug: year?.slug ?? null,
  };
});

/** Our Impact — manual club metrics + project metrics summed by impactKey. */
export const getImpact = cache(async () => {
  const [manual, projectMetrics] = await Promise.all([
    db.impactMetric.findMany({ where: { visible: true }, orderBy: { sortOrder: "asc" } }),
    db.projectMetric.findMany({
      where: { showInImpact: true, impactKey: { not: null }, project: publicProject },
      select: { impactKey: true, label: true, value: true, unit: true, verification: true },
    }),
  ]);
  const grouped = new Map<string, { key: string; label: string; value: number; unit: string | null; projects: number; allVerified: boolean }>();
  for (const m of projectMetrics) {
    const k = m.impactKey!;
    const g = grouped.get(k) || { key: k, label: m.label, value: 0, unit: m.unit, projects: 0, allVerified: true };
    g.value += m.value;
    g.projects += 1;
    g.allVerified &&= m.verification === "VERIFIED";
    grouped.set(k, g);
  }
  const manualKeys = new Set(manual.map((m) => m.key));
  return [
    ...manual.map((m) => ({ key: m.key, label: m.label, value: m.value, unit: m.unit, description: m.description, verified: m.verification === "VERIFIED", source: m.source, sourceUrl: m.sourceUrl, fromProjects: 0 })),
    ...[...grouped.values()]
      .filter((g) => !manualKeys.has(g.key))
      .map((g) => ({ key: g.key, label: g.label, value: g.value, unit: g.unit, description: `Across ${g.projects} project${g.projects === 1 ? "" : "s"}`, verified: g.allVerified, source: null, sourceUrl: null, fromProjects: g.projects })),
  ];
});

export async function getLeadershipForYear(yearId: string, scope: "club" | "district" = "club") {
  return db.leadershipAssignment.findMany({
    where: { yearId, person: publicPerson, role: scope === "club" ? { category: { not: "DISTRICT" } } : { category: "DISTRICT" } },
    include: { person: { select: personCardSelect }, role: true, committee: true },
    orderBy: [{ role: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
}

export async function getPresidents() {
  return db.leadershipAssignment.findMany({
    where: { role: { slug: "president" }, person: publicPerson },
    include: { person: { select: personCardSelect }, year: true },
    orderBy: { year: { startDate: "desc" } },
  });
}

/** Year-in-review payload — powers /years/[slug] ("The Year That Was"). */
export async function getYearReport(slug: string) {
  const year = await db.rotaractYear.findUnique({ where: { slug }, include: { cover: true } });
  if (!year) return null;
  const range = { gte: year.startDate, lte: year.endDate };
  const [leadership, projects, milestones, events, stories, achievements, albums, media, newMembers, attendance, history, visits] = await Promise.all([
    getLeadershipForYear(year.id),
    db.project.findMany({ where: { ...publicProject, OR: [{ yearId: year.id }, { milestones: { some: { yearId: year.id } } }] }, include: { cover: true, year: true }, orderBy: { startDate: "asc" } }),
    db.projectMilestone.findMany({ where: { OR: [{ yearId: year.id }, { date: range }], project: publicProject }, include: { project: { select: { slug: true, title: true } }, image: true }, orderBy: { date: "asc" } }),
    db.event.findMany({ where: { ...publicEvent, OR: [{ yearId: year.id }, { date: range }] }, include: eventCardInclude, orderBy: { date: "asc" } }),
    db.story.findMany({ where: { ...publicStory, OR: [{ yearId: year.id }, { publishedAt: range }] }, include: { cover: true }, orderBy: { publishedAt: "desc" }, take: 12 }),
    db.achievement.findMany({ where: { publishStatus: "PUBLISHED", OR: [{ yearId: year.id }, { date: range }] }, include: { image: true, project: { select: { slug: true, title: true } } }, orderBy: { date: "asc" } }),
    db.photoAlbum.findMany({ where: { publishStatus: "PUBLISHED", OR: [{ yearId: year.id }, { date: range }] }, include: { cover: true, _count: { select: { media: true } } }, orderBy: { date: "asc" } }),
    db.media.findMany({ where: { kind: "IMAGE", OR: [{ yearId: year.id }, { date: range }] }, orderBy: { date: "asc" }, take: 12 }),
    db.member.count({ where: { membershipDate: range } }),
    db.meeting.findMany({ where: { type: "WEEKLY", date: range }, select: { id: true, _count: { select: { records: true } } } }),
    db.historyEntry.findMany({ where: { publishStatus: "PUBLISHED", OR: [{ yearId: year.id }, { date: range }] }, include: { image: true, people: { select: { slug: true, name: true } }, projects: { select: { slug: true, title: true } } }, orderBy: { date: "asc" } }),
    db.districtVisit.findMany({ where: { OR: [{ yearId: year.id }, { date: range }], status: { not: "CANCELLED" } }, orderBy: { date: "asc" } }),
  ]);
  const beneficiaries = await db.projectMetric.aggregate({
    _sum: { value: true },
    where: { impactKey: "beneficiaries", project: { OR: [{ yearId: year.id }, { milestones: { some: { yearId: year.id } } }] } },
  });
  const activeMembers = await db.member.count({ where: { status: "ACTIVE" } });
  const totalCheckins = attendance.reduce((a, s) => a + s._count.records, 0);
  const avgAttendance = attendance.length ? Math.round(totalCheckins / attendance.length) : null;
  const president = leadership.find((l) => l.role.slug === "president") || null;
  const byCategory = (types: string[]) => events.filter((e) => types.includes(e.type));
  return {
    year,
    president,
    leadership,
    projects,
    milestones,
    events,
    fellowship: byCategory(["FELLOWSHIP", "SOCIAL", "SPORTS", "NETWORKING", "CLUB_MEETING"]),
    professional: byCategory(["PROFESSIONAL_DEVELOPMENT", "CAREER", "TRAINING"]),
    service: byCategory(["SERVICE_PROJECT", "COMMUNITY_OUTREACH", "FUNDRAISER"]),
    stories,
    achievements,
    albums,
    media,
    newMembers,
    activeMembers,
    attendanceSessions: attendance.length,
    avgAttendance,
    beneficiaries: beneficiaries._sum.value,
    history,
    visits,
  };
}

/** The next regular weekly meeting computed from settings (so the site never looks empty). */
export function nextRegularMeeting(day: string, time: string) {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const target = days.indexOf(day.toLowerCase());
  if (target < 0) return null;
  const m = time.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  let h = m ? +m[1] : 18;
  const min = m?.[2] ? +m[2] : 0;
  if (m?.[3]?.toLowerCase() === "pm" && h < 12) h += 12;
  const nowK = new Date(Date.now() + 3 * 3600000); // Kampala wall clock
  const d = new Date(Date.UTC(nowK.getUTCFullYear(), nowK.getUTCMonth(), nowK.getUTCDate(), h, min));
  let add = (target - nowK.getUTCDay() + 7) % 7;
  if (add === 0 && nowK.getTime() > d.getTime() + 2 * 3600000) add = 7;
  d.setUTCDate(d.getUTCDate() + add);
  return new Date(d.getTime() - 3 * 3600000);
}
