import Link from "next/link";
import { requireArea } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, humanize } from "@/lib/utils";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import { importICS, runFeed, runHousekeeping } from "./actions";

export const metadata = { title: "Event discovery" };

export default async function DiscoveryPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireArea("events");
  const sp = await searchParams;
  const [feeds, recent] = await Promise.all([
    db.eventFeed.findMany({ include: { organizer: true, _count: { select: { records: true } } }, orderBy: { name: "asc" } }),
    db.eventSource.findMany({ where: { feedId: { not: null } }, include: { event: { select: { id: true, title: true, publishStatus: true, date: true } } }, orderBy: { firstImported: "desc" }, take: 15 }),
  ]);
  return (
    <>
      <Flash sp={sp} />
      <p className="eyebrow">Events</p>
      <h1 className="mb-2 text-4xl font-bold">Event discovery</h1>
      <p className="mb-6 max-w-3xl text-sm text-stone">A scheduled job (see the deployment guide) checks each active source, normalises events, detects duplicates across sources, labels the organizer, and either publishes them (trusted sources) or sends them to <Link href="/admin/review" className="underline">Needs review</Link>. Only structured feeds are read (iCalendar, RSS, JSON Feed). Instagram, X and HTML pages are never scraped.</p>
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/admin/c/feeds/new" className="btn-ink btn-sm">Add source</Link>
        <form action={runHousekeeping}><SubmitButton className="btn-ghost btn-sm bg-white">Run housekeeping now</SubmitButton></form>
      </div>
      <div className="card mb-8 overflow-x-auto">
        <table className="table-x">
          <thead><tr><th>Source</th><th>Format</th><th>Trust</th><th>Organizer</th><th>Last check</th><th>Records</th><th></th></tr></thead>
          <tbody>
            {feeds.map((f) => (
              <tr key={f.id}>
                <td><Link href={`/admin/c/feeds/${f.id}`} className="font-semibold hover:text-cranberry">{f.name}</Link><span className="block max-w-xs truncate text-xs text-stone">{f.url}</span>{!f.active && <span className="text-xs text-stone">inactive</span>}</td>
                <td>{f.kind}</td>
                <td>{humanize(f.trust)}</td>
                <td>{f.organizer?.name || "—"}</td>
                <td className="text-xs">{f.lastCheckedAt ? fmtDate(f.lastCheckedAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "never"}<span className="block text-stone">{f.lastStatus}</span></td>
                <td className="tabular-nums">{f._count.records}</td>
                <td>{f.kind !== "MANUAL" && <form action={runFeed.bind(null, f.id)}><SubmitButton className="btn-ghost btn-sm bg-white" pendingText="Checking…">Run now</SubmitButton></form>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <form action={importICS} encType="multipart/form-data" className="card grid gap-3 p-5">
          <p className="font-bold">Import a downloaded calendar (.ics)</p>
          <p className="text-xs text-stone">For calendars you can download but not subscribe to. Runs the same pipeline: dedupe, categorise, review.</p>
          <select name="feedId" className="input" aria-label="Source" required><option value="">Attribute to source…</option>{feeds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
          <input type="file" name="file" accept=".ics,text/calendar" className="text-sm" />
          <textarea name="ics" rows={4} placeholder="…or paste BEGIN:VCALENDAR…" className="input font-cond text-xs" />
          <SubmitButton className="btn-ink btn-sm justify-self-start" pendingText="Importing…">Import</SubmitButton>
        </form>
        <div className="card p-5">
          <p className="mb-3 font-bold">Recently discovered</p>
          <ul className="divide-y divide-line text-sm">
            {recent.map((r) => <li key={r.id} className="py-2"><Link href={`/admin/c/events/${r.event.id}`} className="font-semibold hover:text-cranberry">{r.event.title}</Link><span className="block text-xs text-stone">{fmtDate(r.event.date)} · {humanize(r.event.publishStatus)} · via {r.source}</span></li>)}
            {!recent.length && <li className="py-2 text-stone">Nothing discovered yet.</li>}
          </ul>
        </div>
      </div>
    </>
  );
}
