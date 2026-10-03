import { requireArea } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { nextRegularMeeting } from "@/lib/queries";
import { E } from "@/lib/admin/resources";
import { fmtDate, humanize } from "@/lib/utils";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import { createSession } from "../actions";

export const metadata = { title: "New QR session" };
const local = (d: Date) => new Date(d.getTime() + 3 * 3600000).toISOString().slice(0, 16);

export default async function NewSession({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireArea("attendance");
  const sp = await searchParams;
  const s = await getSettings();
  const event = sp.eventId ? await db.event.findUnique({ where: { id: sp.eventId } }) : null;
  const events = await db.event.findMany({ where: { mergedIntoId: null, date: { gte: new Date(Date.now() - 7 * 86400000) } }, orderBy: { date: "asc" }, take: 50, select: { id: true, title: true, date: true } });
  const next = nextRegularMeeting(s.meetingDay, s.meetingTime) || new Date();
  const start = event?.startTime || (event ? new Date(event.date.getTime() + 18 * 3600000 - 3 * 3600000) : next);
  const title = event?.title || `Rotaract Kampala North Weekly Meeting, ${fmtDate(next, { day: "numeric", month: "long", year: "numeric" })}`;
  return (
    <>
      <Flash sp={sp} />
      <p className="eyebrow">Attendance</p>
      <h1 className="mb-2 text-4xl font-bold">New QR session</h1>
      <p className="mb-8 max-w-2xl text-sm text-stone">Creates a unique QR code that only works for this meeting and only inside its check-in window. Put the session page on a projector or phone and members scan it.</p>
      <form action={createSession} className="card grid gap-5 p-6">
        <div className="field"><label className="label" htmlFor="title">Title *</label><input id="title" name="title" defaultValue={title} required className="input" /></div>
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="field"><label className="label" htmlFor="startsAt">Starts *</label><input id="startsAt" name="startsAt" type="datetime-local" defaultValue={local(start)} required className="input" /></div>
          <div className="field"><label className="label" htmlFor="openBefore">Opens (min before)</label><input id="openBefore" name="openBefore" type="number" defaultValue={30} className="input" /></div>
          <div className="field"><label className="label" htmlFor="closeAfter">Closes (min after start)</label><input id="closeAfter" name="closeAfter" type="number" defaultValue={180} className="input" /></div>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="field"><label className="label" htmlFor="type">Type</label><select id="type" name="type" defaultValue={event?.type || "CLUB_MEETING"} className="input">{E.eventType.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</select></div>
          <div className="field"><label className="label" htmlFor="eventId">Linked event</label><select id="eventId" name="eventId" defaultValue={event?.id || ""} className="input"><option value="">—</option>{events.map((e) => <option key={e.id} value={e.id}>{fmtDate(e.date, { day: "numeric", month: "short" })} · {e.title}</option>)}</select></div>
          <div className="field"><label className="label" htmlFor="venue">Venue</label><input id="venue" name="venue" defaultValue={event?.venue || s.meetingVenue} className="input" /></div>
        </div>
        <fieldset className="grid gap-4 rounded-md border border-line p-4">
          <legend className="label px-1">Security</legend>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="rotating" defaultChecked className="size-5" /> Rotating QR: the code changes on screen, so a photo of it shared in a WhatsApp group stops working</label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field"><label className="label" htmlFor="rotationSeconds">Rotate every (seconds)</label><input id="rotationSeconds" name="rotationSeconds" type="number" defaultValue={30} min={15} max={300} className="input" /></div>
            <div className="field"><label className="label" htmlFor="ipAllowlist">Venue network only (optional)</label><input id="ipAllowlist" name="ipAllowlist" placeholder="e.g. 41.210.143." className="input font-cond" /><span className="text-xs text-stone">Comma-separated public IP prefixes. Leave empty to allow mobile data.</span></div>
          </div>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="countsTowardRate" defaultChecked className="size-5" /> Counts toward members' attendance rate</label>
        </fieldset>
        <SubmitButton className="btn-primary justify-self-start" pendingText="Creating…">Create session & show QR</SubmitButton>
      </form>
    </>
  );
}
