import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { personCardSelect, publicPerson } from "@/lib/queries";
import { PageHero, Empty } from "@/components/site/Section";
import { PersonCard } from "@/components/site/Cards";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Skills Directory",
  description: "The professional skills inside Rotaract Club Kampala North, from software and finance to law, medicine and design.",
  alternates: { canonical: "/skills" },
};

export default async function SkillsPage({ searchParams }: { searchParams: Promise<{ skill?: string }> }) {
  const { skill } = await searchParams;
  const skills = await db.skill.findMany({
    orderBy: { name: "asc" },
    include: { people: { where: { ...publicPerson, type: "MEMBER" }, select: personCardSelect, orderBy: { name: "asc" } } },
  });
  const withPeople = skills.filter((s) => s.people.length);
  const active = skill ? withPeople.filter((s) => s.slug === skill) : withPeople;
  const max = Math.max(1, ...withPeople.map((s) => s.people.length));
  return (
    <>
      <PageHero eyebrow="Skills directory" title={<>The skills<br />in the room.</>} intro="A club of young professionals who use what they do for a living to serve. Pick a skill to see who brings it." />
      <section className="container-x py-14">
        {withPeople.length === 0 ? (
          <Empty title="No skills listed yet">Members add skills to their profiles after signing in.</Empty>
        ) : (
          <>
            <ul className="mb-16 grid gap-x-10 gap-y-1 sm:grid-cols-2 lg:grid-cols-3" aria-label="Skills">
              {withPeople.map((s) => (
                <li key={s.slug}>
                  <Link href={skill === s.slug ? "/skills" : `/skills?skill=${s.slug}`} className={cn("group flex items-center gap-3 border-b border-line py-3", skill === s.slug && "text-cranberry")} aria-current={skill === s.slug ? "true" : undefined}>
                    <span className="flex-1 font-display text-xl font-bold group-hover:text-cranberry">{s.name}</span>
                    <span className="h-1.5 rounded-full bg-cranberry/70" style={{ width: `${(s.people.length / max) * 5}rem` }} aria-hidden />
                    <span className="w-6 text-right font-cond text-sm text-stone">{s.people.length}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {active.map((s) => (
              <div key={s.slug} className="mb-16">
                <h2 className="mb-6 text-3xl font-bold">{s.name}</h2>
                <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-4 lg:grid-cols-6">
                  {s.people.map((p) => <PersonCard key={p.slug} p={p} />)}
                </div>
              </div>
            ))}
          </>
        )}
      </section>
    </>
  );
}
