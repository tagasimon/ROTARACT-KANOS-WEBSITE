import Link from "next/link";
import { requireArea } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, fmtTime, humanize } from "@/lib/utils";

export const metadata = { title: "QR sessions" };

export default async function SessionsPage() {
  await requireArea("attendance");
  const sessions = await db.attendanceSession.findMany({ include: { _count: { select: { records: true } }, event: { select: { title: true } } }, orderBy: { startsAt: "desc" }, take: 100 });
  const now = new Date();
  return (
    <>
      <div className="mb-6 flex items-end justify-between">
        <div><p className="eyebrow">Attendance</p><h1 className="text-4xl font-bold">QR sessions</h1></div>
        <Link href="/admin/attendance/sessions/new" className="btn-primary btn-sm">New session</Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="table-x">
          <thead><tr><th>When</th><th>Session</th><th>Type</th><th>Status</th><th className="text-right">Present</th></tr></thead>
          <tbody>
            {sessions.map((s) => {
              const open = !s.closed && now >= s.opensAt && now <= s.closesAt;
              return (
                <tr key={s.id}>
                  <td>{fmtDate(s.startsAt, { day: "numeric", month: "short", year: "numeric" })} {fmtTime(s.startsAt)}</td>
                  <td><Link href={`/admin/attendance/sessions/${s.id}`} className="font-semibold hover:text-cranberry">{s.title}</Link>{s.event && <span className="block text-xs text-stone">{s.event.title}</span>}</td>
                  <td>{humanize(s.type)}</td>
                  <td>{open ? <span className="rounded-full bg-grass/15 px-2 py-0.5 text-xs font-semibold text-fg">Open</span> : s.closed || now > s.closesAt ? <span className="text-xs text-stone">Closed</span> : <span className="text-xs text-stone">Scheduled</span>}</td>
                  <td className="text-right font-semibold tabular-nums">{s._count.records}</td>
                </tr>
              );
            })}
            {!sessions.length && <tr><td colSpan={5} className="py-10 text-center text-stone">No sessions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
