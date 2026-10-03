import Link from "next/link";
import { db } from "@/lib/db";
import { requireArea } from "@/lib/auth";
import { findDuplicateEvents, incompleteProjects } from "@/lib/admin/review";
import { fmtDate, humanize, truncate } from "@/lib/utils";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { mergeAction, notDuplicate, reviewAction } from "./actions";

export const metadata = { title: "Needs review" };

type Item = { kind: Parameters<typeof reviewAction>[0]; id: string; title: string; meta: string; href: string; publishable: boolean; sourceUrl?: string | null; status?: string; verification?: string };

function Actions({ it }: { it: Item }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {it.publishable && it.status !== "PUBLISHED" && <form action={reviewAction.bind(null, it.kind, it.id, "approve")}><SubmitButton className="btn-ink btn-sm" pendingText="…">Approve</SubmitButton></form>}
      {it.verification !== "VERIFIED" && <form action={reviewAction.bind(null, it.kind, it.id, it.publishable && it.status !== "PUBLISHED" ? "approve_verify" : "verify")}><SubmitButton className="btn-ghost btn-sm bg-white" pendingText="…">{it.publishable && it.status !== "PUBLISHED" ? "Approve + verify" : "Mark verified"}</SubmitButton></form>}
      <Link href={it.href} className="btn-ghost btn-sm bg-white">Edit</Link>
      <form action={reviewAction.bind(null, it.kind, it.id, "reject")}><SubmitButton className="btn-ghost btn-sm bg-white text-cranberry" pendingText="…">Reject</SubmitButton></form>
    </div>
  );
}

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireArea("review");
  const tab = (await searchParams).tab || "imports";
  const [events, posts, dupsAll, dismissed, incomplete, people, history, leadership, achievements, milestones, projects] = await Promise.all([
    db.event.findMany({ where: { publishStatus: "IN_REVIEW", mergedIntoId: null }, include: { organizer: true }, orderBy: { date: "asc" } }),
    db.socialPost.findMany({ where: { publishStatus: "IN_REVIEW" }, orderBy: { postedAt: "desc" } }),
    findDuplicateEvents(),
    db.siteSetting.findUnique({ where: { key: "dismissed_duplicates" } }),
    incompleteProjects(),
    db.person.findMany({ where: { verification: { not: "VERIFIED" } }, orderBy: { name: "asc" } }),
    db.historyEntry.findMany({ where: { verification: { not: "VERIFIED" } }, orderBy: { date: "asc" } }),
    db.leadershipAssignment.findMany({ where: { verification: { not: "VERIFIED" } }, include: { person: true, role: true, year: true } }),
    db.achievement.findMany({ where: { verification: { not: "VERIFIED" } } }),
    db.projectMilestone.findMany({ where: { verification: { not: "VERIFIED" } }, include: { project: { select: { title: true } } } }),
    db.project.findMany({ where: { verification: { not: "VERIFIED" } } }),
  ]);
  const dis = new Set((dismissed?.value as string[]) || []);
  const dups = dupsAll.filter((p) => !dis.has([p.a.id, p.b.id].sort().join(":")));

  const imports: Item[] = [
    ...events.map((e) => ({ kind: "event" as const, id: e.id, title: e.title, meta: `Event · ${fmtDate(e.date)} · ${e.organizer?.name ?? "no organizer"} · from ${e.source ?? "unknown"}`, href: `/admin/c/events/${e.id}`, publishable: true, sourceUrl: e.sourceUrl, status: e.publishStatus, verification: e.verification })),
    ...posts.map((p) => ({ kind: "socialPost" as const, id: p.id, title: truncate(p.content, 90) || p.url, meta: `${humanize(p.platform)} post · ${p.postedAt ? fmtDate(p.postedAt) : "undated"}`, href: `/admin/c/social/${p.id}`, publishable: true, sourceUrl: p.url, status: p.publishStatus, verification: p.verification })),
  ];
  const unverified: Item[] = [
    ...leadership.map((l) => ({ kind: "leadershipAssignment" as const, id: l.id, title: `${l.person.name}: ${l.customTitle || l.role.title}, ${l.year.label}`, meta: `${humanize(l.verification)} · ${l.source ?? ""}`, href: `/admin/c/leadership/${l.id}`, publishable: false, sourceUrl: l.sourceUrl, verification: l.verification })),
    ...people.map((p) => ({ kind: "person" as const, id: p.id, title: p.name, meta: `Person · ${humanize(p.verification)} · ${p.source ?? ""}`, href: `/admin/c/people/${p.id}`, publishable: false, sourceUrl: p.sourceUrl, verification: p.verification })),
    ...history.map((h) => ({ kind: "historyEntry" as const, id: h.id, title: h.title, meta: `Timeline · ${h.dateLabel || fmtDate(h.date)} · ${h.source ?? ""}`, href: `/admin/c/history/${h.id}`, publishable: true, sourceUrl: h.sourceUrl, status: h.publishStatus, verification: h.verification })),
    ...projects.map((p) => ({ kind: "project" as const, id: p.id, title: p.title, meta: `Project · ${p.source ?? ""}`, href: `/admin/c/projects/${p.id}`, publishable: true, sourceUrl: p.sourceUrl, status: p.publishStatus, verification: p.verification })),
    ...milestones.map((m) => ({ kind: "projectMilestone" as const, id: m.id, title: `${m.project.title}: ${m.title}`, meta: `Milestone · ${m.source ?? ""}`, href: `/admin/c/milestones/${m.id}`, publishable: false, sourceUrl: m.sourceUrl, verification: m.verification })),
    ...achievements.map((a) => ({ kind: "achievement" as const, id: a.id, title: a.title, meta: `Achievement · ${a.source ?? ""}`, href: `/admin/c/achievements/${a.id}`, publishable: true, sourceUrl: a.sourceUrl, status: a.publishStatus, verification: a.verification })),
  ];
  const tabs = [
    ["imports", "New imports", imports.length],
    ["duplicates", "Possible duplicates", dups.length],
    ["unverified", "Unverified & conflicting", unverified.length],
    ["incomplete", "Incomplete projects", incomplete.length],
  ] as const;

  const List = ({ items }: { items: Item[] }) => (
    <ul className="card divide-y divide-line">
      {items.map((it) => (
        <li key={it.kind + it.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold">{it.title}</p>
            <p className="text-xs text-stone">{it.meta}{it.sourceUrl && <> · <a href={it.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">source</a></>}</p>
            {it.verification === "CONFLICTING" && <p className="mt-1 text-xs font-semibold text-cranberry">Sources conflict. Check before verifying.</p>}
          </div>
          <Actions it={it} />
        </li>
      ))}
      {!items.length && <li className="p-8 text-center text-stone">All clear.</li>}
    </ul>
  );

  return (
    <>
      <p className="eyebrow">Content review</p>
      <h1 className="mb-2 text-4xl font-bold">Needs review</h1>
      <p className="mb-6 max-w-2xl text-sm text-stone">Imported events and posts wait here until approved. Researched records stay marked “Needs verification” on the public site until someone from the club confirms them.</p>
      <nav className="mb-6 flex flex-wrap gap-2">
        {tabs.map(([k, l, n]) => <Link key={k} href={`/admin/review?tab=${k}`} className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${tab === k ? "border-royal bg-royal text-paper" : "border-fg/20 bg-white"}`}>{l} <span className="opacity-60">{n}</span></Link>)}
      </nav>
      {tab === "imports" && <List items={imports} />}
      {tab === "unverified" && <List items={unverified} />}
      {tab === "incomplete" && (
        <ul className="card divide-y divide-line">
          {incomplete.map((p) => <li key={p.id} className="flex items-center justify-between p-4"><div><p className="font-semibold">{p.title}</p><p className="text-xs text-stone">Missing: {p.missing.join(", ")}</p></div><Link className="btn-ghost btn-sm bg-white" href={`/admin/c/projects/${p.id}`}>Complete</Link></li>)}
          {!incomplete.length && <li className="p-8 text-center text-stone">Every project is complete.</li>}
        </ul>
      )}
      {tab === "duplicates" && (
        <ul className="grid gap-4">
          {dups.map((p) => (
            <li key={p.a.id + p.b.id} className="card p-4">
              <p className="mb-3 text-xs font-semibold text-stone">Similarity {Math.round(p.score * 100)}%</p>
              <div className="grid gap-4 md:grid-cols-2">
                {[p.a, p.b].map((e, i) => {
                  const other = i === 0 ? p.b : p.a;
                  return (
                    <div key={e.id} className="rounded-md border border-line p-3">
                      <Link href={`/admin/c/events/${e.id}`} className="font-semibold hover:text-cranberry">{e.title}</Link>
                      <p className="text-xs text-stone">{fmtDate(e.date)} · {e.organizer ?? "—"} · {e.venue ?? "no venue"} · {e.source ?? "manual"}</p>
                      <form action={mergeAction.bind(null, e.id, other.id)} className="mt-2"><SubmitButton className="btn-ink btn-sm" pendingText="Merging…">Keep this, merge the other into it</SubmitButton></form>
                    </div>
                  );
                })}
              </div>
              <form action={notDuplicate.bind(null, p.a.id, p.b.id)} className="mt-3"><SubmitButton className="text-xs font-semibold text-stone underline" pendingText="…">Not a duplicate</SubmitButton></form>
            </li>
          ))}
          {!dups.length && <li className="card p-8 text-center text-stone">No likely duplicates.</li>}
        </ul>
      )}
    </>
  );
}
