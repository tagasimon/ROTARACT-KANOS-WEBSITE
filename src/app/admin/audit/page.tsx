import Link from "next/link";
import { requireArea } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireArea("audit");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = { ...(sp.entity ? { entity: sp.entity } : {}), ...(sp.action ? { action: sp.action } : {}) };
  const [rows, entities] = await Promise.all([
    db.auditLog.findMany({ where, include: { user: { select: { email: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * 100, take: 100 }),
    db.auditLog.groupBy({ by: ["entity"], _count: true, orderBy: { entity: "asc" } }),
  ]);
  return (
    <>
      <p className="eyebrow">System</p>
      <h1 className="mb-6 text-4xl font-bold">Audit log</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/audit" className="btn-ghost btn-sm bg-white">All</Link>
        {entities.map((e) => <Link key={e.entity} href={`/admin/audit?entity=${e.entity}`} className={`btn-sm btn ${sp.entity === e.entity ? "bg-royal text-paper" : "btn-ghost bg-white"}`}>{e.entity} <span className="opacity-60">{e._count}</span></Link>)}
      </div>
      <div className="card overflow-x-auto">
        <table className="table-x">
          <thead><tr><th>When</th><th>User</th><th>Action</th><th>Entity</th><th>Summary</th><th>IP</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap">{fmtDate(r.createdAt, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                <td>{r.user?.email || "system"}</td>
                <td className="font-semibold">{r.action}</td>
                <td className="font-cond text-xs">{r.entity}{r.entityId && <span className="block text-stone">{r.entityId}</span>}</td>
                <td>{r.summary}</td>
                <td className="font-cond text-xs text-stone">{r.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex gap-2">{page > 1 && <Link className="btn-ghost btn-sm" href={`?page=${page - 1}${sp.entity ? `&entity=${sp.entity}` : ""}`}>← Newer</Link>}{rows.length === 100 && <Link className="btn-ghost btn-sm" href={`?page=${page + 1}${sp.entity ? `&entity=${sp.entity}` : ""}`}>Older →</Link>}</div>
    </>
  );
}
