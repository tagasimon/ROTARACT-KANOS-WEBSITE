import type { Metadata } from "next";
import Link from "next/link";
import type { ContentCategory, Prisma } from "@prisma/client";
import { ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { publicStory } from "@/lib/queries";
import { PageHero, Empty } from "@/components/site/Section";
import { StoryCard } from "@/components/site/Cards";
import { Img } from "@/components/site/Img";
import { cn, fmtDate, humanize, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "From Kampala North", description: "Stories, announcements, member spotlights and service updates from Rotaract Club Kampala North.", alternates: { canonical: "/stories" } };

const CATS: ContentCategory[] = ["ANNOUNCEMENT", "PROJECT_UPDATE", "EVENT", "PHOTO_STORY", "VIDEO", "ACHIEVEMENT", "FELLOWSHIP", "MEMBER_SPOTLIGHT", "LEADERSHIP_UPDATE", "PROFESSIONAL_DEVELOPMENT", "COMMUNITY_SERVICE"];

export default async function StoriesPage({ searchParams }: { searchParams: Promise<{ cat?: string; page?: string }> }) {
  const sp = await searchParams;
  const cat = CATS.find((c) => c === sp.cat);
  const page = Math.max(1, Number(sp.page) || 1);
  const take = 24;
  const storyWhere: Prisma.StoryWhereInput = { ...publicStory, ...(cat ? { category: cat } : {}) };
  const postWhere: Prisma.SocialPostWhereInput = { publishStatus: "PUBLISHED", showInFeed: true, stories: { none: {} }, ...(cat ? { category: cat } : {}) };
  const [stories, posts] = await Promise.all([
    db.story.findMany({ where: storyWhere, include: { cover: true }, orderBy: { publishedAt: "desc" }, take: take * page }),
    db.socialPost.findMany({ where: postWhere, include: { image: true }, orderBy: { postedAt: "desc" }, take: take * page }),
  ]);
  type Item = { kind: "story"; d: Date; s: (typeof stories)[number] } | { kind: "post"; d: Date; p: (typeof posts)[number] };
  const feed: Item[] = [...stories.map((s) => ({ kind: "story" as const, d: s.publishedAt || s.createdAt, s })), ...posts.map((p) => ({ kind: "post" as const, d: p.postedAt || p.createdAt, p }))]
    .sort((a, b) => b.d.getTime() - a.d.getTime())
    .slice(0, take * page);
  const [lead, ...rest] = feed;
  const hasMore = stories.length + posts.length > take * page;

  return (
    <>
      <PageHero eyebrow="From Kampala North" title={<>Stories that don't<br />scroll away.</>} intro="Club news, service updates and moments from fellowship, including posts from our socials kept as a permanent record." />
      <section className="container-x py-12">
        <nav aria-label="Categories" className="mb-12 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <Link href="/stories" className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-semibold", !cat ? "border-royal bg-royal text-paper" : "border-fg/20")}>All</Link>
          {CATS.map((c) => <Link key={c} href={`/stories?cat=${c}`} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-semibold", cat === c ? "border-royal bg-royal text-paper" : "border-fg/20 hover:border-royal")}>{humanize(c)}</Link>)}
        </nav>
        {!lead ? (
          <Empty title="No stories in this category yet" />
        ) : (
          <>
            {lead.kind === "story" ? (
              <Link href={`/stories/${lead.s.slug}`} className="group mb-16 grid gap-8 md:grid-cols-12 md:items-end">
                <div className="aspect-[16/10] overflow-hidden rounded-sm bg-paper-2 md:col-span-7"><Img media={lead.s.cover} alt="" priority className="size-full transition-transform duration-700 group-hover:scale-[1.02]" /></div>
                <div className="md:col-span-5">
                  <p className="eyebrow text-cranberry">{humanize(lead.s.category)} · {fmtDate(lead.d)}</p>
                  <h2 className="mt-3 text-4xl font-bold leading-tight group-hover:text-cranberry sm:text-5xl">{lead.s.title}</h2>
                  {lead.s.excerpt && <p className="mt-4 font-serif text-xl text-stone">{lead.s.excerpt}</p>}
                </div>
              </Link>
            ) : (
              <PostCard p={lead.p} big />
            )}
            <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((it) => (it.kind === "story" ? <StoryCard key={it.s.id} s={it.s} /> : <PostCard key={it.p.id} p={it.p} />))}
            </div>
            {hasMore && <div className="mt-14 text-center"><Link href={`/stories?${cat ? `cat=${cat}&` : ""}page=${page + 1}`} className="btn-ghost">Load more</Link></div>}
          </>
        )}
      </section>
    </>
  );
}

function PostCard({ p, big }: { p: { id: string; url: string; platform: string; content: string | null; postedAt: Date | null; category: string; image: Parameters<typeof Img>[0]["media"] }; big?: boolean }) {
  return (
    <a href={p.url} target="_blank" rel="noopener noreferrer" className={cn("group flex flex-col justify-between border-t-4 border-royal bg-paper-2 p-6 transition-colors hover:bg-paper-3", big && "mb-16 p-10")}>
      {p.image && <Img media={p.image} alt="" size="md" className="mb-5 aspect-[3/2] w-full rounded-sm" />}
      <div>
        <p className="eyebrow"><span className="text-cranberry">{humanize(p.platform)}</span> · {humanize(p.category)}{p.postedAt && <> · {fmtDate(p.postedAt, { day: "numeric", month: "short", year: "numeric" })}</>}</p>
        <p className={cn("mt-4 font-serif leading-snug", big ? "text-3xl" : "text-xl")}>{truncate(p.content, big ? 400 : 220)}</p>
      </div>
      <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold">View original post <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden /></span>
    </a>
  );
}
