"use client";
import { useMemo, useState } from "react";
import { X } from "lucide-react";

export function MultiPicker({ name, options, selected, label }: { name: string; options: { id: string; label: string }[]; selected: string[]; label: string }) {
  const [sel, setSel] = useState<string[]>(selected);
  const [q, setQ] = useState("");
  const map = useMemo(() => new Map(options.map((o) => [o.id, o.label])), [options]);
  const shown = useMemo(() => options.filter((o) => !sel.includes(o.id) && o.label.toLowerCase().includes(q.toLowerCase())).slice(0, 40), [options, sel, q]);
  return (
    <div className="rounded-md border border-fg/20 bg-white p-2">
      {sel.map((id) => <input key={id} type="hidden" name={name} value={id} />)}
      <div className="flex flex-wrap gap-1.5">
        {sel.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 rounded-full bg-royal px-2.5 py-1 text-xs text-paper">
            {map.get(id) || id}
            <button type="button" onClick={() => setSel((s) => s.filter((x) => x !== id))} aria-label={`Remove ${map.get(id)}`}><X className="size-3" /></button>
          </span>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Add ${label.toLowerCase()}…`} aria-label={`Search ${label}`} className="min-w-40 flex-1 px-1 py-1 text-sm outline-none" />
      </div>
      {q && (
        <ul className="mt-2 max-h-48 overflow-y-auto border-t border-line pt-1" role="listbox">
          {shown.map((o) => (
            <li key={o.id}>
              <button type="button" onClick={() => { setSel((s) => [...s, o.id]); setQ(""); }} className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-paper-2">{o.label}</button>
            </li>
          ))}
          {!shown.length && <li className="px-2 py-1.5 text-sm text-stone">No matches</li>}
        </ul>
      )}
    </div>
  );
}
