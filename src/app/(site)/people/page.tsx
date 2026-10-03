import type { Metadata } from "next";
import Link from "next/link";
import type { PersonType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { personCardSelect, publicPerson } from "@/lib/queries";
import { PageHero, Empty } from "@/components/site/Section";
import { PersonCard } from "@/components/site/Cards";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "The People Behind the Club",
  description: "Members, leaders and friends of Rotaract Club Kampala North: young professionals who use their skills to serve.",
  alternates: { canonical: "/people" },
};

const GROUPS: { key: string; label: string; types: PersonType[] }[] = [
  { key: "members", label: "Rotaractors", types: ["MEMBER"] },
  { key: "district", label: "District leaders", types: ["DISTRICT_LEADER"] },
  { key: "friends", label: "Rotarians, guests & partners", types: ["ROTARIAN", "GUEST", "PARTNER_CONTACT", "COMMUNITY_LEADER", "OTHER"] },
];

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ group?: string; skill?: string; q?: string }> }) {
  const sp = await searchParams;
  const group = GROUPS.find((g) => g.key === sp.group) || GROUPS[0];
  const where: Prisma.PersonWhereInput = { ...publicPerson, type: { in: group.types } };
  if (sp.skill) where.skills = { some: { slug: sp.skill } };
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { professionalTitle: { contains: sp.q, mode: "insensitive" } }, { organization: { contains: sp.q, mode: "insensitive" } }];
  const [people, skills, counts] = await Promise.all([
    db.person.findMany({
      where,
      select: { ...personCardSelect, leadership: { include: { role: true, year: true }, orderBy: { year: { startDate: "desc" } }, take: 1 } },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      take: 300,
    }),
    db.skill.findMany({ where: { people: { some: publicPerson } }, orderBy: { name: "asc" } }),
    Promise.all(GROUPS.map((g) => db.person.count({ where: { ...publicPerson, type: { in: g.types } } }))),
  ]);
  return (
    <>
      <PageHero eyebrow="The people behind the club" title={<>A community of young<br />professionals who serve.</>} intro="Lawyers, engineers, accountants, designers, health workers and founders who give their Fridays, and their skills, to Kampala." />
      <section className="container-x py-14">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="People groups" className="flex flex-wrap gap-2">
            {GROUPS.map((g, i) => (
              <Link key={g.key} href={`/people?group=${g.key}`} aria-current={g.key === group.key ? "page" : undefined} className={cn("rounded-full border px-4 py-2 text-sm font-semibold", g.key === group.key ? "border-royal bg-royal text-paper" : "border-fg/20 hover:border-royal")}>
                {g.label} <span className="ml-1 opacity-60">{counts[i]}</span>
              </Link>
            ))}
          </nav>
          <form className="flex gap-2" role="search">
            <input type="hidden" name="group" value={group.key} />
            <label htmlFor="q" className="sr-only">Search people</label>
            <input id="q" name="q" defaultValue={sp.q} placeholder="Name, profession or company" className="input min-w-64" />
            <button className="btn-ink btn-sm">Search</button>
          </form>
        </div>
        {skills.length > 0 && (
          <div className="mb-12 flex flex-wrap items-center gap-2">
            <span className="eyebrow mr-2">Skill</span>
            {skills.map((s) => (
              <Link key={s.slug} href={`/people?group=${group.key}${sp.skill === s.slug ? "" : `&skill=${s.slug}`}`} className={cn("rounded-full border px-3 py-1 text-xs font-medium", sp.skill === s.slug ? "border-cranberry bg-cranberry text-paper" : "border-fg/15 hover:border-royal")}>
                {s.name}
              </Link>
            ))}
            <Link href="/skills" className="ml-2 text-xs font-semibold link-u">Skills directory →</Link>
          </div>
        )}
        {people.length ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 lg:grid-cols-5">
            {people.map((p) => {
              const l = p.leadership[0];
              return <PersonCard key={p.slug} p={p} role={l ? l.customTitle || l.role.title : undefined} year={l?.year.label} />;
            })}
          </div>
        ) : (
          <Empty title="No public profiles here yet">Members can create their profile after signing in, and admins can publish profiles from the CMS.</Empty>
        )}
      </section>
    </>
  );
}
