import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { nextRegularMeeting } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { rotaryYearStart } from "@/lib/meeting/stats";
import { clockTime, longDate } from "@/lib/meeting/today";
import { fmtDate } from "@/lib/utils";
import { Empty } from "@/components/site/Section";

export const metadata: Metadata = { title: "My attendance", robots: { index: false } };

export default async function MyAttendancePage() {
  const user = await requireUser("/account/attendance");
  if (!user.memberId || !user.member) return <section className="container-x py-16"><Empty title="No member record linked">Ask a club admin to link your account to your membership.</Empty></section>;
  const since = rotaryYearStart();
  const from = user.member.membershipDate && user.member.membershipDate > since ? user.member.membershipDate : since;
  const [s, mine, weeklyHeld, total] = await Promise.all([
    getSettings(),
    db.attendanceRecord.findMany({ where: { memberId: user.memberId }, include: { meeting: true }, orderBy: { checkedInAt: "desc" }, take: 20 }),
    db.meeting.findMany({ where: { type: "WEEKLY", date: { gte: from } }, select: { id: true } }),
    db.attendanceRecord.count({ where: { memberId: user.memberId } }),
  ]);
  const heldIds = new Set(weeklyHeld.map((m) => m.id));
  const attendedWeekly = await db.attendanceRecord.count({ where: { memberId: user.memberId, meetingId: { in: [...heldIds] } } });
  const rate = weeklyHeld.length ? Math.round((attendedWeekly / weeklyHeld.length) * 100) : null;
  const next = nextRegularMeeting(s.meetingDay, s.meetingTime);
  return (
    <section className="container-x py-14">
      <p className="eyebrow mb-2">Private to you</p>
      <h1 className="mb-10 text-5xl font-bold">My attendance</h1>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-line lg:grid-cols-3">
        {[
          ["This Rotary year", rate == null ? "—" : `${rate}%`, `${attendedWeekly} of ${weeklyHeld.length} weekly meetings`],
          ["All meetings attended", String(total), "since sign-in records began"],
          ["Next meeting", next ? fmtDate(next, { weekday: "short", day: "numeric", month: "short" }) : "—", `${s.meetingTime} · ${s.meetingVenue}`],
        ].map(([l, v, sub]) => (
          <div key={l} className="bg-white p-6">
            <p className="eyebrow">{l}</p>
            <p className="mt-2 font-display text-4xl font-bold">{v}</p>
            <p className="mt-1 text-sm text-stone">{sub}</p>
          </div>
        ))}
      </div>
      <h2 className="mb-4 mt-14 text-2xl font-bold">Recent meetings</h2>
      {mine.length ? (
        <ul className="divide-y divide-line border-y border-line">
          {mine.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 py-3">
              <span className="font-semibold">{r.meeting.title}</span>
              <span className="text-sm text-stone">{longDate(r.meeting.date)} · signed in {clockTime(r.checkedInAt)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="No sign-ins yet">Scan the QR code at the next meeting and sign in as a member.</Empty>
      )}
      <p className="mt-6 max-w-2xl text-sm text-stone">
        A sign-in counts as yours when you use the email address or phone number on your membership record. If one is missing, ask the club secretary to add it, or <Link href="/account" className="link-u">check your account</Link>.
      </p>
    </section>
  );
}
