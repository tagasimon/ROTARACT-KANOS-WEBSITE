import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe } from "lucide-react";
import { db } from "@/lib/db";
import { eventCardInclude, publicPerson } from "@/lib/queries";
import { mediaSrc } from "@/lib/media";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl, fmtDate, humanize, initials, truncate } from "@/lib/utils";
import { Img, Monogram } from "@/components/site/Img";
import { SourceNote, VerificationBadge } from "@/components/site/Badges";
import { EventRow, ProjectCard, StoryCard } from "@/components/site/Cards";
import { JsonLd } from "@/components/site/JsonLd";
import { BusinessCard } from "@/components/site/BusinessCard";

async function load(slug: string) {
  return db.person.findFirst({
    where: { slug, ...publicPerson },
    include: {
      photo: true,
      skills: { orderBy: { name: "asc" } },
      leadership: { include: { role: true, year: true, committee: true }, orderBy: { year: { startDate: "desc" } } },
      committeeMemberships: { include: { committee: true, year: true } },
      ledProjects: { where: { publishStatus: "PUBLISHED" }, include: { cover: true, year: true } },
      projectRoles: { where: { project: { publishStatus: "PUBLISHED" } }, include: { project: { include: { cover: true, year: true } } } },
      events: { where: { publishStatus: "PUBLISHED", mergedIntoId: null }, include: eventCardInclude, orderBy: { date: "desc" }, take: 8 },
      stories: { where: { publishStatus: "PUBLISHED" }, include: { cover: true }, orderBy: { publishedAt: "desc" }, take: 6 },
      achievements: { where: { publishStatus: "PUBLISHED" }, orderBy: { date: "desc" } },
      milestones: { include: { project: { select: { slug: true, title: true } } }, orderBy: { date: "desc" }, take: 10 },
      businesses: { where: { publishStatus: "PUBLISHED" }, include: { logo: true, owner: { select: { slug: true, name: true, honorific: true, isPublic: true } } }, orderBy: { name: "asc" } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return {};
  const role = p.leadership[0];
  const desc = p.seoDescription || truncate(p.bio, 160) || [role && `${role.customTitle || role.role.title}, ${role.year.label}`, p.professionalTitle, p.organization].filter(Boolean).join(" · ");
  const img = mediaSrc(p.photo, "md");
  return {
    title: p.seoTitle || p.name,
    description: desc,
    alternates: { canonical: `/people/${p.slug}` },
    openGraph: { title: p.name, description: desc, type: "profile", images: img ? [absoluteUrl(img)] : undefined },
  };
}

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await load((await params).slug);
  if (!p) notFound();
  const projects = [...p.ledProjects.map((pr) => ({ pr, role: "Project lead" })), ...p.projectRoles.map((r) => ({ pr: r.project, role: r.role }))].filter(
    (x, i, arr) => arr.findIndex((y) => y.pr.id === x.pr.id) === i,
  );
  const yearsServed = [...new Set(p.leadership.map((l) => l.year.label))];
  const current = p.leadership[0];
  const socials = [
    ["LinkedIn", p.linkedin],
    ["X", p.x],
    ["Instagram", p.instagram],
    ["Website", p.website],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: p.name,
          jobTitle: p.professionalTitle || undefined,
          worksFor: p.organization ? { "@type": "Organization", name: p.organization } : undefined,
          url: absoluteUrl(`/people/${p.slug}`),
          image: mediaSrc(p.photo, "md") ? absoluteUrl(mediaSrc(p.photo, "md")!) : undefined,
          sameAs: socials.map(([, v]) => v),
          knowsAbout: p.skills.map((s) => s.name),
        }}
      />
      <header className="border-b border-line">
        <div className="container-x grid gap-10 py-14 md:grid-cols-12 md:py-20">
          <div className="md:col-span-4">
            <div className="aspect-[4/5] overflow-hidden rounded-sm bg-paper-2">
              <Img media={p.photo} alt={p.name} priority sizes="(min-width:768px) 30vw, 100vw" className="size-full" fallback={<Monogram text={initials(p.name)} className="size-full" />} />
            </div>
          </div>
          <div className="flex flex-col justify-end md:col-span-8">
            <nav aria-label="Breadcrumb" className="mb-6 text-sm text-stone"><Link href="/people" className="hover:text-fg">People</Link></nav>
            {current && (
              <p className="eyebrow mb-4 text-cranberry">
                {current.customTitle || current.role.title} · {current.year.label}
              </p>
            )}
            <h1 className="text-[clamp(2.75rem,7vw,6rem)] font-bold leading-[1.04]">
              {p.honorific && <span className="text-stone-2">{p.honorific} </span>}
              {p.name}
            </h1>
            {(p.professionalTitle || p.organization) && <p className="mt-5 font-serif text-2xl text-stone">{[p.professionalTitle, p.organization].filter(Boolean).join(", ")}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <VerificationBadge v={p.verification} />
              {p.type !== "MEMBER" && <span className="rounded-full border border-line px-3 py-1 text-xs text-stone">{humanize(p.type)}</span>}
            </div>
            {socials.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-2">
                {socials.map(([k, v]) => (
                  <li key={k}>
                    <a href={v} target="_blank" rel="noopener noreferrer me" className="btn-ghost btn-sm">
                      {k === "Website" && <Globe className="size-3.5" aria-hidden />}
                      {k}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </header>

      <div className="container-x grid gap-14 py-16 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {p.bio ? (
            <div className="prose-ed max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.bio) }} />
          ) : (
            <p className="font-serif text-xl text-stone">No biography has been added yet.</p>
          )}

          {p.businesses.length > 0 && (
            <section className="mt-16">
              <h2 className="mb-6 text-3xl font-bold">{p.businesses.length === 1 ? "Business" : "Businesses"}</h2>
              <ul className="grid gap-5 sm:grid-cols-2">{p.businesses.map((b) => <li key={b.id}><BusinessCard b={b} /></li>)}</ul>
            </section>
          )}

          {projects.length > 0 && (
            <section className="mt-16">
              <h2 className="mb-8 text-3xl font-bold">Projects</h2>
              <div className="grid gap-10 sm:grid-cols-2">
                {projects.map(({ pr, role }) => (
                  <div key={pr.id}>
                    <p className="eyebrow mb-2 text-cranberry">{role}</p>
                    <ProjectCard p={pr} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {p.milestones.length > 0 && (
            <section className="mt-16">
              <h2 className="mb-6 text-3xl font-bold">Project milestones</h2>
              <ul className="divide-y divide-line border-y border-line">
                {p.milestones.map((m) => (
                  <li key={m.id} className="grid grid-cols-[7rem_1fr] gap-4 py-3">
                    <span className="font-cond text-sm text-cranberry">{m.dateLabel || fmtDate(m.date, { month: "short", year: "numeric" })}</span>
                    <span><strong>{m.title}</strong> · <Link href={`/projects/${m.project.slug}`} className="link-u">{m.project.title}</Link></span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p.events.length > 0 && (
            <section className="mt-16">
              <h2 className="mb-6 text-3xl font-bold">Events</h2>
              <div className="border-b border-line">{p.events.map((e) => <EventRow key={e.slug} e={e} />)}</div>
            </section>
          )}

          {p.stories.length > 0 && (
            <section className="mt-16">
              <h2 className="mb-6 text-3xl font-bold">Stories</h2>
              <div className="grid gap-8 sm:grid-cols-2">{p.stories.map((s) => <StoryCard key={s.slug} s={s} />)}</div>
            </section>
          )}
        </div>

        <aside className="space-y-10 lg:col-span-4">
          {yearsServed.length > 0 && (
            <div>
              <p className="eyebrow mb-3">Years served</p>
              <p className="font-display text-4xl font-bold">{yearsServed.length}</p>
              <p className="text-sm text-stone">{yearsServed.join(" · ")}</p>
            </div>
          )}
          {p.leadership.length > 0 && (
            <div>
              <p className="eyebrow mb-3">Leadership history</p>
              <ol className="space-y-3 border-l-2 border-royal pl-4">
                {p.leadership.map((l) => (
                  <li key={l.id}>
                    <Link href={`/leadership/${l.year.slug}`} className="font-cond text-xs text-cranberry hover:underline">{l.year.label}</Link>
                    <p className="font-semibold leading-tight">{l.customTitle || l.role.title}</p>
                    {l.committee && <p className="text-sm text-stone">{l.committee.name}</p>}
                    <div className="mt-1"><VerificationBadge v={l.verification} /></div>
                    {l.highlights && l.verification !== "VERIFIED" && <p className="mt-1 text-xs text-stone">{l.highlights}</p>}
                    <SourceNote source={l.source} url={l.sourceUrl} />
                  </li>
                ))}
              </ol>
            </div>
          )}
          {p.skills.length > 0 && (
            <div>
              <p className="eyebrow mb-3">Skills</p>
              <div className="flex flex-wrap gap-2">
                {p.skills.map((s) => <Link key={s.slug} href={`/skills?skill=${s.slug}`} className="rounded-full border border-fg/20 px-3 py-1 text-sm hover:border-cranberry hover:text-cranberry">{s.name}</Link>)}
              </div>
            </div>
          )}
          {p.expertise && (<div><p className="eyebrow mb-2">Areas of expertise</p><p className="font-serif text-lg">{p.expertise}</p></div>)}
          {p.interests && (<div><p className="eyebrow mb-2">Interests</p><p className="font-serif text-lg">{p.interests}</p></div>)}
          {p.committeeMemberships.length > 0 && (
            <div>
              <p className="eyebrow mb-2">Committees</p>
              <ul className="text-sm">{p.committeeMemberships.map((c) => <li key={c.id}>{c.committee.name}{c.year && ` · ${c.year.label}`}{c.role && ` · ${c.role}`}</li>)}</ul>
            </div>
          )}
          {p.achievements.length > 0 && (
            <div>
              <p className="eyebrow mb-2">Awards & recognition</p>
              <ul className="space-y-2">{p.achievements.map((a) => <li key={a.id} className="font-semibold">{a.title}{a.date && <span className="block text-xs font-normal text-stone">{fmtDate(a.date, { month: "long", year: "numeric" })}</span>}</li>)}</ul>
            </div>
          )}
          <SourceNote source={p.source} url={p.sourceUrl} />
        </aside>
      </div>
    </article>
  );
}
