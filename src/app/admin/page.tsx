import Link from "next/link";
import { ArrowUpRight, Award, CalendarPlus, FolderPlus, ImagePlus, PenLine, QrCode, Store, UserPlus } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ADMIN_ROLES, can } from "@/lib/rbac";
import { getCurrentYear } from "@/lib/years";
import { startOfToday } from "@/lib/queries";
import { campaignProgress, fmtMoney, fmtMoneyShort } from "@/lib/campaigns";
import { fmtDate, humanize } from "@/lib/utils";
import { Flash } from "@/components/admin/Flash";

export const metadata = { title: "Dashboard" };

const ACTIVE_PROJECT = ["IDEA", "PLANNING", "FUNDRAISING", "IMPLEMENTATION", "ONGOING"] as const;

export default async function AdminHome({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireRole(ADMIN_ROLES);
  const sp = await searchParams;
  const year = await getCurrentYear();
  const today = startOfToday();
  const [
    members, activeProjects, upcomingCount, upcoming, storiesCount, latestStories, needsVerif, inReview, inquiries, lastSession, sessions, recent, presidentSet, pendingBusinesses, campaign,
  ] = await Promise.all([
    db.member.count({ where: { status: "ACTIVE" } }),
    db.project.count({ where: { publishStatus: "PUBLISHED", status: { in: [...ACTIVE_PROJECT] } } }),
    db.event.count({ where: { date: { gte: today }, mergedIntoId: null, publishStatus: "PUBLISHED" } }),
    db.event.findMany({ where: { date: { gte: today }, mergedIntoId: null, publishStatus: "PUBLISHED" }, include: { organizer: true }, orderBy: { date: "asc" }, take: 5 }),
    db.story.count({ where: { publishStatus: "PUBLISHED" } }),
    db.story.findMany({ where: { publishStatus: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 4, select: { id: true, title: true, publishedAt: true } }),
    Promise.all([
      db.person.count({ where: { verification: { not: "VERIFIED" } } }),
      db.project.count({ where: { verification: { not: "VERIFIED" } } }),
      db.historyEntry.count({ where: { verification: { not: "VERIFIED" } } }),
      db.leadershipAssignment.count({ where: { verification: { not: "VERIFIED" } } }),
    ]).then((x) => x.reduce((a, b) => a + b, 0)),
    Promise.all([db.event.count({ where: { publishStatus: "IN_REVIEW", mergedIntoId: null } }), db.socialPost.count({ where: { publishStatus: "IN_REVIEW" } })]).then((x) => x[0] + x[1]),
    db.inquiry.findMany({ where: { status: "NEW" }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.attendanceSession.findFirst({ where: { startsAt: { lte: new Date() } }, include: { _count: { select: { records: true } } }, orderBy: { startsAt: "desc" } }),
    db.attendanceSession.findMany({ where: { startsAt: { gte: new Date(Date.now() - 14 * 86400000) } }, include: { _count: { select: { records: true } } }, orderBy: { startsAt: "desc" }, take: 4 }),
    db.auditLog.findMany({ include: { user: { select: { email: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
    year ? db.leadershipAssignment.count({ where: { yearId: year.id, role: { slug: "president" } } }) : 0,
    db.business.count({ where: { publishStatus: "IN_REVIEW" } }),
    db.campaign.findFirst({ where: { publishStatus: "PUBLISHED", status: "ACTIVE" }, orderBy: [{ featured: "desc" }, { updatedAt: "desc" }] }),
  ]);

  const tasks = [
    !year && { t: "Create the current Rotaract year", h: "/admin/c/years/new" },
    year && !presidentSet && { t: `Assign the ${year.label} president`, h: `/admin/c/leadership/new?yearId=${year.id}` },
    !members && can(user.role, "members") && { t: "Add the club's members (one by one, or import a spreadsheet)", h: "/admin/members" },
    pendingBusinesses > 0 && can(user.role, "people") && { t: `${pendingBusinesses} business ${pendingBusinesses === 1 ? "listing is" : "listings are"} waiting to be published`, h: "/admin/c/businesses?publishStatus=IN_REVIEW" },
    inReview > 0 && can(user.role, "review") && { t: `${inReview} imported ${inReview === 1 ? "item is" : "items are"} waiting for review`, h: "/admin/review" },
    needsVerif > 0 && can(user.role, "review") && { t: `${needsVerif} researched records still need checking`, h: "/admin/review" },
  ].filter(Boolean) as { t: string; h: string }[];

  const quick = [
    can(user.role, "content") && { l: "Add a project", h: "/admin/c/projects/new", i: FolderPlus },
    can(user.role, "members") && { l: "Add a member", h: "/admin/c/members/new", i: UserPlus },
    can(user.role, "people") && { l: "Add a business", h: "/admin/c/businesses/new", i: Store },
    can(user.role, "events") && { l: "Add an event", h: "/admin/c/events/new", i: CalendarPlus },
    can(user.role, "content") && { l: "Add a story", h: "/admin/c/stories/new", i: PenLine },
    can(user.role, "people") && { l: "Update leadership", h: year ? `/admin/c/leadership?yearId=${year.id}` : "/admin/c/leadership", i: Award },
    can(user.role, "content") && { l: "Upload photos", h: "/admin/upload", i: ImagePlus },
    can(user.role, "attendance") && { l: "Manage attendance", h: "/admin/attendance", i: QrCode },
  ].filter(Boolean) as { l: string; h: string; i: typeof FolderPlus }[];

  const tiles = [
    can(user.role, "members") && { l: "Active members", v: members, h: "/admin/members" },
    { l: "Active projects", v: activeProjects, h: "/admin/c/projects" },
    { l: "Upcoming events", v: upcomingCount, h: "/admin/c/events" },
    { l: "Published stories", v: storiesCount, h: "/admin/c/stories", sub: latestStories[0]?.publishedAt ? `Latest ${fmtDate(latestStories[0].publishedAt, { day: "numeric", month: "short" })}` : undefined },
    can(user.role, "attendance") && { l: "Last meeting", v: lastSession ? lastSession._count.records : "—", h: lastSession ? `/admin/attendance/sessions/${lastSession.id}` : "/admin/attendance", sub: lastSession ? fmtDate(lastSession.startsAt, { day: "numeric", month: "short" }) : "No meetings yet" },
  ].filter(Boolean) as { l: string; v: number | string; h: string; sub?: string }[];

  const money = campaign ? campaignProgress(campaign) : null;

  return (
    <>
      <Flash sp={sp} />
      <p className="eyebrow">{year ? `Rotaract year ${year.label}` : "No current year set"}</p>
      <h1 className="mb-8 text-4xl font-bold">Good to see you{user.member?.person.name ? `, ${user.member.person.name.split(" ")[0]}` : ""}.</h1>

      <section aria-label="Quick actions" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quick.map(({ l, h, i: Icon }) => (
          <Link key={l} href={h} className="card flex min-h-14 items-center gap-3 px-4 py-3 font-semibold transition-colors hover:border-royal hover:text-royal">
            <Icon className="size-5 shrink-0 text-cranberry" aria-hidden /> {l}
          </Link>
        ))}
      </section>

      <section aria-label="At a glance" className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {tiles.map((t) => (
          <Link key={t.l} href={t.h} className="card p-5 hover:border-royal">
            <p className="label">{t.l}</p>
            <p className="mt-2 font-display text-4xl font-bold tabular-nums">{t.v}</p>
            {t.sub && <p className="mt-1 text-xs text-stone">{t.sub}</p>}
          </Link>
        ))}
      </section>

      {tasks.length > 0 && (
        <section className="card mb-8 border-gold/60 p-5">
          <h2 className="label mb-3">To do</h2>
          <ul className="space-y-2">{tasks.map((t) => <li key={t.h}><Link href={t.h} className="font-semibold hover:text-cranberry">→ {t.t}</Link></li>)}</ul>
        </section>
      )}

      {campaign && can(user.role, "content") && money && (
        <section className="card mb-8 grid gap-4 border-l-4 border-l-cranberry p-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h2 className="label">Fundraising appeal</h2>
            <p className="mt-1 text-xl font-bold">{campaign.title}</p>
            <p className="mt-1 text-sm text-stone">
              {money.goal != null && <>Target {fmtMoneyShort(money.goal, campaign.currency)}. </>}
              {money.raised != null ? (
                <>Raised {fmtMoney(money.raised, campaign.currency)}{money.percent != null && ` (${money.percent}%)`}{campaign.raisedAsOf ? `, as of ${fmtDate(campaign.raisedAsOf)}` : ""}.</>
              ) : (
                <>No amount raised entered yet; the page shows the target only.</>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/c/campaigns/${campaign.id}`} className="btn-ink btn-sm">Update the appeal</Link>
            <Link href={`/campaigns/${campaign.slug}`} target="_blank" className="btn-ghost btn-sm bg-white">View page <ArrowUpRight className="size-3.5" aria-hidden /></Link>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex justify-between"><h2 className="label">Upcoming events</h2><Link href="/admin/c/events" className="text-xs font-semibold text-cranberry">All</Link></div>
          <ul className="divide-y divide-line">
            {upcoming.map((e) => <li key={e.id} className="py-2"><Link href={`/admin/c/events/${e.id}`} className="font-semibold hover:text-cranberry">{e.title}</Link><span className="block text-xs text-stone">{fmtDate(e.date)} · {e.organizer?.name}</span></li>)}
            {!upcoming.length && <li className="py-2 text-sm text-stone">None scheduled. The weekly fellowship still shows on the site.</li>}
          </ul>
        </section>
        <section className="card p-5">
          <div className="mb-3 flex justify-between"><h2 className="label">Latest stories</h2><Link href="/admin/c/stories" className="text-xs font-semibold text-cranberry">All</Link></div>
          <ul className="divide-y divide-line">
            {latestStories.map((s) => <li key={s.id} className="py-2"><Link href={`/admin/c/stories/${s.id}`} className="font-semibold hover:text-cranberry">{s.title}</Link>{s.publishedAt && <span className="block text-xs text-stone">{fmtDate(s.publishedAt)}</span>}</li>)}
            {!latestStories.length && <li className="py-2 text-sm text-stone">No stories published yet.</li>}
          </ul>
        </section>
        {can(user.role, "attendance") && (
          <section className="card p-5">
            <div className="mb-3 flex justify-between"><h2 className="label">Recent attendance</h2><Link href="/admin/attendance" className="text-xs font-semibold text-cranberry">Attendance</Link></div>
            <ul className="divide-y divide-line">
              {sessions.map((s) => <li key={s.id} className="flex justify-between gap-4 py-2"><Link href={`/admin/attendance/sessions/${s.id}`} className="font-semibold hover:text-cranberry">{s.title}</Link><span className="shrink-0 text-sm text-stone">{s._count.records} present · {fmtDate(s.startsAt, { day: "numeric", month: "short" })}</span></li>)}
              {!sessions.length && <li className="py-2 text-sm text-stone">No meetings in the last two weeks.</li>}
            </ul>
          </section>
        )}
        {can(user.role, "inquiries") && (
          <section className="card p-5">
            <div className="mb-3 flex justify-between"><h2 className="label">New inquiries</h2><Link href="/admin/c/inquiries" className="text-xs font-semibold text-cranberry">All</Link></div>
            <ul className="divide-y divide-line">
              {inquiries.map((q) => <li key={q.id} className="py-2"><Link href={`/admin/c/inquiries/${q.id}`} className="font-semibold hover:text-cranberry">{q.name}</Link><span className="block text-xs text-stone">{humanize(q.type)} · {fmtDate(q.createdAt, { day: "numeric", month: "short" })}</span></li>)}
              {!inquiries.length && <li className="py-2 text-sm text-stone">Nothing new.</li>}
            </ul>
          </section>
        )}
        <section className="card p-5 lg:col-span-2">
          <h2 className="label mb-3">Recent activity</h2>
          <ul className="space-y-1 text-sm">
            {recent.map((a) => <li key={a.id} className="truncate"><span className="text-stone">{fmtDate(a.createdAt, { day: "numeric", month: "short" })}</span> · {a.user?.email || "system"} · {a.action} {a.entity}{a.summary && `: ${a.summary}`}</li>)}
          </ul>
        </section>
      </div>
    </>
  );
}
