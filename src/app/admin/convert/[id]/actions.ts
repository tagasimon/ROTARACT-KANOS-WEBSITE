"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireArea } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { yearIdForDate } from "@/lib/years";

type Target = "story" | "spotlight" | "milestone" | "achievement" | "event" | "album";

async function uniqueSlug(model: "story" | "event" | "photoAlbum", base: string) {
  const root = slugify(base) || "item";
  for (let i = 1; i < 100; i++) {
    const s = i === 1 ? root : `${root}-${i}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(await (db as any)[model].findUnique({ where: { slug: s } }))) return s;
  }
  return `${root}-${Date.now()}`;
}

export async function convertPost(postId: string, target: Target, fd: FormData) {
  const user = await requireArea("content");
  const post = await db.socialPost.findUniqueOrThrow({ where: { id: postId }, include: { people: { select: { id: true } } } });
  const title = String(fd.get("title") || "").trim() || (post.content || "Untitled").split(/\n|\.\s/)[0].slice(0, 90);
  const date = fd.get("date") ? new Date(`${fd.get("date")}T00:00:00+03:00`) : post.postedAt || new Date();
  const yearId = post.yearId || (await yearIdForDate(date));
  const prov = { source: `${post.platform} post`, sourceUrl: post.url, verification: post.verification };
  const people = post.people.map((p) => ({ id: p.id }));
  let created: { type: string; id: string; href: string };

  switch (target) {
    case "story":
    case "spotlight": {
      const personId = String(fd.get("personId") || "");
      const s = await db.story.create({
        data: {
          slug: await uniqueSlug("story", title), title, excerpt: (post.content || "").slice(0, 280), body: post.content,
          category: target === "spotlight" ? "MEMBER_SPOTLIGHT" : post.category, coverId: post.imageId, publishedAt: post.postedAt || new Date(),
          publishStatus: "DRAFT", yearId, projectId: post.projectId, eventId: post.eventId, socialPostId: post.id, sourceType: "CLUB_SOCIAL", ...prov,
          people: { connect: personId ? [...people, { id: personId }] : people },
        },
      });
      created = { type: target, id: s.id, href: `/admin/c/stories/${s.id}` };
      break;
    }
    case "milestone": {
      const projectId = String(fd.get("projectId") || post.projectId || "");
      if (!projectId) redirect(`/admin/convert/${postId}?error=${encodeURIComponent("Choose a project for the milestone")}`);
      const m = await db.projectMilestone.create({
        data: { projectId, title, description: post.content, date, stage: (String(fd.get("stage") || "UPDATE") as Prisma.ProjectMilestoneCreateInput["stage"]), imageId: post.imageId, eventId: post.eventId, yearId, sourceType: "CLUB_SOCIAL", ...prov, people: { connect: people } },
      });
      created = { type: "milestone", id: m.id, href: `/admin/c/milestones/${m.id}` };
      break;
    }
    case "achievement": {
      const a = await db.achievement.create({ data: { title, description: post.content, date, imageId: post.imageId, projectId: post.projectId, eventId: post.eventId, yearId, publishStatus: "DRAFT", sourceType: "CLUB_SOCIAL", ...prov } });
      created = { type: "achievement", id: a.id, href: `/admin/c/achievements/${a.id}` };
      break;
    }
    case "event": {
      const organizerId = String(fd.get("organizerId") || post.organizationId || "") || null;
      const e = await db.event.create({
        data: { slug: await uniqueSlug("event", `${title}-${date.toISOString().slice(0, 10)}`), title, description: post.content, date, type: (String(fd.get("type") || "FELLOWSHIP") as Prisma.EventCreateInput["type"]), organizerId, projectId: post.projectId, yearId, coverId: post.imageId, publishStatus: "DRAFT", sourceType: "CLUB_SOCIAL", importedAt: new Date(), ...prov, people: { connect: people },
          sources: { create: { source: `${post.platform} post`, sourceUrl: post.url, sourceType: "CLUB_SOCIAL", rawTitle: title } } },
      });
      await db.socialPost.update({ where: { id: post.id }, data: { eventId: e.id } });
      created = { type: "event", id: e.id, href: `/admin/c/events/${e.id}` };
      break;
    }
    case "album": {
      const a = await db.photoAlbum.create({ data: { slug: await uniqueSlug("photoAlbum", title), title, description: post.content, date, category: "GENERAL", coverId: post.imageId, yearId, projectId: post.projectId, eventId: post.eventId, publishStatus: "DRAFT", source: prov.source, sourceUrl: post.url } });
      if (post.imageId) await db.media.update({ where: { id: post.imageId }, data: { albumId: a.id } });
      created = { type: "album", id: a.id, href: `/admin/c/albums/${a.id}` };
      break;
    }
  }
  const list = ((post.convertedTo as { type: string; id: string }[]) || []).concat({ type: created!.type, id: created!.id });
  await db.socialPost.update({ where: { id: post.id }, data: { convertedTo: list as Prisma.InputJsonValue, publishStatus: post.publishStatus === "IN_REVIEW" ? "PUBLISHED" : post.publishStatus } });
  await audit(user.id, "convert", "socialPost", post.id, `→ ${created!.type} ${created!.id}`);
  revalidatePath("/", "layout");
  redirect(`${created!.href}?msg=${encodeURIComponent("Created from the social post. Review it and publish when ready.")}`);
}
