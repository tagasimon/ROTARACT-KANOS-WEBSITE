import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/utils";
import { publicEvent } from "@/lib/queries";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const dt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const day = (d: Date) => new Date(d.getTime() + 3 * 3600000).toISOString().slice(0, 10).replace(/-/g, "");

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("event");
  const s = await getSettings();
  const since = new Date(Date.now() - 90 * 86400000);
  const events = await db.event.findMany({
    where: slug ? { ...publicEvent, slug } : { ...publicEvent, date: { gte: since } },
    include: { organizer: true },
    orderBy: { date: "asc" },
    take: 500,
  });
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${s.clubName}//Events//EN`, `X-WR-CALNAME:${esc(s.clubName)}`, "X-WR-TIMEZONE:Africa/Kampala", "CALSCALE:GREGORIAN"];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.id}@kampala-north-rotaract`, `DTSTAMP:${dt(e.updatedAt)}`);
    if (e.startTime) {
      lines.push(`DTSTART:${dt(e.startTime)}`, `DTEND:${dt(e.endTime || new Date(e.startTime.getTime() + 2 * 3600000))}`);
    } else {
      const end = new Date((e.endDate || e.date).getTime() + 86400000);
      lines.push(`DTSTART;VALUE=DATE:${day(e.date)}`, `DTEND;VALUE=DATE:${day(end)}`);
    }
    lines.push(`SUMMARY:${esc(e.title)}`);
    if (e.venue) lines.push(`LOCATION:${esc([e.venue, e.address].filter(Boolean).join(", "))}`);
    lines.push(`DESCRIPTION:${esc([e.organizer ? `Organizer: ${e.organizer.name}` : "", e.description || ""].filter(Boolean).join("\n"))}`);
    lines.push(`URL:${absoluteUrl(`/events/${e.slug}`)}`);
    if (e.status === "CANCELLED") lines.push("STATUS:CANCELLED");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n"), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `${slug ? "attachment" : "inline"}; filename="${slug || "kampala-north-events"}.ics"`, "Cache-Control": "public, max-age=900" },
  });
}
