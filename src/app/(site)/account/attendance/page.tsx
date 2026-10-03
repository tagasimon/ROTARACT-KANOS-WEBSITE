import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { memberStats } from "@/lib/attendance";
import { getCurrentYear } from "@/lib/years";
import { nextRegularMeeting } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { fmtDate, fmtTime, humanize } from "@/lib/utils";
import { Empty } from "@/components/site/Section";

export const metadata: Metadata = { title: "My attendance", robots: { index: false } };

export default async function MyAttendancePage() {
  const user = await requireUser("/account/attendance");
  if (!user.memberId) return <section className="container-x py-16"><Empty title="No member record linked">Ask a club admin to link your account to your membership.</Empty></section>;
  const [year, s] = await Promise.all([getCurrentYear(), getSettings()]);
  const [all, thisYear, recent, upcoming] = await Promise.all([
    memberStats({ memberIds: [user.memberId] }),
    year ? memberStats({ memberIds: [user.memberId], from: year.startDate, to: year.endDate }) : null,
    db.attendanceRecord.findMany({ where: { memberId: user.memberId }, include: { session: true }, orderBy: { checkedInAt: "desc" }, take: 15 }),
    db.attendanceSession.findMany({ where: { startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 5 }),
  ]);
  const st = all.stats.get(user.memberId)!;
  const yr = thisYear?.stats.get(user.memberId);
  const pct = (r: number | null | undefined) => (r == null ? "—" : `${Math.round(r * 100)}%`);
  const next = nextRegularMeeting(s.meetingDay, s.meetingTime);
  // month-by-month for this year
  const months: { label: string; attended: number; total: number }[] = [];
  if (year && thisYear) {
    const rec = new Set(recent.map((r) => r.sessionId));
    const allRecs = await db.attendanceRecord.findMany({ where: { memberId: user.memberId, session: { startsAt: { gte: year.startDate, lte: year.endDate } } }, select: { sessionId: true } });
    allRecs.forEach((r) => rec.add(r.sessionId));
    for (const ses of thisYear.sessions) {
      const k = fmtDate(ses.startsAt, { month: "short" });
      let m = months.find((x) => x.label === k);
      if (!m) months.push((m = { label: k, attended: 0, total: 0 }));
      m.total++;
      if (rec.has(ses.id)) m.attended++;
    }
  }
  return (
    <section className="container-x py-14">
      <p className="eyebrow mb-2">Private to you</p>
      <h1 className="mb-10 text-5xl font-bold">My attendance</h1>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-line lg:grid-cols-4">
        {[
          ["Attendance rate", pct(st.rate), `${st.attended} of ${st.expected} meetings`],
          [year ? `This year (${year.label})` : "This year", pct(yr?.rate), yr ? `${yr.attended} of ${yr.expected}` : ""],
          ["Current streak", String(st.streak), `Longest: ${st.longestStreak}`],
          ["Last attended", st.lastAttendance ? fmtDate(st.lastAttendance, { day: "numeric", month: "short" }) : "—", st.excused ? `${st.excused} excused` : ""],
        ].map(([k, v, sub]) => (
          <div key={k} className="bg-paper p-6">
            <p className="eyebrow">{k}</p>
            <p className="mt-2 font-display text-5xl font-bold tabular-nums">{v}</p>
            <p className="mt-1 text-sm text-stone">{sub}</p>
          </div>
        ))}
      </div>

      {months.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-xl font-bold">This year, month by month</h2>
          <div className="flex items-end gap-2" role="img" aria-label="Monthly attendance this year">
            {months.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-32 w-full max-w-12 items-end rounded-sm bg-paper-2">
                  <div className="w-full rounded-sm bg-cranberry" style={{ height: `${m.total ? (m.attended / m.total) * 100 : 0}%` }} />
                </div>
                <span className="text-xs text-stone">{m.label}</span>
                <span className="font-cond text-xs">{m.attended}/{m.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-14 grid gap-12 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-bold">Recent check-ins</h2>
          {recent.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {recent.map((r) => (
                <li key={r.id} className="flex justify-between gap-4 py-3">
                  <span><strong>{r.session.title}</strong><span className="block text-xs text-stone">{humanize(r.session.type)}{r.excused && " · excused"}</span></span>
                  <span className="text-right text-sm text-stone">{fmtDate(r.session.startsAt, { day: "numeric", month: "short", year: "numeric" })}<span className="block text-xs">{fmtTime(r.checkedInAt)}</span></span>
                </li>
              ))}
            </ul>
          ) : <Empty title="No check-ins yet">Scan the QR code at your next meeting.</Empty>}
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold">Upcoming meetings</h2>
          <ul className="divide-y divide-line border-y border-line">
            {upcoming.map((u) => <li key={u.id} className="py-3"><strong>{u.title}</strong><span className="block text-sm text-stone">{fmtDate(u.startsAt, { weekday: "long", day: "numeric", month: "long" })}, {fmtTime(u.startsAt)}</span></li>)}
            {!upcoming.length && next && <li className="py-3"><strong>Weekly fellowship</strong><span className="block text-sm text-stone">{fmtDate(next, { weekday: "long", day: "numeric", month: "long" })}, {s.meetingTime} · {s.meetingVenue}</span></li>}
          </ul>
          <Link href="/events" className="link-u mt-4 inline-block text-sm font-semibold">All events →</Link>
        </div>
      </div>
    </section>
  );
}
