import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { publicEvent, publicProject, publicStory } from "@/lib/queries";
import { PageHero } from "@/components/site/Section";
import { fmtDate, humanize, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

const ci = (q: string) => ({ contains: q, mode: "insensitive" as const });

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q || "").trim().slice(0, 100);
  let groups: { title: string; items: { href: string; title: string; meta?: string; snippet?: string | null }[] }[] = [];
  if (q.length >= 2) {
    const [people, projects, milestones, events, stories, achievements, documents, committees, history, skills] = await Promise.all([
      db.person.findMany({ where: { isPublic: true, OR: [{ name: ci(q) }, { bio: ci(q) }, { professionalTitle: ci(q) }, { organization: ci(q) }, { expertise: ci(q) }, { interests: ci(q) }, { skills: { some: { name: ci(q) } } }] }, take: 12, include: { leadership: { include: { role: true, year: true }, take: 1, orderBy: { year: { startDate: "desc" } } } } }),
      db.project.findMany({ where: { ...publicProject, OR: [{ title: ci(q) }, { summary: ci(q) }, { tagline: ci(q) }, { need: ci(q) }, { impact: ci(q) }, { locationName: ci(q) }, { committee: { name: ci(q) } }] }, take: 12, include: { year: true } }),
      db.projectMilestone.findMany({ where: { project: publicProject, OR: [{ title: ci(q) }, { description: ci(q) }] }, take: 10, include: { project: { select: { slug: true, title: true } } } }),
      db.event.findMany({ where: { ...publicEvent, OR: [{ title: ci(q) }, { description: ci(q) }, { venue: ci(q) }, { organizer: { name: ci(q) } }] }, take: 12, include: { organizer: true }, orderBy: { date: "desc" } }),
      db.story.findMany({ where: { ...publicStory, OR: [{ title: ci(q) }, { excerpt: ci(q) }, { body: ci(q) }] }, take: 12 }),
      db.achievement.findMany({ where: { publishStatus: "PUBLISHED", OR: [{ title: ci(q) }, { description: ci(q) }] }, take: 10 }),
      db.document.findMany({ where: { isPublic: true, OR: [{ title: ci(q) }, { description: ci(q) }] }, take: 10 }),
      db.committee.findMany({ where: { OR: [{ name: ci(q) }, { description: ci(q) }, { focus: ci(q) }] }, take: 6, include: { projects: { where: publicProject, select: { slug: true, title: true }, take: 3 } } }),
      db.historyEntry.findMany({ where: { publishStatus: "PUBLISHED", OR: [{ title: ci(q) }, { description: ci(q) }] }, take: 8 }),
      db.skill.findMany({ where: { name: ci(q) }, take: 6 }),
    ]);
    groups = [
      { title: "Projects", items: projects.map((p) => ({ href: `/projects/${p.slug}`, title: p.title, meta: [humanize(p.status), p.year?.label].filter(Boolean).join(" · "), snippet: p.tagline || p.summary })) },
      { title: "People", items: people.map((p) => ({ href: `/people/${p.slug}`, title: p.name, meta: p.leadership[0] ? `${p.leadership[0].customTitle || p.leadership[0].role.title}, ${p.leadership[0].year.label}` : p.professionalTitle || undefined, snippet: p.bio })) },
      { title: "Skills", items: skills.map((s) => ({ href: `/skills?skill=${s.slug}`, title: s.name, meta: "Skills directory" })) },
      { title: "Events", items: events.map((e) => ({ href: `/events/${e.slug}`, title: e.title, meta: `${fmtDate(e.date)} · ${e.organizer?.name ?? ""}`, snippet: e.description })) },
      { title: "Stories", items: stories.map((s) => ({ href: `/stories/${s.slug}`, title: s.title, meta: humanize(s.category), snippet: s.excerpt })) },
      { title: "Milestones", items: milestones.map((m) => ({ href: `/projects/${m.project.slug}#journey`, title: m.title, meta: `${m.project.title}${m.date ? ` · ${fmtDate(m.date, { month: "short", year: "numeric" })}` : ""}`, snippet: m.description })) },
      { title: "Achievements", items: achievements.map((a) => ({ href: "/achievements", title: a.title, meta: a.date ? fmtDate(a.date, { month: "long", year: "numeric" }) : undefined, snippet: a.description })) },
      { title: "Our story", items: history.map((h) => ({ href: "/about", title: h.title, meta: h.dateLabel || (h.date ? fmtDate(h.date, { month: "long", year: "numeric" }) : undefined), snippet: h.description })) },
      { title: "Committees", items: committees.map((c) => ({ href: c.projects[0] ? `/projects?committee=${c.slug}` : "/projects", title: c.name, meta: c.projects.map((p) => p.title).join(", ") || "Committee", snippet: c.description })) },
      { title: "Documents", items: documents.map((d) => ({ href: d.storageKey ? `/media/${d.storageKey}` : d.url || "#", title: d.title, snippet: d.description })) },
    ].filter((g) => g.items.length);
  }
  const total = groups.reduce((a, g) => a + g.items.length, 0);
  return (
    <>
      <PageHero eyebrow="Search" title="Search the archive." dark={false}>
        <form role="search" className="flex max-w-2xl gap-2">
          <label htmlFor="q" className="sr-only">Search</label>
          <input id="q" name="q" defaultValue={q} autoFocus placeholder="Try “environment”, “retreat”, a name or a year" className="input min-h-12 text-lg" />
          <button className="btn-ink">Search</button>
        </form>
      </PageHero>
      <section className="container-x py-12">
        {q.length >= 2 && <p className="mb-10 text-stone">{total} result{total === 1 ? "" : "s"} for “{q}”</p>}
        {q.length >= 2 && total === 0 && <p className="font-serif text-xl">Nothing found. Try a broader word.</p>}
        <div className="grid gap-14 lg:grid-cols-2">
          {groups.map((g) => (
            <section key={g.title} aria-labelledby={`g-${g.title}`}>
              <h2 id={`g-${g.title}`} className="mb-3 border-b-2 border-royal pb-2 text-xl font-bold">{g.title} <span className="font-cond text-sm text-stone">{g.items.length}</span></h2>
              <ul className="divide-y divide-line">
                {g.items.map((it) => (
                  <li key={it.href + it.title}>
                    <Link href={it.href} className="block py-3 hover:text-cranberry">
                      <span className="font-semibold">{it.title}</span>
                      {it.meta && <span className="block text-xs text-stone">{it.meta}</span>}
                      {it.snippet && <span className="mt-1 block font-serif text-sm text-stone">{truncate(it.snippet, 140)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </>
  );
}
