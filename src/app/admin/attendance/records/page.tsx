import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireArea } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, fmtTime, humanize } from "@/lib/utils";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { removeRecord, toggleExcused } from "../sessions/actions";

export const metadata = { title: "Attendance records" };

export default async function RecordsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireArea("attendance");
  const sp = await searchParams;
  const where: Prisma.AttendanceRecordWhereInput = {};
  if (sp.memberId) where.memberId = sp.memberId;
  if (sp.sessionId) where.sessionId = sp.sessionId;
  if (sp.method) where.method = sp.method as never;
  const [records, members, sessions] = await Promise.all([
    db.attendanceRecord.findMany({ where, include: { member: { include: { person: { select: { name: true } } } }, session: { select: { id: true, title: true, startsAt: true } }, adjustedBy: { select: { email: true } } }, orderBy: { checkedInAt: "desc" }, take: 300 }),
    db.member.findMany({ include: { person: { select: { name: true } } }, orderBy: { person: { name: "asc" } } }),
    db.attendanceSession.findMany({ orderBy: { startsAt: "desc" }, take: 200, select: { id: true, title: true, startsAt: true } }),
  ]);
  return (
    <>
      <p className="eyebrow">Attendance</p>
      <h1 className="mb-6 text-4xl font-bold">Records & corrections</h1>
      <form className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <label className="field"><span className="label">Member</span><select name="memberId" defaultValue={sp.memberId || ""} className="input"><option value="">All</option>{members.map((m) => <option key={m.id} value={m.id}>{m.person.name}</option>)}</select></label>
        <label className="field"><span className="label">Session</span><select name="sessionId" defaultValue={sp.sessionId || ""} className="input"><option value="">All</option>{sessions.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.startsAt, { day: "numeric", month: "short", year: "2-digit" })} · {s.title}</option>)}</select></label>
        <label className="field"><span className="label">Method</span><select name="method" defaultValue={sp.method || ""} className="input"><option value="">All</option>{["QR_ACCOUNT", "QR_PIN", "MANUAL"].map((m) => <option key={m} value={m}>{humanize(m)}</option>)}</select></label>
        <button className="btn-ink btn-sm">Filter</button>
      </form>
      <p className="mb-4 text-sm text-stone">To add someone who was present, open the session and use “Add manually”.</p>
      <div className="card overflow-x-auto">
        <table className="table-x">
          <thead><tr><th>Member</th><th>Session</th><th>Checked in</th><th>Method</th><th>Device / IP</th><th></th></tr></thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td className="font-semibold">{r.member.person.name}<span className="block font-cond text-xs font-normal text-stone">{r.member.memberNumber}</span></td>
                <td><Link className="hover:text-cranberry" href={`/admin/attendance/sessions/${r.session.id}`}>{r.session.title}</Link></td>
                <td>{fmtDate(r.checkedInAt, { day: "numeric", month: "short", year: "numeric" })} {fmtTime(r.checkedInAt)}</td>
                <td>{humanize(r.method)}{r.excused && <span className="ml-1 rounded-full bg-gold/25 px-1.5 text-xs">excused</span>}{r.adjustedBy && <span className="block text-xs text-stone">by {r.adjustedBy.email}</span>}</td>
                <td className="font-cond text-xs text-stone">{r.ip || "—"}{r.deviceHash && <span className="block">dev {r.deviceHash.slice(0, 8)}</span>}</td>
                <td className="whitespace-nowrap text-right">
                  <form action={toggleExcused.bind(null, r.id)} className="inline"><SubmitButton className="text-xs font-semibold text-fg underline" pendingText="…">{r.excused ? "Present" : "Excuse"}</SubmitButton></form>{" "}
                  <form action={removeRecord.bind(null, r.id)} className="inline"><SubmitButton className="text-xs font-semibold text-cranberry underline" pendingText="…">Remove</SubmitButton></form>
                </td>
              </tr>
            ))}
            {!records.length && <tr><td colSpan={6} className="py-10 text-center text-stone">No records.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
