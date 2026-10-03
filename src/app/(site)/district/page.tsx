import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentYear } from "@/lib/years";
import { getLeadershipForYear, getUpcomingEvents, startOfToday } from "@/lib/queries";
import { PageHero, Empty } from "@/components/site/Section";
import { Countdown } from "@/components/site/Countdown";
import { EventRow } from "@/components/site/Cards";
import { SourceNote, StatusPill, VerificationBadge } from "@/components/site/Badges";
import { fmtDate, fmtTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "District Visits",
  description: "District Governor, DRR and Assistant Governor visits to Rotaract Club Kampala North, plus Rotary District 9213 events.",
  alternates: { canonical: "/district" },
};

export default async function DistrictPage() {
  const today = startOfToday();
  const year = await getCurrentYear();
  const [upcoming, archive, leaders, districtEvents] = await Promise.all([
    db.districtVisit.findMany({ where: { date: { gte: today }, status: { not: "COMPLETED" } }, orderBy: { date: "asc" } }),
    db.districtVisit.findMany({ where: { OR: [{ date: { lt: today } }, { status: "COMPLETED" }] }, orderBy: { date: "desc" }, include: { year: true, event: { select: { slug: true } } } }),
    year ? getLeadershipForYear(year.id, "district") : Promise.resolve([]),
    getUpcomingEvents(12, { organizer: { type: { in: ["ROTARACT_DISTRICT", "ROTARY_DISTRICT", "ROTARY_INTERNATIONAL"] } } }),
  ]);
  const next = upcoming.find((v) => v.status !== "CANCELLED");
  const rest = upcoming.filter((v) => v !== next);
  const top = leaders.filter((l) => ["district-governor", "district-rotaract-representative", "assistant-district-rotaract-representative"].includes(l.role.slug));

  return (
    <>
      <PageHero eyebrow="District visits" title={<>Kampala North<br />and District 9213.</>} intro="Official visits from the District Governor, the District Rotaract Representative and their teams, plus what's coming up across the district. We only list visits that have been announced or reported." />

      <section className="grain bg-cranberry py-16 text-paper sm:py-24">
        <div className="container-x">
          <p className="eyebrow mb-4 text-paper/60">Next visit</p>
          {next ? (
            <div className="grid gap-10 lg:grid-cols-2 lg:items-end">
              <div>
                <h2 className="text-5xl font-bold leading-none sm:text-6xl">{next.visitorName}</h2>
                <p className="mt-3 font-serif text-2xl text-paper/80">{next.visitorTitle}</p>
                <p className="mt-4 text-paper/70">{fmtDate(next.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}{next.startTime && ` · ${fmtTime(next.startTime)}`}{next.venue && ` · ${next.venue}`}</p>
                <div className="mt-5 flex flex-wrap items-center gap-3"><StatusPill status={next.status} dark /><VerificationBadge v={next.verification} dark /><SourceNote source={next.source} url={next.sourceUrl} className="text-paper/50" /></div>
              </div>
              <Countdown to={(next.startTime || next.date).toISOString()} dark />
            </div>
          ) : (
            <div>
              <h2 className="text-4xl font-bold sm:text-5xl">No visit on the calendar yet.</h2>
              <p className="mt-4 max-w-xl font-serif text-xl text-paper/70">When a District Governor or DRR visit is confirmed, it appears here with a countdown. We never list a visit that hasn't been announced.</p>
            </div>
          )}
        </div>
      </section>

      {top.length > 0 && year && (
        <section className="container-x py-14">
          <p className="eyebrow mb-6">District leadership · {year.label}</p>
          <ul className="grid gap-6 sm:grid-cols-3">
            {top.map((l) => (
              <li key={l.id} className="border-t-2 border-royal pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone">{l.customTitle || l.role.title}</p>
                <Link href={`/people/${l.person.slug}`} className="font-display text-2xl font-bold hover:text-cranberry">{l.person.name}</Link>
                {l.person.organization && <p className="text-sm text-stone">{l.person.organization}</p>}
                <SourceNote url={l.sourceUrl} source={l.source} className="mt-2" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="container-x grid gap-16 py-14 lg:grid-cols-2">
        <div>
          <h2 className="mb-6 text-3xl font-bold">Upcoming visits</h2>
          {rest.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {rest.map((v) => (
                <li key={v.id} className="py-4">
                  <p className="font-cond text-sm text-cranberry">{fmtDate(v.date)}</p>
                  <p className="font-display text-xl font-bold">{v.visitorTitle}: {v.visitorName}</p>
                  <div className="mt-2 flex items-center gap-3"><StatusPill status={v.status} /><VerificationBadge v={v.verification} /></div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No other visits scheduled" />
          )}
          <h2 className="mb-6 mt-16 text-3xl font-bold">Visit archive</h2>
          {archive.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {archive.map((v) => (
                <li key={v.id} className="py-4">
                  <p className="font-cond text-sm text-stone">{fmtDate(v.date)} · {v.year?.label}</p>
                  <p className="font-display text-xl font-bold">{v.visitorTitle}: {v.visitorName}</p>
                  {v.summary && <p className="mt-1 font-serif text-stone">{v.summary}</p>}
                  <div className="mt-2 flex items-center gap-3"><StatusPill status={v.status} /><SourceNote source={v.source} url={v.sourceUrl} /></div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No visits archived yet">No public record of a District Governor or DRR visit to the club has been found so far. Admins can record visits in the CMS.</Empty>
          )}
        </div>
        <div>
          <h2 className="mb-6 text-3xl font-bold">Across the district</h2>
          {districtEvents.length ? <div className="border-b border-line">{districtEvents.map((e) => <EventRow key={e.id} e={e} />)}</div> : <Empty title="No district events listed" />}
          <Link href="/events?scope=rotaract" className="link-u mt-6 inline-block text-sm font-semibold">All district events →</Link>
        </div>
      </section>
    </>
  );
}
