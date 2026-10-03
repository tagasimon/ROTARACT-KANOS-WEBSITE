import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { PageHero } from "@/components/site/Section";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "The Archive", description: "Browse every Rotaract year of Rotaract Club Kampala North: leaders, projects, events, stories and photographs.", alternates: { canonical: "/years" } };

export default async function YearsPage() {
  const years = await db.rotaractYear.findMany({
    orderBy: { startDate: "desc" },
    include: {
      leadership: { where: { role: { slug: "president" }, person: { isPublic: true } }, include: { person: { select: { name: true } } } },
      _count: { select: { projects: { where: { publishStatus: "PUBLISHED" } }, events: { where: { publishStatus: "PUBLISHED", mergedIntoId: null } }, stories: { where: { publishStatus: "PUBLISHED" } }, history: true, achievements: true } },
    },
  });
  return (
    <>
      <PageHero eyebrow="The archive" title={<>Every year,<br />on the record.</>} intro="A Rotaract year runs from 1 July to 30 June. Pick one to see who led, what was built, what happened at fellowship and what the club achieved." />
      <section className="container-x py-16">
        <ul className="grid gap-px overflow-hidden rounded-sm bg-line sm:grid-cols-2 lg:grid-cols-3">
          {years.map((y) => {
            const total = y._count.projects + y._count.events + y._count.stories + y._count.history + y._count.achievements;
            return (
              <li key={y.id}>
                <Link href={`/years/${y.slug}`} className={cn("group flex h-full flex-col justify-between p-7 transition-colors", y.isCurrent ? "bg-royal text-paper" : "bg-paper hover:bg-paper-2")}>
                  <div>
                    {y.isCurrent && <p className="eyebrow mb-3 text-gold">Current year</p>}
                    <p className="font-display text-5xl font-bold tracking-tight group-hover:text-cranberry">{y.label}</p>
                    <p className={cn("mt-3 font-serif text-lg", y.isCurrent ? "text-paper/75" : "text-stone")}>
                      {y.leadership[0] ? <>President: {y.leadership[0].person.name}</> : <span className="italic opacity-70">President not yet recorded</span>}
                    </p>
                    {y.theme && <p className="mt-1 text-sm italic opacity-70">“{y.theme}”</p>}
                  </div>
                  <p className={cn("mt-8 font-cond text-xs", y.isCurrent ? "text-paper/55" : "text-stone")}>
                    {total ? [y._count.projects && `${y._count.projects} projects`, y._count.events && `${y._count.events} events`, y._count.stories && `${y._count.stories} stories`, y._count.history && `${y._count.history} moments`].filter(Boolean).join(" · ") : "Nothing archived yet"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
