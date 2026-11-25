import "server-only";
import type { EventFeed, EventType, Prisma } from "@prisma/client";
import { db } from "./db";
import { similarity, slugify } from "./utils";
import { rotaryYearBounds, yearIdForDate } from "./years";

/**
 * Automated event discovery.
 * Reads only structured public formats (iCalendar, RSS, JSON Feed). It never scrapes
 * HTML or social-media pages. Pipeline per feed:
 *   fetch → parse → normalise → skip stale → match existing source record →
 *   detect duplicates → categorise → save with provenance → publish (trusted) or queue for review.
 */

export type RawEvent = {
  externalId: string;
  title: string;
  start: Date;
  end?: Date | null;
  allDay: boolean;
  location?: string | null;
  description?: string | null;
  url?: string | null;
};

// ── parsers ──────────────────────────────────────────────

function icsDate(value: string, params: string): { d: Date; allDay: boolean } | null {
  const v = value.trim();
  if (/VALUE=DATE(?!-)/.test(params) || /^\d{8}$/.test(v)) {
    const m = v.match(/^(\d{4})(\d{2})(\d{2})/);
    return m ? { d: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) - 3 * 3600000), allDay: true } : null;
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return null;
  const [, y, mo, da, h, mi, s, z] = m;
  const utc = Date.UTC(+y, +mo - 1, +da, +h, +mi, +(s || 0));
  // floating or TZID times: assume Kampala (UTC+3) — all district calendars are local
  return { d: new Date(z ? utc : utc - 3 * 3600000), allDay: false };
}

export function parseICS(text: string): RawEvent[] {
  const lines = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  const out: RawEvent[] = [];
  let cur: Record<string, { v: string; p: string }> | null = null;
  const unesc = (s: string) => s.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT" && cur) {
      const st = cur.DTSTART && icsDate(cur.DTSTART.v, cur.DTSTART.p);
      if (st && cur.SUMMARY) {
        const en = cur.DTEND && icsDate(cur.DTEND.v, cur.DTEND.p);
        out.push({
          externalId: cur.UID?.v || `${cur.SUMMARY.v}-${cur.DTSTART.v}`,
          title: unesc(cur.SUMMARY.v),
          start: st.d,
          end: en ? (st.allDay ? new Date(en.d.getTime() - 86400000) : en.d) : null,
          allDay: st.allDay,
          location: cur.LOCATION ? unesc(cur.LOCATION.v) : null,
          description: cur.DESCRIPTION ? unesc(cur.DESCRIPTION.v) : null,
          url: cur.URL?.v || null,
        });
      }
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const [name, ...params] = line.slice(0, idx).split(";");
      cur[name.toUpperCase()] = { v: line.slice(idx + 1), p: params.join(";") };
    }
  }
  return out;
}

const tag = (xml: string, t: string) => {
  const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, "i"));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : null;
};

export function parseRSS(text: string): RawEvent[] {
  const items = text.match(/<(item|entry)[\s>][\s\S]*?<\/(item|entry)>/gi) || [];
  return items
    .map((it) => {
      const title = tag(it, "title");
      const link = tag(it, "link") || it.match(/<link[^>]*href="([^"]+)"/i)?.[1] || null;
      const date = tag(it, "ev:startdate") || tag(it, "startDate") || tag(it, "pubDate") || tag(it, "published") || tag(it, "updated");
      if (!title || !date || Number.isNaN(Date.parse(date))) return null;
      return { externalId: tag(it, "guid") || tag(it, "id") || link || `${title}-${date}`, title, start: new Date(date), allDay: !/T\d|:\d\d/.test(date), description: tag(it, "description") || tag(it, "summary"), url: link, location: tag(it, "ev:location") };
    })
    .filter(Boolean) as RawEvent[];
}

export function parseJSONFeed(text: string): RawEvent[] {
  const j = JSON.parse(text) as { items?: Record<string, unknown>[] };
  return (j.items || [])
    .map((it) => {
      const ev = (it._event || {}) as Record<string, string>;
      const start = ev.start || (it.date_published as string);
      if (!it.title || !start) return null;
      return { externalId: String(it.id || it.url || `${it.title}-${start}`), title: String(it.title), start: new Date(start), end: ev.end ? new Date(ev.end) : null, allDay: !/T/.test(start), location: ev.location || null, description: (it.content_text as string) || null, url: (it.url as string) || null };
    })
    .filter(Boolean) as RawEvent[];
}

