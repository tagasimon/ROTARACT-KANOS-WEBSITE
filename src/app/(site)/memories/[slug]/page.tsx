import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { mediaSrc, mediaSrcSet } from "@/lib/media";
import { absoluteUrl, fmtDate, humanize } from "@/lib/utils";
import { Gallery } from "@/components/site/Gallery";
import { Empty } from "@/components/site/Section";
import { SourceNote } from "@/components/site/Badges";

async function load(slug: string) {
  return db.photoAlbum.findFirst({
    where: { slug, publishStatus: "PUBLISHED" },
    include: { cover: true, year: true, project: { select: { slug: true, title: true } }, event: { select: { slug: true, title: true } }, media: { where: { kind: "IMAGE" }, orderBy: [{ sortOrder: "asc" }, { date: "asc" }], include: { people: { where: { isPublic: true }, select: { name: true } } } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = await load((await params).slug);
  if (!a) return {};
  const img = mediaSrc(a.cover || a.media[0]);
  return { title: a.title, description: a.description || `${a.media.length} photos from ${a.title}.`, alternates: { canonical: `/memories/${a.slug}` }, openGraph: { images: img ? [absoluteUrl(img)] : undefined } };
}

export default async function AlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const a = await load((await params).slug);
  if (!a) notFound();
  return (
    <>
      <header className="container-x pb-10 pt-16">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-stone"><Link href="/memories" className="hover:text-fg">Memories</Link></nav>
        <p className="eyebrow text-cranberry">{humanize(a.category)}{a.date && ` · ${fmtDate(a.date)}`}</p>
        <h1 className="mt-3 text-[clamp(2.5rem,6vw,5rem)] font-bold leading-none">{a.title}</h1>
        {a.description && <p className="mt-5 max-w-2xl font-serif text-xl text-stone">{a.description}</p>}
        <div className="mt-5 flex flex-wrap gap-4 text-sm">
          {a.year && <Link href={`/years/${a.year.slug}`} className="link-u">{a.year.label}</Link>}
          {a.project && <Link href={`/projects/${a.project.slug}`} className="link-u">{a.project.title}</Link>}
          {a.event && <Link href={`/events/${a.event.slug}`} className="link-u">{a.event.title}</Link>}
          <SourceNote source={a.source} url={a.sourceUrl} />
        </div>
      </header>
      <section className="container-x pb-20">
        {a.media.length ? (
          <Gallery
            items={a.media.map((m) => ({
              id: m.id,
              thumb: mediaSrc(m, "md")!,
              full: mediaSrc(m, "xl")!,
              srcSet: mediaSrcSet(m),
              alt: m.alt || m.caption || a.title,
              caption: m.caption,
              meta: [m.date && fmtDate(m.date), m.people.map((p) => p.name).join(", "), m.credit && `Photo: ${m.credit}`].filter(Boolean).join(" · "),
            }))}
          />
        ) : (
          <Empty title="This album is empty" />
        )}
      </section>
    </>
  );
}
