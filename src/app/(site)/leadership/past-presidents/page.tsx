import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getTrackRecord } from "@/lib/donor";
import { PageHero, Empty } from "@/components/site/Section";
import { Img, Monogram } from "@/components/site/Img";
import { SourceNote, VerificationBadge } from "@/components/site/Badges";
import { initials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Past Presidents",
  description: "Every president of Rotaract Club Kampala North, year by year, with what the club did in their term.",
  alternates: { canonical: "/leadership/past-presidents" },
};

export default async function PastPresidentsPage() {
  const record = await getTrackRecord();
  const recorded = record.filter((r) => r.president).length;
  return (
    <>
      <PageHero
        eyebrow="Past presidents"
        title={<>Everyone who has<br />held the gavel.</>}
        intro={`${recorded} presidents on record since the club's charter in 2014. Pick a year to open everything recorded about it: the board, the projects, the events and the stories. If you can confirm a year marked for verification, tell us.`}
      />
      <section className="container-x py-16">
        {recorded === 0 && <Empty title="No presidents recorded yet" />}
        <ol className="divide-y divide-line border-y border-line">
          {record.map(({ year, president: p, work, extra, awards }) => {
            const things = [...work.map((m) => m.title), ...extra.map((e) => e.title)];
            return (
              <li key={year.id} className="grid gap-5 py-8 sm:grid-cols-[9rem_8rem_1fr] sm:gap-8">
                <div>
                  <Link href={`/years/${year.slug}`} className="font-cond text-lg font-bold text-cranberry hover:underline">{year.label}</Link>
                  {year.isCurrent && <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-stone">Current year</p>}
                </div>
                <div className="aspect-[4/5] w-28 overflow-hidden rounded-sm bg-paper-2 sm:w-32">
                  {p ? <Img media={p.person.photo} alt={p.person.name} size="sm" sizes="8rem" className="size-full" fallback={<Monogram text={initials(p.person.name)} className="size-full [&_span]:text-3xl" />} /> : <div className="size-full" />}
                </div>
                <div className="min-w-0">
                  {p ? (
                    <>
                      <Link href={`/people/${p.person.slug}`} className="font-display text-3xl font-bold leading-tight hover:text-cranberry sm:text-4xl">{p.person.name}</Link>
                      {p.customTitle && p.customTitle !== "President" && <p className="mt-1 text-sm font-semibold text-royal">{p.customTitle.replace(/^President\s*/, "").replace(/^\(|\)$/g, "")}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-3"><VerificationBadge v={p.verification} /><SourceNote source={p.source} url={p.sourceUrl} /></div>
                      {p.highlights && <p className="mt-3 max-w-3xl font-serif text-lg leading-snug text-charcoal">{p.highlights}</p>}
                    </>
                  ) : (
                    <p className="font-serif text-lg italic text-stone">Not yet recorded</p>
                  )}
                  {things.length > 0 && (
                    <div className="mt-4">
                      <p className="eyebrow mb-1.5">That year</p>
                      <p className="text-[0.95rem] leading-relaxed text-charcoal">{things.slice(0, 5).join(" · ")}{things.length > 5 && <> · <Link href={`/years/${year.slug}`} className="link-u">{things.length - 5} more</Link></>}</p>
                    </div>
                  )}
                  {awards.length > 0 && <p className="mt-2 text-sm font-semibold text-royal">★ {awards.map((a) => a.title).join(" · ")}</p>}
                  <Link href={`/years/${year.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold hover:text-azure">The year that was <ArrowUpRight className="size-4" aria-hidden /></Link>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-8 text-sm text-stone">Know who led the club in a missing year? <Link href="/get-involved?type=CONTACT" className="link-u">Let us know</Link>, with a source if you have one.</p>
      </section>
    </>
  );
}
