"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth";
import { getResource } from "@/lib/admin/resources";
import { saveRow, ValidationError } from "@/lib/admin/crud";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function importPost(fd: FormData) {
  const user = await requireArea("content");
  const r = getResource("social")!;
  const url = String(fd.get("url") || "").trim();
  if (url) {
    const dup = await db.socialPost.findUnique({ where: { url } });
    if (dup) redirect(`/admin/convert/${dup.id}?msg=${encodeURIComponent("This post was already imported.")}`);
  }
  // detect platform from URL if not chosen
  if (!fd.get("platform")) {
    const host = url.toLowerCase();
    fd.set("platform", host.includes("instagram") ? "INSTAGRAM" : host.includes("x.com") || host.includes("twitter") ? "X" : host.includes("facebook") ? "FACEBOOK" : host.includes("linkedin") ? "LINKEDIN" : host.includes("youtu") ? "YOUTUBE" : host.includes("tiktok") ? "TIKTOK" : "OTHER");
  }
  const self = await db.organization.findFirst({ where: { isSelf: true } });
  const orgId = String(fd.get("organizationId") || "");
  const own = !orgId || orgId === self?.id;
  if (!orgId && self) fd.set("organizationId", self.id);
  fd.set("publishStatus", fd.get("publishNow") === "on" ? "PUBLISHED" : "IN_REVIEW");
  // the club's own post is a primary source; anything else needs checking
  fd.set("verification", own ? "VERIFIED" : "NEEDS_VERIFICATION");
  fd.set("source", `${String(fd.get("platform"))} (manual import)`);
  fd.set("sourceUrl", url);
  fd.set("sourceType", own ? "CLUB_SOCIAL" : "SOCIAL");
  let id: string;
  try {
    id = String((await saveRow(r, null, fd, user.id)).row.id);
  } catch (e) {
    redirect(`/admin/import?error=${encodeURIComponent(e instanceof ValidationError ? e.message : (e as Error).message.split("\n").pop() || "Could not import")}`);
  }
  await audit(user.id, "import", "socialPost", id, url);
  revalidatePath("/", "layout");
  redirect(`/admin/convert/${id}?msg=${encodeURIComponent("Post imported. Turn it into something lasting:")}`);
}
