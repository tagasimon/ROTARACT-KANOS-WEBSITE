import Link from "next/link";
import { db } from "@/lib/db";
import { mediaSrc } from "@/lib/media";
import { allFields, type Field, type Resource } from "@/lib/admin/resources";
import { relationOptions } from "@/lib/admin/crud";
import { cn, fmtDate, humanize } from "@/lib/utils";
import { MultiPicker } from "./MultiPicker";
import { SubmitButton } from "./SubmitButton";

const toLocalDate = (d: unknown) => (d ? new Date(new Date(d as string).getTime() + 3 * 3600000).toISOString().slice(0, 10) : "");
const toLocalDT = (d: unknown) => (d ? new Date(new Date(d as string).getTime() + 3 * 3600000).toISOString().slice(0, 16) : "");

export async function ResourceForm({ r, row, action, prefill = {} }: { r: Resource; row: Record<string, unknown> | null; action: (fd: FormData) => Promise<void>; prefill?: Record<string, string> }) {
  const fields = allFields(r);
  const opts = new Map<string, { id: string; label: string }[]>();
  await Promise.all(fields.filter((f) => f.relation).map(async (f) => opts.set(f.name, await relationOptions(f))));
  const imageIds = fields.filter((f) => f.type === "image").map((f) => row?.[f.name] as string).filter(Boolean);
  const images = imageIds.length ? await db.media.findMany({ where: { id: { in: imageIds } } }) : [];
  const groups = new Map<string, Field[]>();
  for (const f of fields) {
    const g = f.group || "Details";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(f);
  }
  const val = (f: Field) => (row ? row[f.name] : prefill[f.name] ?? f.default);

  return (
    <form action={action} className="grid gap-8" encType="multipart/form-data">
      {[...groups.entries()].map(([g, list]) => (
        <fieldset key={g} className="card p-5 sm:p-6">
          <legend className="sr-only">{g}</legend>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-cranberry">{g}</p>
          <div className="grid grid-cols-6 gap-x-4 gap-y-5">
            {list.map((f) => (
              <div key={f.name} className={cn("field col-span-6", f.width === "half" && "sm:col-span-3", f.width === "third" && "sm:col-span-2")}>
                {f.type !== "boolean" && <label htmlFor={f.name} className="label">{f.label}{f.required && <span className="text-cranberry"> *</span>}</label>}
                <Input f={f} v={val(f)} options={opts.get(f.name) || []} row={row} images={images} />
                {f.help && <p className="text-xs text-stone">{f.help}</p>}
              </div>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="sticky bottom-0 z-10 -mx-1 flex items-center gap-3 border-t border-line bg-paper-2/95 px-1 py-4 backdrop-blur">
        <SubmitButton>{row ? "Save changes" : `Create ${r.singular.toLowerCase()}`}</SubmitButton>
        <Link href={`/admin/c/${r.key}`} className="btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}

function Input({ f, v, options, row, images }: { f: Field; v: unknown; options: { id: string; label: string }[]; row: Record<string, unknown> | null; images: { id: string }[] }) {
  const common = { id: f.name, name: f.name, className: "input" };
  switch (f.type) {
    case "textarea":
      return <textarea {...common} rows={4} defaultValue={(v as string) ?? ""} required={f.required} />;
    case "markdown":
      return <textarea {...common} rows={8} defaultValue={(v as string) ?? ""} className="input font-cond text-sm" placeholder="Markdown: **bold**, ## heading, - list, [link](https://…)" />;
    case "number":
      return <input {...common} type="number" step="any" defaultValue={v == null ? "" : String(v)} required={f.required} />;
    case "date":
      return <input {...common} type="date" defaultValue={typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : toLocalDate(v)} required={f.required} />;
    case "datetime":
      return <input {...common} type="datetime-local" defaultValue={toLocalDT(v)} required={f.required} />;
    case "boolean":
      return (
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" id={f.name} name={f.name} defaultChecked={!!v} className="size-5 accent-[var(--color-cranberry)]" />
          {f.label}
        </label>
      );
    case "select":
      return (
        <select {...common} defaultValue={(v as string) ?? ""} required={f.required}>
          {!f.required && <option value="">—</option>}
          {f.options!.map((o) => <option key={o} value={o}>{humanize(o)}</option>)}
        </select>
      );
    case "relation":
      return (
        <select {...common} defaultValue={(v as string) ?? ""} required={f.required}>
          <option value="">—</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      );
    case "relations": {
      const sel = ((row?.[f.name] as { id: string }[]) || []).map((x) => x.id);
      return <MultiPicker name={f.name} options={options} selected={sel} label={f.label} />;
    }
    case "image": {
      const m = images.find((i) => i.id === v) as Parameters<typeof mediaSrc>[0];
      const src = mediaSrc(m, "sm");
      return (
        <div className="flex items-center gap-4">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="size-20 rounded-md object-cover" />
          ) : <div className="flex size-20 items-center justify-center rounded-md bg-paper-2 text-xs text-stone">None</div>}
          <div className="grid gap-2">
            <input type="file" name={`${f.name}__file`} id={f.name} accept="image/*" className="text-sm" />
            {src && <label className="flex items-center gap-2 text-xs text-stone"><input type="checkbox" name={`${f.name}__remove`} /> Remove image</label>}
          </div>
        </div>
      );
    }
    case "file":
      return (
        <div className="grid gap-2">
          {row?.storageKey ? (
            row.kind === "IMAGE" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaSrc(row as Parameters<typeof mediaSrc>[0], "md") || ""} alt="" className="max-h-64 w-auto rounded-md" />
            ) : <a className="link-u text-sm" href={`/media/${row.storageKey}`} target="_blank" rel="noopener noreferrer">Current file</a>
          ) : null}
          <input type="file" id={f.name} name={f.name} className="text-sm" accept={row?.kind === "IMAGE" || f.label.includes("image") ? "image/*" : undefined} />
        </div>
      );
    case "pin":
      return <input {...common} inputMode="numeric" pattern="\d*" maxLength={8} autoComplete="off" placeholder={row?.pinHash ? "•••• (set — enter to change)" : "Not set"} className="input font-cond" />;
    case "readonly":
      return <p className="py-2 text-sm text-stone">{v instanceof Date ? fmtDate(v) : v ? String(v) : "—"}</p>;
    case "url":
      return <input {...common} type="url" defaultValue={(v as string) ?? ""} required={f.required} placeholder="https://" />;
    case "email":
      return <input {...common} type="email" defaultValue={(v as string) ?? ""} required={f.required} />;
    default:
      return <input {...common} type="text" defaultValue={(v as string) ?? ""} required={f.required} />;
  }
}
