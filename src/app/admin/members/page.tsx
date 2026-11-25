import Link from "next/link";
import { Download, Plus, Upload } from "lucide-react";
import type { MemberStatus } from "@prisma/client";
import { requireArea } from "@/lib/auth";
import { db } from "@/lib/db";
import { listMembers, STATUS_LABEL, STATUS_ORDER } from "@/lib/members";
import { cn, fmtDate } from "@/lib/utils";
import { Flash } from "@/components/admin/Flash";

export const metadata = { title: "Members" };

const TONE: Record<MemberStatus, string> = {
  ACTIVE: "bg-grass/15 text-fg", PENDING: "bg-gold/25 text-charcoal", INACTIVE: "bg-royal/10", ALUMNI: "bg-azure/10 text-royal", HONORARY: "bg-cranberry/10 text-cranberry", ARCHIVED: "bg-fg/10 text-stone",
};

export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireArea("members");
  const sp = await searchParams;
  const filter = { q: sp.q, status: sp.status };
  const [members, counts] = await Promise.all([listMembers(filter), db.member.groupBy({ by: ["status"], _count: true })]);
  const count = (s?: MemberStatus) => (s ? counts.find((c) => c.status === s)?._count || 0 : counts.filter((c) => c.status !== "ARCHIVED").reduce((a, c) => a + c._count, 0));
  const qs = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ q: sp.q, status: sp.status, ...o }).filter(([, v]) => !!v) as [string, string][]).toString();
    return p ? `?${p}` : "";
  };
  const pill = (on: boolean) => cn("inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold", on ? "border-royal bg-royal text-paper" : "border-fg/20 bg-white hover:border-royal");

  return (
    <>
      <Flash sp={sp} />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">People</p>
          <h1 className="text-4xl font-bold">Members</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone">The club&rsquo;s private membership register. Contact details and notes are never shown on the website. Each member also has a profile, which stays hidden until it&rsquo;s made public.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/c/members/new" className="btn-primary btn-sm"><Plus className="size-4" aria-hidden /> Add a member</Link>
          <Link href="/admin/members/import" className="btn-ghost btn-sm bg-white"><Upload className="size-4" aria-hidden /> Import from a spreadsheet</Link>
          <a href={`/admin/members/export${qs({})}`} className="btn-ghost btn-sm bg-white"><Download className="size-4" aria-hidden /> Export CSV</a>
        </div>
      </div>

      <form className="mb-4 flex max-w-lg gap-2" role="search">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <label htmlFor="mq" className="sr-only">Search members</label>
        <input id="mq" name="q" type="search" defaultValue={sp.q} placeholder="Name, member ID, email, phone or profession" className="input" />
        <button className="btn-ink btn-sm">Search</button>
      </form>
      <nav aria-label="Membership status" className="mb-6 flex flex-wrap gap-2">
        <Link href={`/admin/members${qs({ status: undefined })}`} className={pill(!sp.status)}>Current <span className="font-normal opacity-70">{count()}</span></Link>
        {STATUS_ORDER.map((s) => (
          <Link key={s} href={`/admin/members${qs({ status: s })}`} className={pill(sp.status === s)}>{STATUS_LABEL[s]} <span className="font-normal opacity-70">{count(s)}</span></Link>
        ))}
      </nav>

      {members.length ? (
        <div className="card overflow-x-auto">
          <table className="table-x">
            <thead>
              <tr><th>Name</th><th>Status</th><th>Profession</th><th>Email</th><th>Phone</th><th>Joined</th><th>Profile</th><th>Account</th></tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td><Link href={`/admin/c/members/${m.id}`} className="font-semibold hover:text-cranberry">{m.person.name}</Link><span className="block font-cond text-xs text-stone">{m.memberNumber}</span></td>
                  <td><span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", TONE[m.status])}>{STATUS_LABEL[m.status]}</span></td>
                  <td className="text-stone">{[m.person.professionalTitle, m.person.organization].filter(Boolean).join(", ") || "—"}</td>
                  <td>{m.email ? <a href={`mailto:${m.email}`} className="hover:text-cranberry">{m.email}</a> : <span className="text-stone">—</span>}</td>
                  <td className="whitespace-nowrap">{m.phone || <span className="text-stone">—</span>}</td>
                  <td className="whitespace-nowrap text-stone">{m.membershipDate ? fmtDate(m.membershipDate, { month: "short", year: "numeric" }) : "—"}</td>
                  <td><Link href={`/admin/c/people/${m.person.id}`} className={cn("text-xs font-semibold hover:underline", m.person.isPublic ? "text-fg" : "text-stone")}>{m.person.isPublic ? "Public" : "Hidden"}</Link></td>
                  <td className="text-xs text-stone">{m.user ? "Activated" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <p className="font-semibold">{sp.q || sp.status ? "No members match." : "No members yet."}</p>
          <p className="mt-1 text-sm text-stone">{sp.q || sp.status ? <Link href="/admin/members" className="underline">Show everyone</Link> : <>Add them one at a time, or <Link href="/admin/members/import" className="underline">import a spreadsheet</Link>.</>}</p>
        </div>
      )}
      {members.length >= 500 && <p className="mt-3 text-sm text-stone">Showing the first 500. Search or filter to narrow the list; the CSV export includes everyone.</p>}
    </>
  );
}
