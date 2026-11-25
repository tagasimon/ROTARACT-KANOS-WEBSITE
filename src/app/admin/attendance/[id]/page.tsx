import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { requireArea } from "@/lib/auth";
import { emailOffReason } from "@/lib/meeting/email";
import { countsOf } from "@/lib/meeting/stats";
import { findClub, CLUBS } from "@/lib/meeting/clubs";
import { variantOf } from "@/lib/meeting/templates";
import { clockTime, localParts, longDate } from "@/lib/meeting/today";
import { cn, humanize } from "@/lib/utils";
import { Flash } from "@/components/admin/Flash";
import { AutoRefresh, Pending, TwoStep } from "../Bits";
import { addPerson, deleteMeeting, removeRecord, renameMeeting, sendOne, sendPending } from "../actions";

export const metadata = { title: "Meeting" };

const TYPE = { member: "Member", ROTARIAN: "Visiting Rotarian", ROTARACTOR: "Visiting Rotaractor", PROSPECT: "Prospect" } as const;

function EmailPill({ r }: { r: { email: string | null; emailStatus: string | null; emailSentAt: Date | null; emailError: string | null; method: string } }) {
  const base = "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold";
  if (r.method === "IMPORT") return <span className={cn(base, "bg-fg/5 text-stone")} title="Brought in from the old sign-in sheet. No email is sent.">Imported</span>;
  if (!r.email) return <span className={cn(base, "bg-fg/5 text-stone")}>No email</span>;
  if (r.emailStatus === "SENT") return <span className={cn(base, "bg-grass/15")}>Sent {r.emailSentAt ? clockTime(r.emailSentAt) : ""}</span>;
  if (r.emailStatus === "FAILED") return <span className={cn(base, "bg-cranberry/10 text-cranberry")} title={r.emailError || undefined}>Failed<span className="block max-w-56 whitespace-normal font-normal">{r.emailError}</span></span>;
  if (r.emailStatus === "SKIPPED") return <span className={cn(base, "bg-gold/25 text-charcoal")} title={r.emailError || undefined}>Not sent</span>;
  return <span className={cn(base, "bg-royal/10")}>Pending</span>;
}

