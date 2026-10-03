import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ADMIN_ROLES, can } from "@/lib/rbac";
import { getCurrentYear } from "@/lib/years";
import { startOfToday } from "@/lib/queries";
import { fmtDate, fmtTime, humanize } from "@/lib/utils";
import { Flash } from "@/components/admin/Flash";

export const metadata = { title: "Dashboard" };

export default async function AdminHome({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireRole(ADMIN_ROLES);
  const sp = await searchParams;
  const year = await getCurrentYear();
  const today = startOfToday();
  const [members, people, projects, upcoming, needsVerif, inReview, inquiries, sessions, recent, presidentSet] = await Promise.all([
    db.member.count({ where: { status: "ACTIVE" } }),
    db.person.count({ where: { isPublic: true } }),
    db.project.count(),
    db.event.findMany({ where: { date: { gte: today }, mergedIntoId: null, publishStatus: "PUBLISHED" }, include: { organizer: true }, orderBy: { date: "asc" }, take: 6 }),
    Promise.all([db.person.count({ where: { verification: { not: "VERIFIED" } } }), db.project.count({ where: { verification: { not: "VERIFIED" } } }), db.historyEntry.count({ where: { verification: { not: "VERIFIED" } } }), db.leadershipAssignment.count({ where: { verification: { not: "VERIFIED" } } })]).then((x) => x.reduce((a, b) => a + b, 0)),
    Promise.all([db.event.count({ where: { publishStatus: "IN_REVIEW", mergedIntoId: null } }), db.socialPost.count({ where: { publishStatus: "IN_REVIEW" } })]).then((x) => x[0] + x[1]),
    db.inquiry.findMany({ where: { status: "NEW" }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.attendanceSession.findMany({ where: { startsAt: { gte: new Date(Date.now() - 7 * 86400000) } }, include: { _count: { select: { records: true } } }, orderBy: { startsAt: "desc" }, take: 4 }),
    db.auditLog.findMany({ include: { user: { select: { email: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
    year ? db.leadershipAssignment.count({ where: { yearId: year.id, role: { slug: "president" } } }) : 0,
  ]);
  const tasks = [
    !year && { t: "Create the current Rotaract year", h: "/admin/c/years/new" },
    year && !presidentSet && { t: `Assign the ${year.label} president`, h: `/admin/c/leadership/new?yearId=${year.id}` },
    !members && { t: "Add member records so attendance and My Attendance work", h: "/admin/c/members/new" },
    needsVerif > 0 && { t: `${needsVerif} researched records still need verification`, h: "/admin/review" },
    inReview > 0 && { t: `${inReview} imported items waiting for review`, h: "/admin/review" },
  ].filter(Boolean) as { t: string; h: string }[];

  const quick = [
    can(user.role, "attendance") && ["Start QR attendance", "/admin/attendance/sessions/new"],
    can(user.role, "events") && ["New event", "/admin/c/events/new"],
    can(user.role, "content") && ["New story", "/admin/c/stories/new"],
    can(user.role, "content") && ["Import social post", "/admin/import"],
    can(user.role, "content") && ["Upload photos", "/admin/upload"],
    can(user.role, "content") && ["New project", "/admin/c/projects/new"],
    can(user.role, "events") && ["Record district visit", "/admin/c/visits/new"],
    can(user.role, "members") && ["Add member", "/admin/c/members/new"],
  ].filter(Boolean) as [string, string][];

  return (
    <>
      <Flash sp={sp} />
      <p className="eyebrow">{year ? `Rotaract year ${year.label}` : "No current year set"}</p>
      <h1 className="mb-8 text-4xl font-bold">Good to see you{user.member?.person.name ? `, ${user.member.person.name.split(" ")[0]}` : ""}.</h1>

      <div className="mb-8 flex flex-wrap gap-2">{quick.map(([l, h]) => <Link key={h} href={h} className="btn-ghost btn-sm bg-white">{l}</Link>)}</div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[["Active members", members, "/admin/c/members"], ["Public profiles", people, "/admin/c/people"], ["Projects", projects, "/admin/c/projects"], ["Needs review", inReview + needsVerif, "/admin/review"]].map(([l, v, h]) => (
          <Link key={String(l)} href={String(h)} className="card p-5 hover:border-royal">
            <p className="label">{l}</p>
            <p className="mt-2 font-display text-4xl font-bold">{v}</p>
          </Link>
        ))}
      </div>

      {tasks.length > 0 && (
        <div className="card mb-8 border-gold/60 p-5">
          <p className="label mb-3">To do</p>
          <ul className="space-y-2">{tasks.map((t) => <li key={t.h}><Link href={t.h} className="font-semibold hover:text-cranberry">→ {t.t}</Link></li>)}</ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex justify-between"><p className="label">Upcoming events</p><Link href="/admin/c/events" className="text-xs font-semibold text-cranberry">All</Link></div>
          <ul className="divide-y divide-line">
            {upcoming.map((e) => <li key={e.id} className="py-2"><Link href={`/admin/c/events/${e.id}`} className="font-semibold hover:text-cranberry">{e.title}</Link><span className="block text-xs text-stone">{fmtDate(e.date)} · {e.organizer?.name}</span></li>)}
            {!upcoming.length && <li className="py-2 text-sm text-stone">None scheduled.</li>}
          </ul>
        </section>
        {can(user.role, "attendance") && (
          <section className="card p-5">
            <div className="mb-3 flex justify-between"><p className="label">Recent attendance sessions</p><Link href="/admin/attendance" className="text-xs font-semibold text-cranberry">Dashboard</Link></div>
            <ul className="divide-y divide-line">
              {sessions.map((s) => <li key={s.id} className="flex justify-between py-2"><Link href={`/admin/attendance/sessions/${s.id}`} className="font-semibold hover:text-cranberry">{s.title}</Link><span className="text-sm text-stone">{s._count.records} present · {fmtDate(s.startsAt, { day: "numeric", month: "short" })} {fmtTime(s.startsAt)}</span></li>)}
              {!sessions.length && <li className="py-2 text-sm text-stone">No sessions this week.</li>}
            </ul>
          </section>
        )}
        {can(user.role, "inquiries") && (
          <section className="card p-5">
            <div className="mb-3 flex justify-between"><p className="label">New inquiries</p><Link href="/admin/c/inquiries" className="text-xs font-semibold text-cranberry">All</Link></div>
            <ul className="divide-y divide-line">
              {inquiries.map((q) => <li key={q.id} className="py-2"><Link href={`/admin/c/inquiries/${q.id}`} className="font-semibold hover:text-cranberry">{q.name}</Link><span className="block text-xs text-stone">{humanize(q.type)} · {fmtDate(q.createdAt, { day: "numeric", month: "short" })}</span></li>)}
              {!inquiries.length && <li className="py-2 text-sm text-stone">Inbox zero.</li>}
            </ul>
          </section>
        )}
        <section className="card p-5">
          <p className="label mb-3">Recent activity</p>
          <ul className="space-y-1 text-sm">
            {recent.map((a) => <li key={a.id} className="truncate"><span className="text-stone">{fmtDate(a.createdAt, { day: "numeric", month: "short" })}</span> · {a.user?.email || "system"} · {a.action} {a.entity}{a.summary && `: ${a.summary}`}</li>)}
          </ul>
        </section>
      </div>
    </>
  );
}
