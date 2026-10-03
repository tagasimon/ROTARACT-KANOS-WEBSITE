"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireArea } from "@/lib/auth";
import { db } from "@/lib/db";
import { processFeed, housekeeping } from "@/lib/discovery";
import { audit } from "@/lib/audit";

export async function runFeed(id: string) {
  const user = await requireArea("events");
  const feed = await db.eventFeed.findUniqueOrThrow({ where: { id } });
  const r = await processFeed(feed);
  await audit(user.id, "discover", "eventFeed", id, r.error || `${r.created} new, ${r.duplicates} dup`);
  revalidatePath("/admin/discovery");
  redirect(`/admin/discovery?msg=${encodeURIComponent(r.error ? `${feed.name}: ${r.error}` : `${feed.name}: ${r.found} found, ${r.created} new (sent to ${feed.trust === "TRUSTED" ? "site" : "review"}), ${r.duplicates} matched existing events, ${r.matched} already known, ${r.skipped} past`)}`);
}

export async function runHousekeeping() {
  const user = await requireArea("events");
  const r = await housekeeping();
  await audit(user.id, "housekeeping", "system", null, JSON.stringify(r));
  redirect(`/admin/discovery?msg=${encodeURIComponent(`Housekeeping: ${r.eventsCompleted} past events marked completed, ${r.sessionsClosed} sessions closed, current year ${r.currentYear}`)}`);
}

/** Paste an .ics file's contents manually (for calendars you can download but not subscribe to). */
export async function importICS(fd: FormData) {
  const user = await requireArea("events");
  const feedId = String(fd.get("feedId") || "");
  const text = String(fd.get("ics") || "");
  const file = fd.get("file") as File | null;
  const body = file && typeof file === "object" && file.size ? await file.text() : text;
  if (!feedId || !body.includes("BEGIN:VCALENDAR")) redirect("/admin/discovery?msg=Choose%20a%20source%20and%20provide%20iCalendar%20data");
  const feed = await db.eventFeed.findUniqueOrThrow({ where: { id: feedId } });
  const r = await processFeed({ ...feed, kind: "ICS" }, body);
  await audit(user.id, "discover", "eventFeed", feedId, `manual ICS: ${r.created} new`);
  redirect(`/admin/discovery?msg=${encodeURIComponent(r.error || `${r.found} found, ${r.created} new, ${r.duplicates} duplicates, ${r.matched} known`)}`);
}
