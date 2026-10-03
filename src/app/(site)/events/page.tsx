import type { Metadata } from "next";
import Link from "next/link";
import type { OrgType, Prisma } from "@prisma/client";
import { CalendarPlus } from "lucide-react";
import { db } from "@/lib/db";
import { eventCardInclude, nextRegularMeeting, publicEvent, startOfToday, upcomingEventsWhere } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { PageHero, Empty } from "@/components/site/Section";
import { EventRow } from "@/components/site/Cards";
import { cn, fmtDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "What's Happening",
  description: "Upcoming Rotaract Club Kampala North meetings and Rotary-family events across District 9213, each labelled by organizer.",
  alternates: { canonical: "/events" },
};

const SCOPES: { key: string; label: string; types?: OrgType[]; self?: boolean }[] = [
  { key: "all", label: "Everything" },
  { key: "club", label: "Kampala North", self: true },
  { key: "rotaract", label: "Rotaract District", types: ["ROTARACT_DISTRICT"] },
  { key: "rotary", label: "Rotary District & RI", types: ["ROTARY_DISTRICT", "ROTARY_INTERNATIONAL"] },
  { key: "clubs", label: "Other clubs", types: ["ROTARACT_CLUB", "ROTARY_CLUB"] },
];

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ scope?: string; view?: string }> }) {
  const sp = await searchParams;
  const scope = SCOPES.find((s) => s.key === sp.scope) || SCOPES[0];
  const past = sp.view === "past";
  const orgFilter: Prisma.EventWhereInput = scope.self ? { organizer: { isSelf: true } } : scope.types ? { organizer: { type: { in: scope.types }, isSelf: false } } : {};
  const s = await getSettings();
  const events = await db.event.findMany({
    where: past ? { AND: [publicEvent, orgFilter, { date: { lt: startOfToday() } }] } : { AND: [upcomingEventsWhere(), orgFilter] },
    include: eventCardInclude,
    orderBy: { date: past ? "desc" : "asc" },
    take: 200,
  });
  const byMonth = events.reduce<Record<string, typeof events>>((acc, e) => ((acc[fmtDate(e.date, { month: "long", year: "numeric" })] ||= []).push(e), acc), {});
  const nextMeeting = nextRegularMeeting(s.meetingDay, s.meetingTime);

  return (
    <>
      <PageHero eyebrow="What's happening" title={<>Meetings, service days<br />and the wider Rotary family.</>} intro="Each event is labelled with its organizer, so you can always tell a Kampala North event from a district or Rotary one.">
        <div className="flex flex-wrap gap-3">
          <a href="/api/events.ics" className="btn-ghost-light btn-sm"><CalendarPlus className="size-4" aria-hidden /> Subscribe (iCal)</a>
        </div>
      </PageHero>
      <section className="container-x py-12">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Organizer" className="flex flex-wrap gap-2">
            {SCOPES.map((x) => (
              <Link key={x.key} href={`/events?scope=${x.key}${past ? "&view=past" : ""}`} aria-current={x.key === scope.key ? "page" : undefined} className={cn("rounded-full border px-4 py-2 text-sm font-semibold", x.key === scope.key ? "border-royal bg-royal text-paper" : "border-fg/20 hover:border-royal")}>
                {x.label}
              </Link>
            ))}
          </nav>
          <div className="flex gap-1 rounded-full border border-fg/20 p-1 text-sm font-semibold">
            <Link href={`/events?scope=${scope.key}`} className={cn("rounded-full px-4 py-1.5", !past && "bg-cranberry text-paper")}>Upcoming</Link>
            <Link href={`/events?scope=${scope.key}&view=past`} className={cn("rounded-full px-4 py-1.5", past && "bg-cranberry text-paper")}>Past</Link>
          </div>
        </div>

        {!past && nextMeeting && (scope.key === "all" || scope.key === "club") && (
          <div className="mb-12 flex flex-col justify-between gap-4 rounded-sm bg-royal p-6 text-paper sm:flex-row sm:items-center">
            <div>
              <p className="eyebrow text-paper/55">Every {s.meetingDay} · Rotaract Club Kampala North</p>
              <p className="mt-1 font-display text-2xl font-bold">Next weekly fellowship: {fmtDate(nextMeeting, { weekday: "long", day: "numeric", month: "long" })}, {s.meetingTime}</p>
              <p className="text-paper/65">{s.meetingVenue}, {s.meetingAddress}</p>
            </div>
            <Link href="/get-involved?type=ATTEND" className="btn-primary shrink-0">I'd like to attend</Link>
          </div>
        )}

        {events.length === 0 ? (
          <Empty title={past ? "No past events in this view" : "Nothing scheduled in this view"} />
        ) : (
          Object.entries(byMonth).map(([month, list]) => (
            <section key={month} className="mb-12" aria-labelledby={`m-${month}`}>
              <h2 id={`m-${month}`} className="sticky top-16 z-10 -mx-1 bg-paper/95 px-1 py-3 font-display text-2xl font-bold backdrop-blur">{month}</h2>
              <div className="border-b border-line">{list.map((e) => <EventRow key={e.id} e={e} />)}</div>
            </section>
          ))
        )}
      </section>
    </>
  );
}
