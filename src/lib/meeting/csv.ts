import "server-only";
import { db } from "@/lib/db";
import type { Cell } from "@/lib/csv";
import { localParts } from "./today";

const AFF = { ROTARIAN: "Rotarian", ROTARACTOR: "Rotaractor", PROSPECT: "Prospect" } as const;
const HOW = { QR: "QR form", MANUAL: "Added by admin", IMPORT: "Imported from the old sheet" } as const;
const stamp = (d: Date) => {
  const t = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kampala", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return `${localParts(d).iso} ${t}`;
};

/** Sign-ins for one meeting, or for every meeting. */
export async function meetingCsvRows(meetingId?: string) {
  const meetings = await db.meeting.findMany({
    where: meetingId ? { id: meetingId } : undefined,
    include: { records: { orderBy: { checkedInAt: "asc" }, include: { buddyGroup: { select: { name: true } }, member: { select: { buddyGroup: { select: { name: true } } } } } } },
    orderBy: { date: "desc" },
  });
  const rows: Cell[][] = [["Date", "Meeting", "Name", "Member or visiting", "Rotarian / Rotaractor / Prospect", "Club", "Email", "Phone", "Signed in at", "How", "Buddy group"]];
  for (const m of meetings)
    for (const r of m.records)
      rows.push([m.day.toISOString().slice(0, 10), m.title, r.name, r.isGuest ? "Visiting" : "Member", r.affiliation ? AFF[r.affiliation] : "", r.clubName, r.email, r.phone, stamp(r.checkedInAt), HOW[r.method], r.isGuest ? "" : (r.buddyGroup ?? r.member?.buddyGroup)?.name]);
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const filename = meetingId && meetings[0] ? `meeting-sign-in-${meetings[0].day.toISOString().slice(0, 10)}-${slug(meetings[0].title)}.csv` : `meeting-sign-in-all-${localParts().iso}.csv`;
  return { rows, filename, count: rows.length - 1 };
}
