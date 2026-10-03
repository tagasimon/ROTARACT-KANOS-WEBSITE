import type { Metadata } from "next";
import Link from "next/link";
import type { AlbumCategory, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PageHero, Empty } from "@/components/site/Section";
import { Img } from "@/components/site/Img";
import { cn, fmtDate, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Our Memories", description: "Photo albums from Rotaract Club Kampala North: service days, fellowships, conferences, installations and more.", alternates: { canonical: "/memories" } };

const CATS: AlbumCategory[] = ["PROJECT", "EVENT", "FELLOWSHIP", "COMMUNITY_SERVICE", "PROFESSIONAL_DEVELOPMENT", "DISTRICT_VISIT", "CONFERENCE", "INSTALLATION", "INDUCTION", "GENERAL"];

export default async function MemoriesPage({ searchParams }: { searchParams: Promise<{ cat?: string; year?: string }> }) {
  const sp = await searchParams;
  const cat = CATS.find((c) => c === sp.cat);
  const where: Prisma.PhotoAlbumWhereInput = { publishStatus: "PUBLISHED", ...(cat ? { category: cat } : {}), ...(sp.year ? { year: { slug: sp.year } } : {}) };
  const [albums, years] = await Promise.all([
    db.photoAlbum.findMany({ where, include: { cover: true, year: true, _count: { select: { media: true } }, media: { take: 1, orderBy: { sortOrder: "asc" } } }, orderBy: { date: "desc" } }),
    db.rotaractYear.findMany({ where: { albums: { some: { publishStatus: "PUBLISHED" } } }, orderBy: { startDate: "desc" } }),
  ]);
  return (
    <>
      <PageHero eyebrow="Our memories" title={<>The photo<br />archive.</>} intro={<>Albums by year, project, event and occasion. Looking for video? <Link href="/videos" className="underline underline-offset-4">Watch here</Link>.</>} />
      <section className="container-x py-12">
        <nav aria-label="Album filters" className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <Link href="/memories" className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-semibold", !cat ? "border-royal bg-royal text-paper" : "border-fg/20")}>All</Link>
          {CATS.map((c) => <Link key={c} href={`/memories?cat=${c}${sp.year ? `&year=${sp.year}` : ""}`} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-semibold", cat === c ? "border-royal bg-royal text-paper" : "border-fg/20 hover:border-royal")}>{humanize(c)}</Link>)}
        </nav>
        {years.length > 0 && (
          <div className="mb-12 flex flex-wrap gap-2">
            {years.map((y) => <Link key={y.slug} href={`/memories?year=${sp.year === y.slug ? "" : y.slug}${cat ? `&cat=${cat}` : ""}`} className={cn("rounded-full border px-3 py-1 font-cond text-xs", sp.year === y.slug ? "border-cranberry bg-cranberry text-paper" : "border-fg/15 text-stone")}>{y.label}</Link>)}
          </div>
        )}
        {albums.length === 0 ? (
          <Empty title="No albums yet">Admins can create albums and upload photos in the CMS. Photos are optimised automatically.</Empty>
        ) : (
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((a) => (
              <Link key={a.id} href={`/memories/${a.slug}`} className="group">
                <div className="aspect-[4/3] overflow-hidden rounded-sm bg-paper-2"><Img media={a.cover || a.media[0]} alt="" size="md" sizes="33vw" className="size-full transition-transform duration-700 group-hover:scale-[1.03]" /></div>
                <p className="eyebrow mt-4">{humanize(a.category)}{a.date && ` · ${fmtDate(a.date, { month: "short", year: "numeric" })}`}{a.year && ` · ${a.year.label}`}</p>
                <h2 className="mt-1 text-2xl font-bold group-hover:text-cranberry">{a.title}</h2>
                <p className="text-sm text-stone">{a._count.media} photos</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
