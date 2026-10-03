import { requireArea } from "@/lib/auth";
import { attendanceReport } from "@/lib/attendance-report";
import { getSettings } from "@/lib/settings";
import { fmtDate, fmtShort } from "@/lib/utils";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Print attendance" };

export default async function PrintAttendance({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireArea("attendance");
  const sp = await searchParams;
  const [r, s] = await Promise.all([attendanceReport(sp), getSettings()]);
  return (
    <div className="bg-white p-6 text-fg">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{s.clubName}: attendance report</h1>
          <p className="text-sm text-stone">Generated {fmtDate(new Date(), { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {r.sessions.length} meetings · {r.rows.length} members{sp.month && ` · ${sp.month}`}{sp.from && ` · from ${sp.from}`}{sp.to && ` to ${sp.to}`}</p>
        </div>
        <PrintButton />
      </div>
      <table className="table-x">
        <thead><tr><th>Member</th><th>ID</th><th>Attended</th><th>Expected</th><th>%</th><th>Last</th><th>Streak</th></tr></thead>
        <tbody>{r.rows.map((x) => <tr key={x.memberId}><td>{x.member.person.name}</td><td>{x.member.memberNumber}</td><td>{x.attended}</td><td>{x.expected}</td><td>{x.rate == null ? "—" : Math.round(x.rate * 100) + "%"}</td><td>{x.lastAttendance ? fmtShort(x.lastAttendance) : "—"}</td><td>{x.streak}</td></tr>)}</tbody>
      </table>
      <h2 className="mt-8 mb-2 font-bold">Meetings</h2>
      <table className="table-x"><thead><tr><th>Date</th><th>Meeting</th><th>Present</th></tr></thead><tbody>{r.sessions.map((x) => <tr key={x.id}><td>{fmtShort(x.startsAt)}</td><td>{x.title}</td><td>{x._count.records}</td></tr>)}</tbody></table>
    </div>
  );
}
