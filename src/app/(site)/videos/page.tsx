import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { mediaSrc, youtubeId } from "@/lib/media";
import { PageHero, Empty } from "@/components/site/Section";
import { fmtDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Videos", description: "Video from Rotaract Club Kampala North projects, events and fellowships.", alternates: { canonical: "/videos" } };

export default async function VideosPage() {
  const videos = await db.media.findMany({ where: { kind: "VIDEO" }, include: { project: { select: { slug: true, title: true } }, event: { select: { slug: true, title: true } }, year: true }, orderBy: { date: "desc" } });
  return (
    <>
      <PageHero eyebrow="Video archive" title="Watch." intro="Projects, events and fellowship, on video." />
      <section className="container-x py-14">
        {videos.length === 0 ? <Empty title="No videos yet">Admins can add YouTube links or uploaded clips in the CMS.</Empty> : (
          <div className="grid gap-12 md:grid-cols-2">
            {videos.map((v) => {
              const yt = youtubeId(v.url);
              return (
                <article key={v.id}>
                  {yt ? <iframe className="aspect-video w-full rounded-sm" src={`https://www.youtube-nocookie.com/embed/${yt}`} title={v.title || "Video"} loading="lazy" allowFullScreen /> : v.provider === "UPLOAD" ? <video className="aspect-video w-full rounded-sm bg-royal" controls preload="none" src={mediaSrc(v) || undefined} /> : <a href={v.url || "#"} target="_blank" rel="noopener noreferrer" className="flex aspect-video items-center justify-center rounded-sm bg-royal text-paper">Watch on external site ↗</a>}
                  <p className="eyebrow mt-4">{[v.date && fmtDate(v.date), v.year?.label].filter(Boolean).join(" · ")}</p>
                  <h2 className="mt-1 text-2xl font-bold">{v.title || "Untitled video"}</h2>
                  {v.description && <p className="mt-2 font-serif text-stone">{v.description}</p>}
                  <div className="mt-2 flex gap-4 text-sm">{v.project && <Link className="link-u" href={`/projects/${v.project.slug}`}>{v.project.title}</Link>}{v.event && <Link className="link-u" href={`/events/${v.event.slug}`}>{v.event.title}</Link>}</div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