// ── categorisation ───────────────────────────────────────

const RULES: [RegExp, EventType][] = [
  [/district conference|discon/i, "DISTRICT_CONFERENCE"],
  [/assembly/i, "DISTRICT_ASSEMBLY"],
  [/pets|seminar|training|workshop|webinar|learning/i, "DISTRICT_TRAINING"],
  [/official visit|governor.*visit|drr.*visit|club visit/i, "OFFICIAL_VISIT"],
  [/installation|handover/i, "INSTALLATION"],
  [/induction/i, "INDUCTION"],
  [/fundrais|charity|dinner|gala|run\b|marathon/i, "FUNDRAISER"],
  [/tree|clean|outreach|donation|blood|medical camp|health camp|polio|community/i, "COMMUNITY_OUTREACH"],
  [/career|mentor|vocational|professional|pld/i, "PROFESSIONAL_DEVELOPMENT"],
  [/football|sport|tournament|games/i, "SPORTS"],
  [/fellowship|caravan|takeover|take over|hangout/i, "FELLOWSHIP"],
  [/forum|summit|leadership/i, "LEADERSHIP"],
  [/convention|international|africa|zone/i, "INTERNATIONAL"],
];
export function categorise(title: string, fallback: EventType): EventType {
  for (const [re, t] of RULES) if (re.test(title)) return t;
  return fallback;
}

// ── pipeline ─────────────────────────────────────────────

