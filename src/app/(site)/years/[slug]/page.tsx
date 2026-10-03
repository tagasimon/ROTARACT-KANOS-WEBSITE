import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getYearReport } from "@/lib/queries";
import { fmtDate, fmtNumber, humanize } from "@/lib/utils";
import { Img } from "@/components/site/Img";
import { Empty } from "@/components/site/Section";
import { EventRow, PersonCard, ProjectCard, StoryCard } from "@/components/site/Cards";
import { Timeline, type TimelineItem } from "@/components/site/Timeline";
import { VerificationBadge } from "@/components/site/Badges";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const y = await db.rotaractYear.findUnique({ where: { slug } });
  return y ? { title: `${y.label}: The Year That Was`, description: `Rotaract Club Kampala North in ${y.label}: leadership, projects, events, achievements and memories.`, alternates: { canonical: `/years/${y.slug}` } } : {};
}

export default async function YearPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await getYearReport(slug);
  if (!r) notFound();
  const [prev, next] = await Promise.all([
    db.rotaractYear.findFirst({ where: { startDate: { lt: r.year.startDate } }, orderBy: { startDate: "desc" } }),
    db.rotaractYear.findFirst({ where: { startDate: { gt: r.year.startDate } }, orderBy: { startDate: "asc" } }),
  ]);

  const moments: TimelineItem[] = [
    ...r.history.map((h) => ({ id: "h" + h.id, date: h.date, dateLabel: h.dateLabel, title: h.title, description: h.description, kind: h.kind, image: h.image, verification: h.verification, source: h.source, sourceUrl: h.sourceUrl, people: h.people, projects: h.projects })),
    ...r.milestones.map((m) => ({ id: "m" + m.id, date: m.date, dateLabel: m.dateLabel, title: `${m.project.title}: ${m.title}`, description: m.description, kind: m.stage, image: m.image, verification: m.verification, source: m.source, sourceUrl: m.sourceUrl, projects: [m.project] })),
    ...r.visits.map((v) => ({ id: "v" + v.id, date: v.date, title: `${v.visitorTitle} visit: ${v.visitorName}`, description: v.summary, kind: "OFFICIAL_VISIT", verification: v.verification, source: v.source, sourceUrl: v.sourceUrl })),
  ]
    .filter((m, i, a) => a.findIndex((x) => x.title === m.title) === i)
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));

  const band = [
    { k: "The year", v: r.president?.person.name ?? "—", sub: "President", small: true },
    { k: "People", v: r.leadership.length ? String(r.leadership.length) : "—", sub: "Leaders on the board" },
    { k: "Service", v: String(r.projects.length), sub: "Projects" },
    { k: "Fellowship", v: String(r.events.length), sub: "Events on record" },
    { k: "Growth", v: r.newMembers ? `+${r.newMembers}` : "—", sub: "New members" },
    { k: "Impact", v: r.beneficiaries ? fmtNumber(r.beneficiaries) : "—", sub: "Beneficiaries" },
    { k: "Memories", v: String(r.media.length + r.albums.reduce((a, b) => a + b._count.media, 0)), sub: "Photos" },
    { k: "Moments", v: String(moments.length), sub: "On the timeline" },
  ];

  return (
    <>
      <header className="grain relative overflow-hidden bg-royal text-paper">
        {r.year.cover && <div className="absolute inset-0 opacity-35"><Img media={r.year.cover} alt="" priority size="xl" className="size-full" /></div>}
        <div className="container-x relative pb-16 pt-24">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-paper/60"><Link href="/years" className="hover:text-paper">Archive</Link></nav>
          <p className="eyebrow rise mb-4 text-gold">{r.year.isCurrent ? "The year so far" : "The year that was"}</p>
          <h1 className="rise rise-2 font-display text-[clamp(4rem,14vw,13rem)] font-bold leading-[1.02] tracking-tight">{r.year.label}</h1>
          {r.year.theme && <p className="rise rise-3 mt-6 font-serif text-3xl italic text-paper/80">“{r.year.theme}”</p>}
          {r.year.summary && <p className="rise rise-3 mt-4 max-w-2xl font-serif text-xl text-paper/70">{r.year.summary}</p>}
        </div>
      </header>

      {/* A YEAR IN ROTARACT */}
      <section aria-label="A year in Rotaract" className="border-b border-line bg-paper-2">
        <div className="container-x grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {band.map((b) => (
            <div key={b.k} className="bg-paper-2 py-7 pr-4 sm:px-5">
              <p className="eyebrow text-cranberry">{b.k}</p>
              <p className={b.small ? "mt-2 font-display text-2xl font-bold leading-tight" : "mt-2 font-display text-5xl font-bold tabular-nums"}>{b.v}</p>
              <p className="mt-1 text-sm text-stone">{b.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x py-16 sm:py-20">
        <div className="mb-8 flex items-end justify-between"><h2 className="text-4xl font-bold">Leadership</h2><Link href={`/leadership/${r.year.slug}`} className="link-u text-sm font-semibold">Full board →</Link></div>
        {r.leadership.length ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">{r.leadership.slice(0, 12).map((l) => <PersonCard key={l.id} p={l.person} role={l.customTitle || l.role.title} />)}</div>
        ) : (
          <Empty title="This year's board hasn't been recorded" />
        )}
      </section>

      {r.projects.length > 0 && (
        <section className="bg-paper-2 py-16 sm:py-20">
          <div className="container-x">
            <h2 className="mb-10 text-4xl font-bold">Service: projects</h2>
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">{r.projects.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
          </div>
        </section>
      )}

      {moments.length > 0 && (
        <section className="container-x py-16 sm:py-24">
          <h2 className="mb-14 text-4xl font-bold">Moments</h2>
          <Timeline items={moments} />
        </section>
      )}

      {r.events.length > 0 && (
        <section className="grain bg-royal py-16 text-paper sm:py-20">
          <div className="container-x grid gap-14 lg:grid-cols-3">
            {[["Fellowship", r.fellowship], ["Professional development", r.professional], ["Community service", r.service]].map(([t, list]) => (
              <div key={t as string}>
                <h2 className="mb-4 text-2xl font-bold">{t as string}</h2>
                {(list as typeof r.events).length ? (
                  <ul className="divide-y divide-paper/15 border-y border-paper/15">
                    {(list as typeof r.events).map((e) => (
                      <li key={e.id}><Link href={`/events/${e.slug}`} className="block py-3 hover:text-gold"><span className="font-cond text-xs text-paper/55">{fmtDate(e.date, { day: "numeric", month: "short" })}</span><span className="block font-semibold">{e.title}</span></Link></li>
                    ))}
                  </ul>
                ) : <p className="text-paper/50">None recorded.</p>}
              </div>
            ))}
          </div>
          <div className="container-x mt-14">
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-paper/70">All {r.events.length} events this year, including district events</summary>
              <div className="mt-4 border-b border-paper/15">{r.events.map((e) => <EventRow key={e.id} e={e} dark />)}</div>
            </details>
          </div>
        </section>
      )}

      {r.achievements.length > 0 && (
        <section className="container-x py-16 sm:py-20">
          <h2 className="mb-10 text-4xl font-bold">Achievements</h2>
          <ul className="grid gap-6 md:grid-cols-2">
            {r.achievements.map((a) => (
              <li key={a.id} className="border-t-2 border-royal pt-4">
                <p className="eyebrow">{a.date && fmtDate(a.date, { month: "long", year: "numeric" })}</p>
                <p className="mt-1 font-display text-xl font-bold">{a.title}</p>
                {a.description && <p className="mt-1 font-serif text-stone">{a.description}</p>}
                <VerificationBadge v={a.verification} className="mt-2" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {(r.attendanceSessions > 0 || r.activeMembers > 0) && (
        <section className="container-x pb-16">
          <div className="grid gap-6 rounded-sm border border-line bg-white p-6 sm:grid-cols-3">
            <div><p className="eyebrow">Meetings tracked</p><p className="font-display text-4xl font-bold">{r.attendanceSessions}</p></div>
            <div><p className="eyebrow">Average attendance</p><p className="font-display text-4xl font-bold">{r.avgAttendance ?? "—"}</p></div>
            <div><p className="eyebrow">Active members today</p><p className="font-display text-4xl font-bold">{r.activeMembers}</p></div>
          </div>
          <p className="mt-2 text-xs text-stone">Aggregate figures only. Individual attendance is private.</p>
        </section>
      )}

      {(r.stories.length > 0 || r.albums.length > 0) && (
        <section className="bg-paper-2 py-16 sm:py-20">
          <div className="container-x">
            {r.stories.length > 0 && (<><h2 className="mb-10 text-4xl font-bold">Stories</h2><div className="mb-16 grid gap-10 md:grid-cols-3">{r.stories.map((s) => <StoryCard key={s.id} s={s} />)}</div></>)}
            {r.albums.length > 0 && (
              <>
                <h2 className="mb-10 text-4xl font-bold">Memories</h2>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {r.albums.map((a) => (
                    <Link key={a.id} href={`/memories/${a.slug}`} className="group">
                      <div className="aspect-square overflow-hidden rounded-sm bg-paper-3"><Img media={a.cover} alt="" size="md" sizes="25vw" className="size-full transition-transform group-hover:scale-105" /></div>
                      <p className="mt-2 font-semibold">{a.title}</p>
                      <p className="text-xs text-stone">{humanize(a.category)} · {a._count.media} photos</p>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <nav aria-label="Other years" className="border-t border-line">
        <div className="container-x flex justify-between py-10">
          {prev ? <Link href={`/years/${prev.slug}`} className="group"><span className="eyebrow">Previous</span><span className="block font-display text-3xl font-bold group-hover:text-cranberry">← {prev.label}</span></Link> : <span />}
          {next ? <Link href={`/years/${next.slug}`} className="group text-right"><span className="eyebrow">Next</span><span className="block font-display text-3xl font-bold group-hover:text-cranberry">{next.label} →</span></Link> : <span />}
        </div>
      </nav>
    </>
  );
}
