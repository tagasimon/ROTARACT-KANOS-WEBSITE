import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getImpact } from "@/lib/queries";
import { PageHero, Empty } from "@/components/site/Section";
import { SourceNote, VerificationBadge } from "@/components/site/Badges";
import { Img } from "@/components/site/Img";
import { fmtDate, fmtNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "What We Have Achieved", description: "Achievements and impact of Rotaract Club Kampala North, each backed by a source.", alternates: { canonical: "/achievements" } };

export default async function AchievementsPage() {
  const [impact, achievements] = await Promise.all([
    getImpact(),
    db.achievement.findMany({ where: { publishStatus: "PUBLISHED" }, include: { year: true, image: true, project: { select: { slug: true, title: true } }, person: { select: { slug: true, name: true } }, event: { select: { slug: true, title: true } } }, orderBy: { date: "desc" } }),
  ]);
  const byYear = achievements.reduce<Record<string, typeof achievements>>((acc, a) => ((acc[a.year?.label || "Undated"] ||= []).push(a), acc), {});
  return (
    <>
      <PageHero eyebrow="What we have achieved" title={<>Our impact,<br />by the numbers.</>} intro="We only publish figures backed by club records or public sources. Anything still awaiting confirmation is marked." />
      <section className="container-x py-16">
        <h2 className="mb-8 text-3xl font-bold">Our impact</h2>
        {impact.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4">
            {impact.map((m) => (
              <div key={m.key} className="rounded-sm border-t-4 border-cranberry bg-paper-2 p-6">
                <p className="font-display text-5xl font-bold tabular-nums">{fmtNumber(m.value)}<span className="ml-1 text-xl text-stone">{m.unit}</span></p>
                <p className="mt-2 font-semibold">{m.label}</p>
                {m.description && <p className="text-sm text-stone">{m.description}</p>}
                {!m.verified && <VerificationBadge v="NEEDS_VERIFICATION" className="mt-3" />}
                <SourceNote source={m.source} url={m.sourceUrl} className="mt-3" />
              </div>
            ))}
          </div>
        ) : (
          <Empty title="Impact metrics will appear as projects record them" />
        )}
      </section>
      <section className="container-x pb-20">
        {Object.entries(byYear).map(([year, list]) => (
          <div key={year} className="mb-14 grid gap-6 md:grid-cols-12">
            <h2 className="font-display text-4xl font-bold tracking-tight text-cranberry md:col-span-3">{year}</h2>
            <ul className="divide-y divide-line border-y border-line md:col-span-9">
              {list.map((a) => (
                <li key={a.id} className="grid gap-4 py-6 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="eyebrow">{a.date && fmtDate(a.date, { month: "long", year: "numeric" })}</p>
                    <h3 className="mt-1 text-2xl font-bold">{a.title}</h3>
                    {a.description && <p className="mt-2 font-serif text-lg text-stone">{a.description}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                      {a.project && <Link className="link-u" href={`/projects/${a.project.slug}`}>{a.project.title}</Link>}
                      {a.person && <Link className="link-u" href={`/people/${a.person.slug}`}>{a.person.name}</Link>}
                      {a.event && <Link className="link-u" href={`/events/${a.event.slug}`}>{a.event.title}</Link>}
                      <VerificationBadge v={a.verification} />
                      <SourceNote source={a.source} url={a.sourceUrl} />
                    </div>
                  </div>
                  {a.image ? <Img media={a.image} size="sm" className="aspect-square w-28 rounded-sm" /> : a.metricValue != null ? <div className="text-right"><p className="font-display text-5xl font-bold">{fmtNumber(a.metricValue)}</p><p className="text-xs text-stone">{a.metricLabel}</p></div> : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
}
