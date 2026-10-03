import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { requireArea } from "@/lib/auth";
import { allFields, getResource } from "@/lib/admin/resources";
import { listRows } from "@/lib/admin/crud";
import { mediaSrc } from "@/lib/media";
import { cn, fmtShort, humanize, truncate } from "@/lib/utils";
import { Flash } from "@/components/admin/Flash";

export async function generateMetadata({ params }: { params: Promise<{ resource: string }> }) {
  const r = getResource((await params).resource);
  return { title: r?.label };
}

const TONE: Record<string, string> = {
  VERIFIED: "bg-grass/15 text-fg", NEEDS_VERIFICATION: "bg-gold/25 text-charcoal", CONFLICTING: "bg-cranberry/15 text-cranberry", UNVERIFIED: "bg-royal/10",
  PUBLISHED: "bg-grass/15 text-fg", DRAFT: "bg-royal/10", IN_REVIEW: "bg-gold/25 text-charcoal", REJECTED: "bg-cranberry/15 text-cranberry", ARCHIVED: "bg-royal/10",
  ACTIVE: "bg-grass/15 text-fg", NEW: "bg-cranberry/15 text-cranberry",
};

export default async function ResourceList({ params, searchParams }: { params: Promise<{ resource: string }>; searchParams: Promise<Record<string, string>> }) {
  const r = getResource((await params).resource);
  if (!r) notFound();
  await requireArea(r.area);
  const sp = await searchParams;
  const filterable = allFields(r).filter((f) => f.type === "relation" || ["verification", "publishStatus", "status", "type", "category", "phase"].includes(f.name));
  const filters: Record<string, string> = {};
  for (const f of filterable) if (sp[f.name]) filters[f.name] = sp[f.name];
  const { rows, total, page, pages } = await listRows(r, { q: sp.q, page: Number(sp.page) || 1, filters });
  const qs = (o: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...o }).filter(([, v]) => v !== undefined && v !== "") as [string, string][]);
    return `?${p}`;
  };
  const parentFilter = Object.entries(filters).find(([k]) => k.endsWith("Id"));
  const enumFilters = allFields(r).filter((f) => f.type === "select" && ["verification", "publishStatus", "status"].includes(f.name));

  return (
    <>
      <Flash sp={sp} />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{r.group}</p>
          <h1 className="text-4xl font-bold">{r.label}</h1>
          {r.description && <p className="mt-2 max-w-2xl text-sm text-stone">{r.description}</p>}
        </div>
        <div className="flex gap-2">
          {r.key === "photos" && <Link href={`/admin/upload${parentFilter ? `?${parentFilter[0]}=${parentFilter[1]}` : ""}`} className="btn-primary btn-sm">Upload photos</Link>}
          {r.key === "social" && <Link href="/admin/import" className="btn-primary btn-sm">Import post</Link>}
          <Link href={`/admin/c/${r.key}/new${parentFilter ? `?${parentFilter[0]}=${parentFilter[1]}` : ""}`} className="btn-ink btn-sm"><Plus className="size-4" aria-hidden /> New {r.singular.toLowerCase()}</Link>
        </div>
      </div>

      <form className="mb-4 flex flex-wrap items-center gap-2" role="search">
        {Object.entries(sp).filter(([k]) => !["q", "page", "saved", "deleted", "error", ...enumFilters.map((f) => f.name)].includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <input name="q" defaultValue={sp.q} placeholder={`Search ${r.label.toLowerCase()}…`} aria-label="Search" className="input max-w-xs" />
        {enumFilters.map((f) => (
          <select key={f.name} name={f.name} defaultValue={sp[f.name] || ""} aria-label={f.label} className="input w-auto">
            <option value="">{f.label}: all</option>
            {f.options!.map((o) => <option key={o} value={o}>{humanize(o)}</option>)}
          </select>
        ))}
        <button className="btn-ghost btn-sm">Filter</button>
        {(sp.q || Object.keys(filters).length > 0) && <Link href={`/admin/c/${r.key}`} className="text-sm text-stone underline">Clear</Link>}
      </form>
      {parentFilter && <p className="mb-3 rounded-md bg-paper-2 px-3 py-2 text-sm">Filtered by parent record. <Link className="underline" href={`/admin/c/${r.key}`}>Show all</Link></p>}

      <div className="card overflow-x-auto">
        <table className="table-x">
          <thead>
            <tr>{r.listFields.map((lf) => <th key={lf.name} scope="col">{lf.label}</th>)}<th className="sr-only">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)} className="hover:bg-paper/60">
                {r.listFields.map((lf, i) => {
                  const v = row[lf.name];
                  let out: React.ReactNode = v == null ? <span className="text-stone-2">—</span> : String(v);
                  if (lf.name === "__thumb") {
                    const src = mediaSrc(row as Parameters<typeof mediaSrc>[0], "sm");
                    // eslint-disable-next-line @next/next/no-img-element
                    out = src ? <img src={src} alt="" className="size-12 rounded object-cover" /> : null;
                  } else if (lf.type === "date" && v) out = fmtShort(v as Date);
                  else if (lf.type === "bool") out = v ? "Yes" : "No";
                  else if (lf.type === "enum" && v) out = <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", TONE[String(v)] || "bg-royal/5")}>{humanize(String(v))}</span>;
                  else if (lf.type === "rel") out = v ? String((v as Record<string, unknown>)[lf.rel!] ?? "") : <span className="text-stone-2">—</span>;
                  else if (typeof v === "string") out = truncate(v, 80);
                  return (
                    <td key={lf.name}>
                      {i === 0 || lf.name === r.titleField ? <Link href={`/admin/c/${r.key}/${row.id}`} className="font-semibold hover:text-cranberry">{out || "(untitled)"}</Link> : out}
                    </td>
                  );
                })}
                <td className="text-right"><Link href={`/admin/c/${r.key}/${row.id}`} className="text-xs font-semibold text-cranberry">Edit</Link></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={r.listFields.length + 1} className="py-10 text-center text-stone">Nothing here yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-stone">
        <span>{total} total</span>
        {pages > 1 && (
          <span className="flex gap-2">
            {page > 1 && <Link className="btn-ghost btn-sm" href={qs({ page: page - 1 })}>← Prev</Link>}
            <span className="self-center">Page {page} of {pages}</span>
            {page < pages && <Link className="btn-ghost btn-sm" href={qs({ page: page + 1 })}>Next →</Link>}
          </span>
        )}
      </div>
    </>
  );
}
