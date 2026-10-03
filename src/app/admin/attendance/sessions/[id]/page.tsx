import Link from "next/link";
import { notFound } from "next/navigation";
import { requireArea } from "@/lib/auth";
import { db } from "@/lib/db";
import { livePayload } from "@/lib/attendance-live";
import { fmtDate, fmtTime, humanize } from "@/lib/utils";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { MultiPicker } from "@/components/admin/MultiPicker";
import { LiveQR } from "./LiveQR";
import { addManual, extendSession, regenerateToken, removeRecord, setClosed, toggleExcused } from "../actions";

export const metadata = { title: "Attendance session" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("attendance");
  const { id } = await params;
  const s = await db.attendanceSession.findUnique({ where: { id }, include: { event: true, createdBy: { select: { email: true } } } });
  if (!s) notFound();
  const [live, records, members] = await Promise.all([
    livePayload(id),
    db.attendanceRecord.findMany({ where: { sessionId: id }, include: { member: { include: { person: { select: { name: true } } } }, adjustedBy: { select: { email: true } } }, orderBy: { checkedInAt: "asc" } }),
    db.member.findMany({ where: { status: { in: ["ACTIVE", "HONORARY"] } }, include: { person: { select: { name: true } } }, orderBy: { person: { name: "asc" } } }),
  ]);
  const present = new Set(records.map((r) => r.memberId));
  const absent = members.filter((m) => !present.has(m.id));
  return (
    <>
      <p className="eyebrow"><Link href="/admin/attendance/sessions" className="hover:underline">QR sessions</Link></p>
      <h1 className="text-3xl font-bold sm:text-4xl">{s.title}</h1>
      <p className="mb-6 mt-1 text-sm text-stone">
        {fmtDate(s.startsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {fmtTime(s.startsAt)} · {humanize(s.type)}{s.venue && ` · ${s.venue}`}
        <br />Check-in window {fmtTime(s.opensAt)} – {fmtDate(s.closesAt, { day: "numeric", month: "short" })} {fmtTime(s.closesAt)}{s.rotating && ` · rotating every ${s.rotationSeconds}s`}{s.ipAllowlist && ` · venue network only`}{s.closed && " · CLOSED"}
      </p>
      <section className="card mb-6 p-5"><LiveQR id={id} initial={live!} /></section>

      <div className="mb-6 flex flex-wrap gap-2">
        <form action={setClosed.bind(null, id, !s.closed)}><SubmitButton className={s.closed ? "btn-ink btn-sm" : "btn-ghost btn-sm bg-white"}>{s.closed ? "Reopen check-in" : "Close check-in now"}</SubmitButton></form>
        <form action={extendSession.bind(null, id, 30)}><SubmitButton className="btn-ghost btn-sm bg-white">Extend 30 min</SubmitButton></form>
        <form action={regenerateToken.bind(null, id)}><SubmitButton className="btn-ghost btn-sm bg-white">New QR code (invalidate old)</SubmitButton></form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-bold">Present ({records.filter((r) => !r.excused).length}) · excused ({records.filter((r) => r.excused).length})</h2>
          <ul className="divide-y divide-line">
            {records.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span><strong>{r.member.person.name}</strong> <span className="font-cond text-xs text-stone">{r.member.memberNumber}</span><span className="block text-xs text-stone">{fmtTime(r.checkedInAt)} · {humanize(r.method)}{r.excused && " · excused"}{r.adjustedBy && ` · by ${r.adjustedBy.email}`}{r.note && ` · ${r.note}`}</span></span>
                <span className="flex gap-1">
                  <form action={toggleExcused.bind(null, r.id)}><SubmitButton className="btn-ghost btn-sm bg-white" pendingText="…">{r.excused ? "Mark present" : "Mark excused"}</SubmitButton></form>
                  <form action={removeRecord.bind(null, r.id)}><SubmitButton className="btn-ghost btn-sm bg-white text-cranberry" pendingText="…">Remove</SubmitButton></form>
                </span>
              </li>
            ))}
            {!records.length && <li className="py-6 text-center text-sm text-stone">Nobody yet.</li>}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="mb-1 font-bold">Add manually</h2>
          <p className="mb-3 text-xs text-stone">For members without a phone, late corrections or apologies. Every change is logged.</p>
          <form action={addManual.bind(null, id)} className="grid gap-3">
            <MultiPicker name="memberId" options={absent.map((m) => ({ id: m.id, label: `${m.person.name} (${m.memberNumber})` }))} selected={[]} label="Members" />
            <input name="note" placeholder="Note (optional)" className="input" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="excused" /> Record as excused absence (apology)</label>
            <SubmitButton className="btn-ink btn-sm justify-self-start">Add</SubmitButton>
          </form>
          <h3 className="mb-2 mt-6 text-sm font-bold">Not checked in ({absent.length})</h3>
          <p className="text-sm text-stone">{absent.map((m) => m.person.name).join(", ") || "Everyone's here."}</p>
        </section>
      </div>
      <p className="mt-6 text-xs text-stone">Created by {s.createdBy?.email ?? "—"}{s.event && <> · linked to <Link className="underline" href={`/admin/c/events/${s.event.id}`}>{s.event.title}</Link></>}</p>
    </>
  );
}