async function fetchText(url: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "KampalaNorthRotaract-EventDiscovery/1.0 (+contact via club website)", Accept: "text/calendar, application/rss+xml, application/feed+json, application/json, text/xml, */*" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

async function uniqueEventSlug(base: string) {
  const root = slugify(base) || "event";
  for (let i = 1; i < 50; i++) {
    const s = i === 1 ? root : `${root}-${i}`;
    if (!(await db.event.findUnique({ where: { slug: s }, select: { id: true } }))) return s;
  }
  return `${root}-${Date.now()}`;
}

export type FeedResult = { feed: string; found: number; created: number; matched: number; duplicates: number; skipped: number; error?: string };

export async function processFeed(feed: EventFeed, rawOverride?: string): Promise<FeedResult> {
  const res: FeedResult = { feed: feed.name, found: 0, created: 0, matched: 0, duplicates: 0, skipped: 0 };
  try {
    if (feed.kind === "MANUAL") throw new Error("Manual source: nothing to fetch. Add an ICS/RSS/JSON feed URL to automate it.");
    const text = rawOverride ?? (await fetchText(feed.url));
    const raw = feed.kind === "ICS" ? parseICS(text) : feed.kind === "RSS" ? parseRSS(text) : parseJSONFeed(text);
    res.found = raw.length;
    const cutoff = Date.now() - 30 * 86400000;
    for (const r of raw) {
      if (r.start.getTime() < cutoff) { res.skipped++; continue; }
      const title = r.title.trim().slice(0, 200);
      const existingSrc = await db.eventSource.findUnique({ where: { feedId_externalId: { feedId: feed.id, externalId: r.externalId } } });
      if (existingSrc) {
        await db.eventSource.update({ where: { id: existingSrc.id }, data: { lastChecked: new Date(), rawTitle: title } });
        await db.event.update({ where: { id: existingSrc.eventId }, data: { lastCheckedAt: new Date() } });
        res.matched++;
        continue;
      }
      // duplicate detection across all sources: similar title, ±1 day, organizer/venue bonus
      const near = await db.event.findMany({
        where: { mergedIntoId: null, date: { gte: new Date(r.start.getTime() - 1.5 * 86400000), lte: new Date(r.start.getTime() + 1.5 * 86400000) } },
        select: { id: true, title: true, organizerId: true, venue: true },
      });
      const dup = near
        .map((e) => ({ e, score: similarity(e.title, title) + (feed.organizerId && e.organizerId === feed.organizerId ? 0.1 : 0) + (r.location && e.venue && similarity(r.location, e.venue) > 0.7 ? 0.1 : 0) }))
        .sort((a, b) => b.score - a.score)[0];
      const sourceData = { feedId: feed.id, source: feed.name, sourceUrl: r.url || feed.url, sourceType: "FEED", externalId: r.externalId, rawTitle: title, rawData: { ...r, start: r.start.toISOString(), end: r.end?.toISOString() ?? null } as Prisma.InputJsonValue };
      if (dup && dup.score >= 0.72) {
        await db.eventSource.create({ data: { eventId: dup.e.id, ...sourceData } });
        res.duplicates++;
        continue;
      }
      const trusted = feed.trust === "TRUSTED";
      const date = r.allDay ? r.start : new Date(rotaryDateOnly(r.start));
      await db.event.create({
        data: {
          slug: await uniqueEventSlug(`${title}-${new Date(r.start.getTime() + 3 * 3600000).toISOString().slice(0, 10)}`),
          title,
          description: r.description?.slice(0, 5000) || null,
          date,
          startTime: r.allDay ? null : r.start,
          endTime: !r.allDay && r.end ? r.end : null,
          endDate: r.allDay && r.end && r.end.getTime() - r.start.getTime() >= 86400000 ? r.end : null,
          allDay: r.allDay,
          venue: r.location?.slice(0, 200) || null,
          organizerId: feed.organizerId,
          type: categorise(title, feed.defaultType),
          yearId: await yearIdForDate(r.start),
          publishStatus: trusted ? "PUBLISHED" : "IN_REVIEW",
          verification: trusted ? "VERIFIED" : "NEEDS_VERIFICATION",
          source: feed.name,
          sourceUrl: r.url || feed.url,
          sourceType: "FEED",
          externalId: r.externalId,
          importedAt: new Date(),
          lastCheckedAt: new Date(),
          sources: { create: sourceData },
        },
      });
      res.created++;
    }
    await db.eventFeed.update({ where: { id: feed.id }, data: { lastCheckedAt: new Date(), lastStatus: `OK: ${res.found} found, ${res.created} new, ${res.duplicates} duplicates, ${res.matched} known`, lastFoundCount: res.found } });
  } catch (e) {
    res.error = (e as Error).message;
    await db.eventFeed.update({ where: { id: feed.id }, data: { lastCheckedAt: new Date(), lastStatus: `Error: ${res.error}`.slice(0, 300) } });
  }
  return res;
}

/** Midnight (Kampala) of the given instant, as a UTC Date. */
function rotaryDateOnly(d: Date) {
  const k = new Date(d.getTime() + 3 * 3600000);
  return Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - 3 * 3600000;
}

/** Housekeeping that keeps the site current without anyone touching it. */
export async function housekeeping() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 36 * 3600000);
  const completed = await db.event.updateMany({
    where: { status: "SCHEDULED", date: { lt: yesterday }, OR: [{ endDate: null }, { endDate: { lt: yesterday } }] },
    data: { status: "COMPLETED" },
  });
  const visits = await db.districtVisit.updateMany({ where: { status: "CONFIRMED", date: { lt: yesterday } }, data: { status: "REPORTED" } });
  // Rotaract year rollover on 1 July: make sure the year exists and is flagged current
  const b = rotaryYearBounds(now);
  const cur = await db.rotaractYear.upsert({ where: { slug: b.slug }, create: { label: b.label, slug: b.slug, startDate: b.startDate, endDate: b.endDate }, update: {} });
  const flagged = await db.rotaractYear.findFirst({ where: { isCurrent: true } });
  // only roll over when the flagged year has ended (admins may switch early on purpose)
  if (!flagged || flagged.endDate < now) {
    await db.rotaractYear.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    await db.rotaractYear.update({ where: { id: cur.id }, data: { isCurrent: true } });
  }
  await db.session.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.rateLimit.deleteMany({ where: { resetAt: { lt: now } } });
  return { eventsCompleted: completed.count, visitsReported: visits.count, currentYear: b.label };
}

export async function runDiscovery() {
  const feeds = await db.eventFeed.findMany({ where: { active: true, kind: { not: "MANUAL" } } });
  const results: FeedResult[] = [];
  for (const f of feeds) results.push(await processFeed(f));
  const house = await housekeeping();
  return { results, housekeeping: house, ranAt: new Date().toISOString() };
}
