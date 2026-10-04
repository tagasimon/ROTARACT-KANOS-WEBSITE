import "server-only";
import { cache } from "react";
import type { OrgType } from "@prisma/client";
import { db } from "./db";
import { publicEvent, publicProject, personCardSelect } from "./queries";
import { FOCUS_AREAS } from "./admin/resources";

/**
 * Everything the Support page needs, built from the database only.
 * Nothing here is typed in by hand: every line traces back to a record with a source.
 */

/** One row per Rotary year: who led the club and what the record shows for that year. */
export const getTrackRecord = cache(async () => {
  const [years, presidents, milestones, achievements, events] = await Promise.all([
    db.rotaractYear.findMany({ orderBy: { startDate: "desc" }, include: { cover: true } }),
    db.leadershipAssignment.findMany({
      where: { role: { slug: "president" }, person: { isPublic: true } },
      include: { person: { select: personCardSelect } },
    }),
    db.projectMilestone.findMany({
      where: { project: publicProject, stage: { in: ["IMPLEMENTATION", "MILESTONE", "COMPLETION", "IMPACT", "FUNDRAISING", "PARTNERSHIP"] } },
      include: { project: { select: { slug: true, title: true } } },
      orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
    }),
    db.achievement.findMany({ where: { publishStatus: "PUBLISHED" }, orderBy: { date: "asc" } }),
    db.event.findMany({
      where: { ...publicEvent, organizer: { isSelf: true }, projectId: null, type: { in: ["SERVICE_PROJECT", "COMMUNITY_OUTREACH", "INTERNATIONAL", "FUNDRAISER"] } },
      select: { slug: true, title: true, date: true, yearId: true },
      orderBy: { date: "asc" },
    }),
  ]);
  const yearOf = (d: Date | null | undefined) => (d ? years.find((y) => d >= y.startDate && d <= y.endDate)?.id : undefined);
  return years
    .filter((y) => y.startDate <= new Date())
    .map((y) => {
      const president = presidents.find((p) => p.yearId === y.id) || null;
      const work = milestones.filter((m) => (m.yearId || yearOf(m.date)) === y.id);
      const extra = events.filter((e) => (e.yearId || yearOf(e.date)) === y.id);
      const awards = achievements.filter((a) => (a.yearId || yearOf(a.date)) === y.id);
      return { year: y, president, work, extra, awards };
    });
});

/** Which Rotary areas of focus the club's published projects cover. */
export const getFocusCoverage = cache(async () => {
  const projects = await db.project.findMany({ where: publicProject, select: { slug: true, title: true, focusAreas: true } });
  return FOCUS_AREAS.map((area) => ({ area, projects: projects.filter((p) => p.focusAreas.includes(area)) }));
});

const GROUPS: { label: string; types: OrgType[] }[] = [
  { label: "Rotary & Rotaract family", types: ["ROTARY_CLUB", "ROTARACT_CLUB", "ROTARY_DISTRICT", "ROTARACT_DISTRICT", "ROTARY_INTERNATIONAL"] },
  { label: "Companies", types: ["CORPORATE", "MEDIA"] },
  { label: "NGOs & government", types: ["NGO", "GOVERNMENT", "COMMUNITY", "OTHER"] },
  { label: "Schools & institutions", types: ["SCHOOL"] },
];

/** Organisations that have partnered on at least one published project. */
export const getPartnerGroups = cache(async () => {
  const partners = await db.projectPartner.findMany({
    where: { project: publicProject, organization: { isSelf: false } },
    include: { organization: true, project: { select: { slug: true, title: true } } },
  });
  const byOrg = new Map<string, { name: string; type: OrgType; website: string | null; projects: { slug: string; title: string }[]; roles: string[] }>();
  for (const p of partners) {
    const o = byOrg.get(p.organizationId) || { name: p.organization.name, type: p.organization.type, website: p.organization.website, projects: [], roles: [] };
    if (!o.projects.some((x) => x.slug === p.project.slug)) o.projects.push(p.project);
    if (p.role && !o.roles.includes(p.role)) o.roles.push(p.role);
    byOrg.set(p.organizationId, o);
  }
  const all = [...byOrg.values()].sort((a, b) => b.projects.length - a.projects.length || a.name.localeCompare(b.name));
  return { total: all.length, groups: GROUPS.map((g) => ({ label: g.label, orgs: all.filter((o) => g.types.includes(o.type)) })).filter((g) => g.orgs.length) };
});

/** Projects that are asking for support right now (have support needs and aren't finished). */
export const getOpenNeeds = cache(async () =>
  db.project.findMany({
    where: { ...publicProject, supportNeeds: { not: null }, status: { not: "COMPLETED" } },
    include: { cover: true, year: true, milestones: { select: { date: true }, orderBy: { date: "asc" }, take: 1 } },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
  }),
);

/** A before/after pair for a project, preferring two photos from the same post. */
export async function getBeforeAfter(projectId: string) {
  const media = await db.media.findMany({ where: { projectId, phase: { not: null } }, orderBy: [{ date: "desc" }, { sortOrder: "asc" }] });
  const befores = media.filter((m) => m.phase === "BEFORE");
  const afters = media.filter((m) => m.phase === "AFTER" || m.phase === "CURRENT");
  for (const b of befores) {
    const a = afters.find((x) => x.sourceUrl && x.sourceUrl === b.sourceUrl);
    if (a) return { before: b, after: a };
  }
  return befores[0] && afters[0] ? { before: befores[befores.length - 1], after: afters[0] } : null;
}
