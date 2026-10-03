import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getPresidents } from "@/lib/queries";
import { PageHero, Empty } from "@/components/site/Section";
import { Img, Monogram } from "@/components/site/Img";
import { SourceNote, VerificationBadge } from "@/components/site/Badges";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Past Presidents", description: "Every president of Rotaract Club Kampala North, year by year, with the projects and stories of their term.", alternates: { canonical: "/leadership/past-presidents" } };

export default async function PastPresidentsPage() {
  const [presidents, years] = await Promise.all([getPresidents(), db.rotaractYear.findMany({ orderBy: { startDate: "desc" } })]);
  const byYear = new Map(presidents.map((p) => [p.yearId, p]));
  const projectCounts = await db.project.groupBy({ by: ["yearId"], where: { publishStatus: "PUBLISHED" }, _count: true });
  const pc = new Map(projectCounts.map((x) => [x.yearId, x._count]));
  return (
    <>
      <PageHero eyebrow="Past presidents" title={<>Everyone who has<br />held the gavel.</>} intro="Pick a president to open everything recorded about their year: the board, the projects, the events and the stories. Gaps are years we haven't verified yet. If you can fill one, tell us." />
      <section className="container-x py-16">
        {presidents.length === 0 && <Empty title="No presidents recorded yet" />}
        <ol className="divide-y divide-line border-y border-line">
          {years.map((y) => {
            const p = byYear.get(y.id);
            return (
              <li key={y.id}>
                <Link href={`/years/${y.slug}`} className="group grid grid-cols-[5.5rem_1fr] items-center gap-5 py-5 sm:grid-cols-[9rem_6rem_1fr_auto] sm:gap-8">
                  <span className="font-cond text-sm font-semibold text-cranberry sm:text-base">{y.label}</span>
                  <div className="hidden aspect-square w-24 overflow-hidden rounded-sm bg-paper-2 sm:block">
                    {p ? <Img media={p.person.photo} alt={p.person.name} size="sm" sizes="6rem" className="size-full" fallback={<Monogram text={initials(p.person.name)} className="size-full [&_span]:text-3xl" />} /> : <div className="size-full" />}
                  </div>
                  <div className="min-w-0">
                    {p ? (
                      <>
                        <p className="font-display text-2xl font-bold leading-tight group-hover:text-cranberry sm:text-4xl">{p.person.name}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3"><VerificationBadge v={p.verification} /><SourceNote source={p.source} /></div>
                      </>
                    ) : (
                      <p className="font-serif text-lg italic text-stone-2">Not yet recorded</p>
                    )}
                  </div>
                  <span className="col-start-2 text-sm text-stone sm:col-start-auto">{pc.get(y.id) ? `${pc.get(y.id)} project${pc.get(y.id) === 1 ? "" : "s"}` : ""}</span>
                </Link>
              </li>
            );
          })}
        </ol>
        <p className="mt-8 text-sm text-stone">Know who led the club in a missing year? <Link href="/get-involved?type=CONTACT" className="link-u">Let us know</Link>, with a source if you have one.</p>
      </section>
    </>
  );
}