export default async function MeetingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  await requireArea("attendance");
  const { id } = await params;
  const sp = await searchParams;
  const m = await db.meeting.findUnique({ where: { id }, include: { records: { orderBy: { checkedInAt: "asc" }, include: { recordedBy: { select: { email: true } }, buddyGroup: { select: { name: true } }, member: { select: { buddyGroup: { select: { name: true } } } } } }, event: { select: { id: true, title: true } } } });
  const groups = await db.buddyGroup.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  if (!m) notFound();
  const c = countsOf(m.records);
  const isToday = localParts(m.date).iso === localParts().iso || m.day.toISOString().slice(0, 10) === localParts().iso;
  const pending = m.records.filter((r) => r.email && r.method !== "IMPORT" && r.emailStatus !== "SENT").length;
  const visitingClubs = [...new Map(m.records.filter((r) => r.isGuest && r.affiliation !== "PROSPECT" && r.clubName).map((r) => {
    const listed = findClub(r.clubName!, r.affiliation === "ROTARIAN" ? "ROTARY" : "ROTARACT");
    return [listed?.name ?? r.clubName!, { name: listed?.name ?? r.clubName!, listed: !!listed }] as const;
  })).values()];
  const off = emailOffReason();

  return (
    <>
      <Flash sp={sp} />
      <p className="eyebrow"><Link href="/admin/attendance" className="hover:underline">Meeting sign-in</Link></p>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">{m.title}</h1>
          <p className="mt-1 text-stone">{longDate(m.date)}{m.type !== "GATHERING" && ` · ${clockTime(m.date)}`}{m.venue && ` · ${m.venue}`} · {humanize(m.type)}{m.event && <> · <Link href={`/admin/c/events/${m.event.id}`} className="underline">event</Link></>}</p>
          {isToday && <AutoRefresh />}
        </div>
        <a href={`/admin/attendance/export?meeting=${m.id}`} className="btn-ghost btn-sm bg-white"><Download className="size-4" aria-hidden /> CSV</a>
      </div>

      <section aria-label="Counts" className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {[["Total", c.total], ["Members", c.members], ["Guests", c.guests], ["Rotarians", c.rotarians], ["Rotaractors", c.rotaractors], ["Prospects", c.prospects], ["Clubs", c.clubs]].map(([l, v]) => (
          <div key={String(l)} className="card p-4"><p className="label">{l}</p><p className="mt-1 font-display text-3xl font-bold tabular-nums">{v}</p></div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_18rem]">
        <section className="card overflow-x-auto">
          {m.records.length ? (
            <table className="table-x">
              <thead><tr><th>Name</th><th>Type</th><th>Club</th><th>Email</th><th>Phone</th><th>Time</th><th>Email status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {m.records.map((r) => {
                  const v = variantOf(r);
                  return (
                    <tr key={r.id}>
                      <td className="font-semibold">
                        {r.memberId ? <Link href={`/admin/c/members/${r.memberId}`} className="hover:text-cranberry">{r.name}</Link> : r.name}
                        {!r.isGuest && (r.buddyGroup ?? r.member?.buddyGroup) && <span className="block text-xs font-normal text-stone">{(r.buddyGroup ?? r.member?.buddyGroup)!.name}</span>}
                      </td>
                      <td className="whitespace-nowrap">{r.isGuest ? TYPE[r.affiliation ?? "PROSPECT"] : TYPE.member}</td>
                      <td className="text-stone">{r.isGuest ? r.clubName || "—" : ""}</td>
                      <td className="break-all">{r.email || <span className="text-stone">—</span>}</td>
                      <td className="whitespace-nowrap">{r.phone || <span className="text-stone">—</span>}</td>
                      <td className="whitespace-nowrap text-stone">{clockTime(r.checkedInAt)}{r.method === "MANUAL" && <span className="block text-xs" title={r.recordedBy?.email}>added</span>}{r.method === "IMPORT" && <span className="block text-xs">imported</span>}</td>
                      <td><EmailPill r={r} /></td>
                      <td>
                        <div className="flex min-w-40 flex-col items-start gap-1.5 text-sm">
                          {r.email && r.method !== "IMPORT" && (
                            <form action={sendOne}>
                              <input type="hidden" name="id" value={r.id} />
                              <input type="hidden" name="again" value={r.emailStatus === "SENT" ? "1" : "0"} />
                              <Pending className="font-semibold text-royal hover:underline" pendingText="Sending…">{r.emailStatus === "SENT" ? "Send again" : "Send now"}</Pending>
                            </form>
                          )}
                          {r.email && r.method !== "IMPORT" && <a href={`/admin/attendance/record/${r.id}/email`} target="_blank" className="font-semibold text-royal hover:underline">Preview email</a>}
                          {v === "visitor" && <a href={`/admin/attendance/record/${r.id}/card`} target="_blank" className="font-semibold text-royal hover:underline">Make-up card (PDF)</a>}
                          <form action={removeRecord}>
                            <input type="hidden" name="id" value={r.id} />
                            <TwoStep label="Remove" question={`Remove ${r.name}?`} />
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-sm text-stone">Nobody has signed in yet.</p>
          )}
        </section>

        <aside className="space-y-5">
          <section className="card p-4">
            <h2 className="label mb-2">Visiting clubs</h2>
            {visitingClubs.length ? <ul className="space-y-1 text-sm">{visitingClubs.map((v) => <li key={v.name}>{v.name}{!v.listed && <span className="text-xs text-stone"> (typed in)</span>}</li>)}</ul> : <p className="text-sm text-stone">None.</p>}
          </section>

          {pending > 0 && (
            <section className="card p-4">
              <h2 className="label mb-2">Thank-you emails</h2>
              {off ? <p className="text-sm text-stone">Emails are off ({off}).</p> : (
                <form action={sendPending}>
                  <input type="hidden" name="meetingId" value={m.id} />
                  <Pending className="btn-ink btn-sm" pendingText="Sending…">Send {pending} pending</Pending>
                </form>
              )}
            </section>
          )}

          <section className="card p-4">
            <h2 className="label mb-3">Add someone</h2>
            <form action={addPerson} className="grid gap-3 text-sm">
              <input type="hidden" name="meetingId" value={m.id} />
              <label className="field"><span className="label">Who</span>
                <select name="who" className="input" defaultValue="member"><option value="member">Member</option><option value="ROTARIAN">Visiting Rotarian</option><option value="ROTARACTOR">Visiting Rotaractor</option><option value="PROSPECT">Prospect (guest)</option></select>
              </label>
              <label className="field"><span className="label">Name</span><input name="name" required className="input" /></label>
              {groups.length > 0 && (
                <label className="field"><span className="label">Buddy group (members)</span>
                  <select name="group" className="input" defaultValue=""><option value="">—</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
                </label>
              )}
              <label className="field"><span className="label">Club (visitors)</span><input name="club" list="club-list" className="input" placeholder="Start typing" /></label>
              <datalist id="club-list">{CLUBS.map((cl) => <option key={cl.type + cl.name} value={cl.name} />)}</datalist>
              <label className="field"><span className="label">Email (optional)</span><input name="email" type="email" className="input" /></label>
              <label className="field"><span className="label">Phone (optional)</span><input name="phone" type="tel" className="input" /></label>
              <p className="text-xs text-stone">People added by hand aren&rsquo;t emailed automatically. Use Send now if they should be.</p>
              <Pending className="btn-ink btn-sm justify-self-start" pendingText="Adding…">Add</Pending>
            </form>
          </section>

          <section className="card p-4">
            <h2 className="label mb-2">Rename</h2>
            <form action={renameMeeting} className="flex gap-2">
              <input type="hidden" name="id" value={m.id} />
              <label className="sr-only" htmlFor="title">Meeting name</label>
              <input id="title" name="title" defaultValue={m.title} className="input" />
              <Pending className="btn-ghost btn-sm bg-white" pendingText="…">Save</Pending>
            </form>
          </section>

          <section className="card border-cranberry/30 p-4">
            <h2 className="label mb-2">Delete meeting</h2>
            <p className="mb-2 text-xs text-stone">Removes the meeting and its {m.records.length} sign-ins. This can&rsquo;t be undone.</p>
            <form action={deleteMeeting}>
              <input type="hidden" name="id" value={m.id} />
              <TwoStep label="Delete this meeting" question={`Delete it and ${m.records.length} sign-ins?`} yes="Delete" />
            </form>
          </section>
        </aside>
      </div>
    </>
  );
}
