import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { personCardSelect, publicStory } from "@/lib/queries";
import { mediaSrc } from "@/lib/media";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl, fmtDate, humanize, truncate } from "@/lib/utils";
import { Img } from "@/components/site/Img";
import { SourceNote, VerificationBadge } from "@/components/site/Badges";
import { PersonCard, StoryCard } from "@/components/site/Cards";
import { JsonLd } from "@/components/site/JsonLd";

async function load(slug: string) {
  return db.story.findFirst({
    where: { slug, ...publicStory },
    include: { cover: true, year: true, project: { select: { slug: true, title: true } }, event: { select: { slug: true, title: true } }, people: { where: { isPublic: true }, select: personCardSelect }, socialPost: true },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = await load((await params).slug);
  if (!s) return {};
  const desc = s.seoDescription || s.excerpt || truncate(s.body, 160);
  return { title: s.seoTitle || s.title, description: desc, alternates: { canonical: `/stories/${s.slug}` }, openGraph: { type: "article", title: s.title, description: desc, publishedTime: s.publishedAt?.toISOString(), images: mediaSrc(s.cover) ? [absoluteUrl(mediaSrc(s.cover)!)] : undefined } };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const s = await load((await params).slug);
  if (!s) notFound();
  const more = await db.story.findMany({ where: { ...publicStory, id: { not: s.id }, OR: [{ projectId: s.projectId ?? undefined }, { category: s.category }] }, include: { cover: true }, orderBy: { publishedAt: "desc" }, take: 3 });
  return (
    <article>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: s.title, datePublished: s.publishedAt?.toISOString(), dateModified: s.updatedAt.toISOString(), author: { "@type": s.authorName ? "Person" : "Organization", name: s.authorName || "Rotaract Club Kampala North" }, image: mediaSrc(s.cover) ? absoluteUrl(mediaSrc(s.cover)!) : undefined, url: absoluteUrl(`/stories/${s.slug}`) }} />
      <header className="container-x max-w-4xl pb-10 pt-16 sm:pt-24">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-stone"><Link href="/stories" className="hover:text-fg">Stories</Link></nav>
        <p className="eyebrow text-cranberry">{humanize(s.category)}{s.publishedAt && <span className="text-stone"> · {fmtDate(s.publishedAt)}</span>}</p>
        <h1 className="mt-4 text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[1.06]">{s.title}</h1>
        {s.excerpt && <p className="mt-6 font-serif text-2xl leading-snug text-stone">{s.excerpt}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-stone">
          {s.authorName && <span>By {s.authorName}</span>}
          <VerificationBadge v={s.verification} />
        </div>
      </header>
      {s.cover && <div className="container-x mb-12"><Img media={s.cover} alt={s.cover.alt || ""} priority size="xl" className="aspect-[21/10] w-full rounded-sm" />{s.cover.caption && <p className="mt-2 text-sm text-stone">{s.cover.caption}</p>}</div>}
      <div className="container-x grid max-w-6xl gap-12 pb-20 lg:grid-cols-12">
        <div className="prose-ed lg:col-span-8" dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body) }} />
        <aside className="space-y-6 text-sm lg:col-span-4">
          {s.project && <div><p className="eyebrow mb-1">Project</p><Link className="font-display text-lg font-bold hover:text-cranberry" href={`/projects/${s.project.slug}`}>{s.project.title}</Link></div>}
          {s.event && <div><p className="eyebrow mb-1">Event</p><Link className="font-display text-lg font-bold hover:text-cranberry" href={`/events/${s.event.slug}`}>{s.event.title}</Link></div>}
          {s.year && <div><p className="eyebrow mb-1">Rotaract year</p><Link className="font-cond hover:text-cranberry" href={`/years/${s.year.slug}`}>{s.year.label}</Link></div>}
          {s.socialPost && <div><p className="eyebrow mb-1">Originally posted</p><a href={s.socialPost.url} target="_blank" rel="noopener noreferrer" className="link-u">{humanize(s.socialPost.platform)}{s.socialPost.postedAt && `, ${fmtDate(s.socialPost.postedAt)}`}</a></div>}
          <SourceNote source={s.source} url={s.sourceUrl} />
        </aside>
      </div>
      {s.people.length > 0 && (
        <section className="container-x pb-16"><h2 className="mb-6 text-2xl font-bold">In this story</h2><div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6">{s.people.map((p) => <PersonCard key={p.slug} p={p} />)}</div></section>
      )}
      {more.length > 0 && (
        <section className="border-t border-line bg-paper-2 py-16"><div className="container-x"><h2 className="mb-8 text-3xl font-bold">More stories</h2><div className="grid gap-10 md:grid-cols-3">{more.map((m) => <StoryCard key={m.id} s={m} />)}</div></div></section>
      )}
    </article>
  );
}
