import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getPresidents, getSnapshot } from "@/lib/queries";
import { PageHero, SectionHead } from "@/components/site/Section";
import { Timeline } from "@/components/site/Timeline";
import { PersonCard } from "@/components/site/Cards";
import { MapEmbed } from "@/components/site/MapEmbed";
import { fmtDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Our Story",
  description: "The history of Rotaract Club Kampala North, from its 2014 charter to today: presidents, projects, partnerships and moments, each with its source.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const [s, snap, history, presidents, related] = await Promise.all([
    getSettings(),
    getSnapshot(),
    db.historyEntry.findMany({
      where: { publishStatus: "PUBLISHED" },
      orderBy: [{ date: "asc" }],
      include: { image: true, people: { where: { isPublic: true }, select: { slug: true, name: true } }, projects: { select: { slug: true, title: true } }, year: { select: { slug: true, label: true } } },
    }),
    getPresidents(),
    db.organization.findMany({ where: { isSelf: false, type: { in: ["ROTARY_CLUB", "ROTARACT_CLUB"] }, name: { contains: "Kampala North" } } }),
  ]);
  return (
    <>
      <PageHero
        eyebrow="Our story"
        title={<>A club with a past,<br />a present and a next chapter.</>}
        intro={<>Chartered on {s.charterDate ? fmtDate(s.charterDate) : "—"}, {s.clubName} has spent {snap.yearsOfService ?? "several"} years bringing young professionals together to serve Kampala. This is the record so far. Every entry links to its source, and anything not yet confirmed by the club is marked.</>}
      />

      <section className="border-b border-line">
        <div className="container-x grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Chartered", s.charterDate ? fmtDate(s.charterDate) : "—"],
            ["District", s.district],
            ["RI club ID", s.riClubId],
            ["We meet", `${s.meetingDay}s, ${s.meetingTime}`],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="eyebrow">{k}</p>
              <p className="mt-2 font-display text-2xl font-bold">{v}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x py-20 sm:py-28">
        <SectionHead index="01" eyebrow="The timeline" title="How we got here." intro="Founding, presidents, projects, partnerships and moments worth keeping." />
        <Timeline
          items={history.map((h) => ({ ...h, year: h.year }))}
          terminal={{ label: snap.currentYear ? `Rotaract year ${snap.currentYear}` : "Today", title: "The story continues.", description: "This archive grows as the club adds projects, milestones and memories through the CMS." }}
        />
      </section>

      <section className="grain bg-royal py-20 text-paper sm:py-28">
        <div className="container-x">
          <SectionHead dark index="02" eyebrow="Past presidents" title="The people who held the gavel." href="/leadership/past-presidents" hrefLabel="Past presidents archive" />
          {presidents.length ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5 [&_p]:text-paper/90">
              {presidents.map((p) => <PersonCard key={p.id} p={p.person} role="President" year={p.year.label} />)}
            </div>
          ) : (
            <p className="text-paper/70">Not recorded yet.</p>
          )}
        </div>
      </section>

      <section className="container-x grid gap-12 py-20 sm:py-28 lg:grid-cols-2">
        <div>
          <p className="eyebrow mb-4">Where to find us</p>
          <h2 className="text-4xl font-bold leading-tight">{s.meetingDay}s at {s.meetingTime}<br />{s.meetingVenue}</h2>
          <p className="mt-3 font-serif text-xl text-stone">{s.meetingAddress}</p>
          {related.length > 0 && (
            <div className="mt-10 rounded-sm border border-line bg-paper-2 p-6">
              <p className="eyebrow mb-3">Not to be confused with</p>
              <ul className="space-y-3 text-sm">
                {related.map((o) => (
                  <li key={o.id}>
                    <strong>{o.name}</strong>
                    {o.description && <span className="text-stone">: {o.description}</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-stone">{s.sponsorNote}</p>
            </div>
          )}
          <Link href="/get-involved" className="btn-primary mt-8">Visit a meeting</Link>
        </div>
        {s.meetingLat != null && s.meetingLng != null && <MapEmbed lat={s.meetingLat} lng={s.meetingLng} label={`${s.meetingVenue}, ${s.meetingAddress} (approximate pin)`} className="h-full min-h-80" />}
      </section>
    </>
  );
}
