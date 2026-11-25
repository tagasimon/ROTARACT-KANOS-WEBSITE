"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import { importMembers, type ImportState } from "./actions";

const LABEL: Record<string, string> = { create: "Add", link: "Add, link profile", update: "Update", unchanged: "No change", skip: "Skip" };
const TONE: Record<string, string> = { create: "bg-grass/15", link: "bg-grass/15", update: "bg-azure/10 text-royal", unchanged: "bg-fg/5 text-stone", skip: "bg-cranberry/10 text-cranberry" };

function Submit({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className={className}>{pending ? "Working…" : children}</button>;
}

export function ImportForm() {
  const [state, action] = useActionState<ImportState, FormData>(importMembers, { stage: "upload" });
  const c = state.counts || {};
  const toWrite = (c.create || 0) + (c.link || 0) + (c.update || 0);

  if (state.stage === "preview" && state.rows) {
    return (
      <div>
        {state.error && <p role="alert" className="mb-4 rounded-md border border-cranberry/30 bg-cranberry/10 px-4 py-3 text-sm font-semibold text-cranberry">{state.error}</p>}
        <div className="card mb-4 p-5">
          <p className="label">Check before importing{state.fileName && <>: {state.fileName}</>}</p>
          <p className="mt-2 text-lg">
            <strong>{(c.create || 0) + (c.link || 0)}</strong> new, <strong>{c.update || 0}</strong> to update, <strong>{c.unchanged || 0}</strong> already up to date, <strong className={c.skip ? "text-cranberry" : ""}>{c.skip || 0}</strong> skipped.
          </p>
          {!!state.ignoredColumns?.length && <p className="mt-1 text-sm text-stone">Columns not imported: {state.ignoredColumns.join(", ")}.</p>}
          <p className="mt-1 text-sm text-stone">Nothing is saved until you press Import. New profiles stay hidden from the website.</p>
        </div>
        <div className="card mb-4 max-h-[60vh] overflow-auto">
          <table className="table-x">
            <thead className="sticky top-0 bg-white"><tr><th>Row</th><th>Name</th><th>Member ID</th><th>What happens</th><th>Details</th></tr></thead>
            <tbody>
              {state.rows.map((r) => {
                const failed = state.failed?.find((f) => f.line === r.line);
                return (
                  <tr key={r.line}>
                    <td className="font-cond text-stone">{r.line}</td>
                    <td className="font-semibold">{r.name}</td>
                    <td className="font-cond">{r.memberNumber}</td>
                    <td><span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", TONE[r.action])}>{LABEL[r.action]}</span></td>
                    <td className="text-sm">
                      {r.details.join("; ")}
                      {r.warnings.map((w) => <span key={w} className="mt-1 block text-xs text-charcoal">⚠ {w}</span>)}
                      {failed && <span className="mt-1 block text-xs font-semibold text-cranberry">Not saved: {failed.error}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {toWrite > 0 && !state.failed && (
            <form action={action}>
              <input type="hidden" name="mode" value="apply" />
              <input type="hidden" name="fileName" value={state.fileName || ""} />
              <textarea name="csv" defaultValue={state.csv} hidden readOnly />
              <Submit className="btn-primary">Import {toWrite} {toWrite === 1 ? "member" : "members"}</Submit>
            </form>
          )}
          <a href="/admin/members/import" className="btn-ghost bg-white">{toWrite > 0 && !state.failed ? "Choose a different file" : "Import another file"}</a>
          {state.failed && <a href="/admin/members" className="btn-ink">Back to members</a>}
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="card max-w-xl p-6">
      {state.error && <p role="alert" className="mb-4 rounded-md border border-cranberry/30 bg-cranberry/10 px-4 py-3 text-sm font-semibold text-cranberry">{state.error}</p>}
      <input type="hidden" name="mode" value="preview" />
      <label htmlFor="file" className="label">CSV file</label>
      <input id="file" name="file" type="file" accept=".csv,text/csv" required className="input mt-1.5" />
      <Submit className="btn-primary mt-5">Check the file</Submit>
    </form>
  );
}
