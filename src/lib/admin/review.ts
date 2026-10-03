import "server-only";
import { db } from "@/lib/db";
import { similarity, daysBetween } from "@/lib/utils";

export type DupPair = { a: { id: string; title: string; date: Date; organizer: string | null; venue: string | null; source: string | null }; b: DupPair["a"]; score: number };

/** Likely duplicate events: similar title + close dates (+ same organizer / venue bonus). */
export async function findDuplicateEvents(windowDays = 3, threshold = 0.62) {
  const events = await db.event.findMany({
    where: { mergedIntoId: null, publishStatus: { not: "REJECTED" } },
    select: { id: true, title: true, date: true, venue: true, organizerId: true, source: true, organizer: { select: { name: true } } },
    orderBy: { date: "asc" },
  });
  const pairs: DupPair[] = [];
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i], b = events[j];
      if (daysBetween(a.date, b.date) > windowDays) break;
      let score = similarity(a.title, b.title);
      if (a.organizerId && a.organizerId === b.organizerId) score += 0.1;
      if (a.venue && b.venue && similarity(a.venue, b.venue) > 0.7) score += 0.1;
      if (daysBetween(a.date, b.date) < 0.5) score += 0.05;
      if (score >= threshold) {
        const m = (e: typeof a) => ({ id: e.id, title: e.title, date: e.date, organizer: e.organizer?.name ?? null, venue: e.venue, source: e.source });
        pairs.push({ a: m(a), b: m(b), score: Math.min(1, score) });
      }
    }
  }
  return pairs.sort((x, y) => y.score - x.score);
}

/** Merge `fromId` into `intoId`: move sources & links, fill blanks, mark the duplicate merged. */
export async function mergeEvents(intoId: string, fromId: string) {
  const [into, from] = await Promise.all([
    db.event.findUniqueOrThrow({ where: { id: intoId }, include: { people: { select: { id: true } } } }),
    db.event.findUniqueOrThrow({ where: { id: fromId }, include: { people: { select: { id: true } } } }),
  ]);
  const fill: Record<string, unknown> = {};
  for (const k of ["description", "startTime", "endTime", "endDate", "venue", "address", "latitude", "longitude", "onlineUrl", "registrationUrl", "coverId", "projectId", "organizerId", "sourceUrl", "externalId"] as const) {
    if ((into as Record<string, unknown>)[k] == null && (from as Record<string, unknown>)[k] != null) fill[k] = (from as Record<string, unknown>)[k];
  }
  await db.$transaction([
    db.eventSource.updateMany({ where: { eventId: fromId }, data: { eventId: intoId } }),
    db.media.updateMany({ where: { eventId: fromId }, data: { eventId: intoId } }),
    db.story.updateMany({ where: { eventId: fromId }, data: { eventId: intoId } }),
    db.socialPost.updateMany({ where: { eventId: fromId }, data: { eventId: intoId } }),
    db.photoAlbum.updateMany({ where: { eventId: fromId }, data: { eventId: intoId } }),
    db.achievement.updateMany({ where: { eventId: fromId }, data: { eventId: intoId } }),
    db.projectMilestone.updateMany({ where: { eventId: fromId }, data: { eventId: intoId } }),
    db.attendanceSession.updateMany({ where: { eventId: fromId }, data: { eventId: intoId } }),
    db.districtVisit.updateMany({ where: { eventId: fromId }, data: { eventId: intoId } }),
    db.event.update({ where: { id: intoId }, data: { ...fill, people: { connect: from.people.map((p) => ({ id: p.id })) } } }),
    db.event.update({ where: { id: fromId }, data: { mergedIntoId: intoId, publishStatus: "ARCHIVED" } }),
  ]);
  // keep at least a record of the duplicate's own provenance
  if (from.source || from.sourceUrl) {
    const has = await db.eventSource.count({ where: { eventId: intoId, sourceUrl: from.sourceUrl ?? undefined } });
    if (!has) await db.eventSource.create({ data: { eventId: intoId, source: from.source || "Merged duplicate", sourceUrl: from.sourceUrl, sourceType: from.sourceType, externalId: from.externalId, rawTitle: from.title } });
  }
}

/** Records missing the story sections that make a project page complete. */
export async function incompleteProjects() {
  const ps = await db.project.findMany({
    select: { id: true, title: true, need: true, impact: true, coverId: true, startDate: true, leadId: true, _count: { select: { milestones: true } } },
  });
  return ps
    .map((p) => ({
      id: p.id,
      title: p.title,
      missing: [!p.need && "need", !p.impact && "impact", !p.coverId && "cover photo", !p.startDate && "start date", !p.leadId && "project lead", !p._count.milestones && "milestones"].filter(Boolean) as string[],
    }))
    .filter((p) => p.missing.length);
}
