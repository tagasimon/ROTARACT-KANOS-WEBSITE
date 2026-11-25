import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireArea } from "@/lib/auth";
import { getResource } from "@/lib/admin/resources";
import { delegate, getRow, rowTitle } from "@/lib/admin/crud";
import { db } from "@/lib/db";
import { ResourceForm } from "@/components/admin/ResourceForm";
import { Flash } from "@/components/admin/Flash";
import { ConfirmButton } from "@/components/admin/SubmitButton";
import { deleteResource, saveResource } from "../actions";
import { fmtDate } from "@/lib/utils";

export default async function EditResource({ params, searchParams }: { params: Promise<{ resource: string; id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { resource, id } = await params;
  const r = getResource(resource);
  if (!r) notFound();
  await requireArea(r.area);
  const row = await getRow(r, id);
  if (!row) notFound();
  const sp = await searchParams;
  const children = await Promise.all(
    (r.children || []).map(async (c) => {
      const cr = getResource(c.resource)!;
      return { ...c, count: await delegate(cr.model).count({ where: { [c.fk]: id, ...(cr.where || {}) } }) };
    }),
  );
  const history = await db.auditLog.findMany({ where: { entityId: id }, include: { user: { select: { email: true } } }, orderBy: { createdAt: "desc" }, take: 8 });
  // Unpublished items: these kinds of page can be previewed by admins; for the rest the public page won't show them.
  const PREVIEWABLE = new Set(["projects", "stories", "events", "campaigns", "businesses", "people"]);
  const unpublished = ("publishStatus" in row && row.publishStatus !== "PUBLISHED") || (r.key === "people" && row.isPublic === false);
  const publicPath = unpublished && !PREVIEWABLE.has(r.key) ? null : r.publicPath?.(row);
  return (
    <>
      <Flash sp={sp} />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow"><Link href={r.listHref || `/admin/c/${r.key}`} className="hover:underline">{r.label}</Link></p>
          <h1 className="text-4xl font-bold">{rowTitle(r, row)}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {r.key === "social" && <Link href={`/admin/convert/${id}`} className="btn-primary btn-sm">Convert post →</Link>}
          {publicPath && <Link href={publicPath} target="_blank" className="btn-ghost btn-sm">{unpublished ? "Preview" : "View on site"} <ExternalLink className="size-3.5" aria-hidden /></Link>}
        </div>
      </div>
      {children.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {children.map((c) => (
            <span key={c.resource} className="inline-flex overflow-hidden rounded-full border border-fg/20 text-sm">
              <Link href={`/admin/c/${c.resource}?${c.fk}=${id}`} className="px-3 py-1.5 font-semibold hover:bg-paper-2">{c.label} <span className="text-stone">{c.count}</span></Link>
              <Link href={`/admin/c/${c.resource}/new?${c.fk}=${id}`} className="border-l border-fg/20 px-3 py-1.5 hover:bg-paper-2" aria-label={`Add ${c.label}`}>+</Link>
            </span>
          ))}
        </div>
      )}
      <ResourceForm r={r} row={row} action={saveResource.bind(null, r.key, id)} />
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <p className="label mb-3">Change history</p>
          <ul className="space-y-1 text-sm">
            {history.map((h) => <li key={h.id}>{fmtDate(h.createdAt, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {h.action} · {h.user?.email || "system"}</li>)}
            {!history.length && <li className="text-stone">No changes recorded.</li>}
          </ul>
        </div>
        <form action={deleteResource.bind(null, r.key, id)} className="card flex items-center justify-between gap-4 border-cranberry/30 p-5">
          <div><p className="font-semibold">Delete this {r.singular.toLowerCase()}</p><p className="text-sm text-stone">This can't be undone. Consider archiving or unpublishing instead.</p></div>
          <ConfirmButton message="Click again to delete">Delete</ConfirmButton>
        </form>
      </div>
    </>
  );
}
