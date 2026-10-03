import Link from "next/link";
import { requireArea } from "@/lib/auth";
import { attendanceReport } from "@/lib/attendance-report";
import { fmtShort, humanize } from "@/lib/utils";
import { BarSeries, LineSeries } from "@/components/admin/Charts";
import { AttendanceFilters } from "./Filters";

export const metadata = { title: "Attendance" };

export default async function AttendanceDashboard({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireArea("attendance");
  const sp = await searchParams;
  const r = await attendanceReport(sp);
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();
  const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);
  const tiles: [string, string | number, string?][] = [
    ["Members", r.metrics.members],
    ["Present today", r.metrics.presentToday],
    ["Attendance rate", pct(r.metrics.rate), "attended ÷ expected"],
    ["Average attendance", r.metrics.average == null ? "—" : r.metrics.average.toFixed(1), "per meeting"],
    ["Events this month", r.metrics.eventsThisMonth],
    ["Perfect attendance", r.metrics.perfect],
    ["Need follow-up", r.metrics.followUp, `below ${r.threshold}% or absent 4+ weeks`],
  ];
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">Attendance</p><h1 className="text-4xl font-bold">Attendance dashboard</h1></div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link href="/admin/attendance/sessions/new" className="btn-primary btn-sm">New QR session</Link>
          <a href={`/api/attendance/export?format=csv&${qs}`} className="btn-ghost btn-sm bg-white">Export CSV</a>
          <a href={`/api/attendance/export?format=xlsx&${qs}`} className="btn-ghost btn-sm bg-white">Export Excel</a>
          <Link href={`/admin/attendance/print?${qs}`} className="btn-ghost btn-sm bg-white">Print</Link>
        </div>
      </div>
      <AttendanceFilters sp={sp} action="/admin/attendance" />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {tiles.map(([k, v, sub]) => (
          <div key={k} className={`card p-4 ${k === "Need follow-up" && Number(v) > 0 ? "border-cranberry/40" : ""}`}>
            <p className="label">{k}</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums">{v}</p>
            {sub && <p className="text-[0.7rem] text-stone">{sub}</p>}
          </div>
        ))}
      </div>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-5"><h2 className="mb-1 font-bold">Attendance over time</h2><p className="mb-3 text-xs text-stone">Members present at each meeting</p><LineSeries data={r.overTime} x="label" y="present" name="Present" /></section>
        <section className="card p-5"><h2 className="mb-1 font-bold">Attendance by month</h2><p className="mb-3 text-xs text-stone">Average members present per meeting</p><BarSeries data={r.byMonth} x="label" y="average" name="Average present" /></section>
        <section className="card p-5"><h2 className="mb-1 font-bold">Attendance by Rotaract year</h2><p className="mb-3 text-xs text-stone">Average present per meeting, all years</p><LineSeries data={r.byYear} x="label" y="average" name="Average present" /></section>
        <section className="card p-5"><h2 className="mb-1 font-bold">Attendance by event type</h2><p className="mb-3 text-xs text-stone">Average present per session</p><BarSeries horizontal data={r.byType.map((t) => ({ ...t, type: humanize(t.type) }))} x="type" y="average" name="Average present" /></section>
      </div>
      <section className="card overflow-x-auto">
        <h2 className="px-5 pt-5 font-bold">Member attendance</h2>
        <table className="table-x mt-3">
          <thead><tr><th>Member</th><th>ID</th><th className="text-right">Attended</th><th className="text-right">Expected</th><th className="text-right">Attendance</th><th>Last attended</th><th className="text-right">Streak</th></tr></thead>
          <tbody>
            {r.rows.map((x) => {
              const low = x.expected >= 3 && (x.rate ?? 0) * 100 < r.threshold;
              return (
                <tr key={x.memberId}>
                  <td><Link className="font-semibold hover:text-cranberry" href={`/admin/attendance/records?memberId=${x.memberId}`}>{x.member.person.name}</Link></td>
                  <td className="font-cond text-xs">{x.member.memberNumber}</td>
                  <td className="text-right tabular-nums">{x.attended}</td>
                  <td className="text-right tabular-nums">{x.expected}</td>
                  <td className="text-right">
                    <span className="inline-flex items-center gap-2">
                      <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-paper-2 sm:block"><span className="block h-full bg-cranberry" style={{ width: `${(x.rate ?? 0) * 100}%` }} /></span>
                      <span className={`tabular-nums ${low ? "font-bold text-cranberry" : ""}`}>{pct(x.rate)}</span>
                    </span>
                  </td>
                  <td>{x.lastAttendance ? fmtShort(x.lastAttendance) : "—"}</td>
                  <td className="text-right tabular-nums">{x.streak}</td>
                </tr>
              );
            })}
            {!r.rows.length && <tr><td colSpan={7} className="py-10 text-center text-stone">No members match. Add member records under People → Members.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
