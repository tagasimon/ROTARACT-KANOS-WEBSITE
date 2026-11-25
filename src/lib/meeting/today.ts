import "server-only";
import type { MeetingType } from "@prisma/client";
import { db } from "@/lib/db";
import { MEETING } from "./config";
import { meetingSettings } from "./settings";

const TZ = MEETING.TIMEZONE;
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The club-timezone calendar date and weekday of an instant. Never uses the server's own timezone. */
export function localParts(date = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(date).map((x) => [x.type, x.value]),
  );
  const y = +p.year, m = +p.month, d = +p.day;
  return { y, m, d, weekday: WD.indexOf(p.weekday), iso: `${p.year}-${p.month}-${p.day}` };
}

/** Minutes the club timezone is ahead of UTC at a given instant (works with daylight saving too). */
function offsetMinutes(at: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(at).map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** A wall-clock time in the club timezone ("2026-11-27", 18, 0) as a UTC instant. */
export function localToUtc(iso: string, hh = 0, mm = 0) {
  const [y, m, d] = iso.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let t = guess - offsetMinutes(new Date(guess)) * 60000;
  t = guess - offsetMinutes(new Date(t)) * 60000; // second pass settles a DST boundary
  return new Date(t);
}

/** Start and end (exclusive) of a club-timezone calendar day, as UTC instants. */
export function localDayRange(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return { start: localToUtc(iso), end: localToUtc(next) };
}

/** A DATE column value for a calendar day: midnight UTC of that date. */
export const dayValue = (iso: string) => new Date(`${iso}T00:00:00Z`);

type Plan = { title: string; type: MeetingType; date: Date; venue: string | null; eventId: string | null };

/** What the meeting on `now`'s Kampala day is called and when it starts. Also used when importing old sign-ins. */
export async function planMeetingFor(now: Date): Promise<Plan> {
  const { iso, weekday } = localParts(now);
  const { start, end } = localDayRange(iso);
  const ms = await meetingSettings();
  const [hh, mm] = ms.clock;
  const event = await db.event.findFirst({
    where: {
      publishStatus: "PUBLISHED",
      mergedIntoId: null,
      status: { not: "CANCELLED" },
      organizer: { isSelf: true },
      OR: [{ startTime: { gte: start, lt: end } }, { startTime: null, date: { gte: start, lt: end } }],
    },
    orderBy: [{ startTime: "asc" }, { date: "asc" }],
  });
  if (event)
    return {
      title: event.title,
      type: weekday === ms.weekday ? "WEEKLY" : "SPECIAL",
      date: event.startTime ?? localToUtc(iso, hh, mm),
      venue: event.venue || ms.venue,
      eventId: event.id,
    };
  if (weekday === ms.weekday) return { title: "Weekly meeting", type: "WEEKLY", date: localToUtc(iso, hh, mm), venue: ms.venue, eventId: null };
  return { title: "Club gathering", type: "GATHERING", date: now, venue: null, eventId: null };
}

/** Today's meeting (club timezone), created by the first sign-in of the day. Safe under concurrent sign-ins. */
export async function getOrCreateTodaysMeeting(now = new Date()) {
  const day = dayValue(localParts(now).iso);
  const existing = await db.meeting.findUnique({ where: { day } });
  if (existing) return existing;
  const plan = await planMeetingFor(now);
  // Several phones can scan at the same moment on the first sign-in of the day. ON CONFLICT DO
  // NOTHING lets exactly one insert win without raising (and logging) a unique-constraint error.
  await db.meeting.createMany({ data: [{ ...plan, day }], skipDuplicates: true });
  return db.meeting.findUniqueOrThrow({ where: { day } });
}

/** What today's meeting is (or will be called) without creating it. For the sign-in page heading. */
export async function previewTodaysMeeting(now = new Date()) {
  const existing = await db.meeting.findUnique({ where: { day: dayValue(localParts(now).iso) } });
  return existing ?? { ...(await planMeetingFor(now)), id: null as string | null };
}

/** The next published club event after now, for the "Coming up" box in emails. */
export function nextClubEvent(after = new Date()) {
  return db.event.findFirst({
    where: { publishStatus: "PUBLISHED", mergedIntoId: null, status: { not: "CANCELLED" }, organizer: { isSelf: true }, OR: [{ startTime: { gt: after } }, { startTime: null, date: { gt: after } }] },
    orderBy: [{ date: "asc" }],
    select: { title: true, slug: true, date: true, startTime: true, venue: true },
  });
}

/** "Friday 27 November 2026" and "6:00 PM" in the club timezone. */
export const longDate = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
export const clockTime = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(d);
