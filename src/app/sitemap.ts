import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics = ["/", "/about", "/projects", "/people", "/skills", "/leadership", "/leadership/past-presidents", "/years", "/events", "/district", "/stories", "/memories", "/videos", "/achievements", "/get-involved", "/support"];
  try {
    const [projects, people, events, stories, years, albums] = await Promise.all([
      db.project.findMany({ where: { publishStatus: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
      db.person.findMany({ where: { isPublic: true }, select: { slug: true, updatedAt: true } }),
      db.event.findMany({ where: { publishStatus: "PUBLISHED", mergedIntoId: null }, select: { slug: true, updatedAt: true } }),
      db.story.findMany({ where: { publishStatus: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
      db.rotaractYear.findMany({ select: { slug: true, updatedAt: true } }),
      db.photoAlbum.findMany({ where: { publishStatus: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    ]);
    return [
      ...statics.map((p) => ({ url: absoluteUrl(p), changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.7 })),
      ...projects.map((x) => ({ url: absoluteUrl(`/projects/${x.slug}`), lastModified: x.updatedAt, priority: 0.8 })),
      ...people.map((x) => ({ url: absoluteUrl(`/people/${x.slug}`), lastModified: x.updatedAt, priority: 0.5 })),
      ...events.map((x) => ({ url: absoluteUrl(`/events/${x.slug}`), lastModified: x.updatedAt, priority: 0.6 })),
      ...stories.map((x) => ({ url: absoluteUrl(`/stories/${x.slug}`), lastModified: x.updatedAt, priority: 0.7 })),
      ...years.flatMap((x) => [{ url: absoluteUrl(`/years/${x.slug}`), lastModified: x.updatedAt, priority: 0.6 }, { url: absoluteUrl(`/leadership/${x.slug}`), lastModified: x.updatedAt, priority: 0.5 }]),
      ...albums.map((x) => ({ url: absoluteUrl(`/memories/${x.slug}`), lastModified: x.updatedAt, priority: 0.4 })),
    ];
  } catch {
    return statics.map((p) => ({ url: absoluteUrl(p) }));
  }
}
