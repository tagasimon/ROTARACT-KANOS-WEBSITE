"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import { importSignIns, type SignInImportState } from "./actions";

const TYPE = { WEEKLY: "Weekly", GATHERING: "Gathering", SPECIAL: "Special" } as const;
const short = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

function Submit({ children, className, name, value }: { children: React.ReactNode; className?: string; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return <button name={name} value={value} disabled={pending} className={className}>{pending ? "Working…" : children}</button>;
}

function Alert({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="mb-4 rounded-md border border-cranberry/30 bg-cranberry/10 px-4 py-3 text-sm font-semibold text-cranberry">{children}</p>;
}

export function ImportSignIns() {
  const [state, action] = useActionState<SignInImportState, FormData>(importSignIns, { stage: "upload" });

  if (state.stage !== "preview" || !state.preview) {
    return (
      <form action={action} className="card max-w-xl p-5">
        {state.error && <Alert>{state.error}</Alert>}
        <input type="hidden" name="mode" value="upload" />
        <label htmlFor="sheet" className="label">Sign-in sheet (.xlsx or .csv)</label>
        <input id="sheet" name="file" type="file" required accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-royal file:px-3 file:py-2 file:font-semibold file:text-paper" />
        <Submit className="btn-primary btn-sm mt-4">Check the file</Submit>
      </form>
    );
  }

  const p = state.preview;
  const c = p.counts;
  const nothing = !c.signIns && !c.newPeople && !c.newGroups && !c.updates;
  const lookalikes = p.people.filter((x) => x.lookalikes.length).length;

  return (
    <form action={action}>
      {state.error && <Alert>{state.error}</Alert>}
      <textarea name="rows" defaultValue={state.rows} hidden readOnly />
      <input type="hidden" name="fileName" value={state.fileName || ""} />
      {(state.same || []).map((s) => <input key={s} type="hidden" name="same" value={s} />)}

      <div className="card mb-4 p-5">
        <p className="label">Check before importing{state.fileName && <>: {state.fileName}</>}</p>
        {nothing ? (
          <p className="mt-2 text-lg">Everything in this file is already in the system. There&rsquo;s nothing new to import.</p>
        ) : (
          <p className="mt-2 text-lg">
            <strong>{c.signIns}</strong> sign-ins ({c.members} by members, {c.visitors} by visitors) at <strong>{c.newMeetings + c.existingMeetings}</strong> meetings
            {c.existingMeetings > 0 && <> ({c.existingMeetings} already in the system)</>}. <strong>{c.newPeople}</strong> members to add
            {c.existingPeople > 0 && <>, <strong>{c.existingPeople}</strong> matched to the register{c.updates > 0 && <> ({c.updates} get missing details filled in)</>}</>}
            {c.newGroups > 0 && <>, <strong>{c.newGroups}</strong> new buddy groups</>}.
          </p>
        )}
        <p className="mt-2 text-sm text-stone">
          {p.fileRows} rows read.
          {c.duplicates > 0 && <> {c.duplicates} repeat sign-ins by the same person on the same day are counted once.</>}
          {c.already > 0 && <> {c.already} sign-ins are already in the system and are left alone.</>}
          {c.skipped > 0 && <span className="text-cranberry"> {c.skipped} rows couldn&rsquo;t be read (listed below).</span>}
        </p>
        <p className="mt-1 text-sm text-stone">
          Columns used: {p.columns.map((col) => `${col.heading} (${col.column}) → ${col.as}`).join(", ")}.
          {p.ignored.length > 0 && <> Not imported: {p.ignored.join(", ")}.</>}
        </p>
        <p className="mt-1 text-sm text-stone">Nothing is saved until you press Import. Imported sign-ins never get thank-you emails, and new members&rsquo; profiles stay hidden from the website.</p>
      </div>

      {p.groups.length > 0 && (
        <section className="card mb-4 p-5">
          <h2 className="label mb-2">Buddy groups</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {p.groups.map((g) => (
              <li key={g.name} className={cn("rounded-full border px-3 py-1", g.isNew ? "border-grass/40 bg-grass/10" : "border-fg/15 bg-white")}>
                <strong>{g.name}</strong> · {g.people} {g.people === 1 ? "member" : "members"}{g.isNew && <span className="text-stone"> · new</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card mb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 p-5 pb-0">
          <h2 className="label">Members ({p.people.length})</h2>
          {lookalikes > 0 && <p className="text-sm text-stone">Tick &ldquo;Same person&rdquo; where two records are one member, then press Update preview.</p>}
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <table className="table-x">
            <thead className="sticky top-0 bg-white"><tr><th>Member</th><th>What happens</th><th>Buddy group</th><th>Sign-ins</th><th>Email</th><th>Notes</th></tr></thead>
            <tbody>
              {p.people.map((x) => (
                <tr key={x.key}>
                  <td><span className="font-semibold">{x.name}</span><span className="block font-cond text-xs text-stone">{x.memberNumber}</span></td>
                  <td className="whitespace-nowrap text-sm">
                    {x.action === "existing" ? (
                      <>
                        <span className="rounded-full bg-azure/10 px-2 py-0.5 text-xs font-semibold text-royal">In the register</span>
                        {x.changes.length > 0 && <span className="mt-1 block text-xs text-stone">Adds: {x.changes.join(", ")}</span>}
                      </>
                    ) : (
                      <span className="rounded-full bg-grass/15 px-2 py-0.5 text-xs font-semibold">Add · {x.status === "ACTIVE" ? "Active" : "Inactive"}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">{x.group || <span className="text-stone">—</span>}</td>
                  <td className="whitespace-nowrap text-sm"><span className="font-semibold tabular-nums">{x.signIns}</span><span className="block text-xs text-stone">{short(x.first)}{x.first !== x.last && <> – {short(x.last)}</>}</span></td>
                  <td className="max-w-56 break-all text-sm">{x.emails[0] || <span className="text-stone">—</span>}</td>
                  <td className="min-w-64 text-xs">
                    {x.merged > 1 && <span className="block font-semibold text-royal">{x.merged} records merged, as you ticked.</span>}
                    {x.notes.map((n) => <span key={n} className="block text-charcoal">{n}</span>)}
                    {x.lookalikes.map((o) => {
                      const mine = p.people.find((y) => y.key === o.key);
                      // the box sits on the record with fewer sign-ins, so each pair shows one box
                      const here = !mine || x.signIns < mine.signIns || (x.signIns === mine.signIns && x.key > o.key);
                      return here ? (
                        <label key={o.key} className="mt-1 flex items-start gap-2 font-semibold">
                          <input type="checkbox" name="same" value={`${o.key}|${x.key}`} className="mt-0.5" />
                          <span>Same person as {o.name} ({o.memberNumber})</span>
                        </label>
                      ) : (
                        <span key={o.key} className="block text-stone">Looks like {o.name} ({o.memberNumber}).</span>
                      );
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card mb-4">
        <h2 className="label p-5 pb-0">Meetings ({p.meetings.length})</h2>
        <div className="max-h-[50vh] overflow-auto">
          <table className="table-x">
            <thead className="sticky top-0 bg-white"><tr><th>Date</th><th>Meeting</th><th>Members</th><th>Visitors</th><th>Status</th></tr></thead>
            <tbody>
              {p.meetings.map((m) => (
                <tr key={m.day}>
                  <td className="whitespace-nowrap">{m.label}</td>
                  <td><span className="font-semibold">{m.title}</span><span className="block text-xs text-stone">{TYPE[m.type]}</span></td>
                  <td className="tabular-nums">{m.members}</td>
                  <td className="tabular-nums">{m.visitors}</td>
                  <td className="text-sm">{m.existing ? <>Already exists{m.already > 0 && <span className="block text-xs text-stone">{m.already} sign-ins already there</span>}</> : "New"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {(p.skipped.length > 0 || p.notes.length > 0) && (
        <details className="card mb-4 p-5">
          <summary className="cursor-pointer font-semibold">Rows skipped or changed ({p.skipped.length + p.notes.length})</summary>
          <ul className="mt-3 space-y-1 text-sm">
            {p.skipped.map((s) => <li key={`s${s.line}`}><span className="font-cond text-stone">Row {s.line}</span> {s.name}: <span className="text-cranberry">{s.reason}</span></li>)}
            {p.notes.map((n, i) => <li key={`n${n.line}-${i}`}><span className="font-cond text-stone">Row {n.line}</span> {n.name}: {n.note}</li>)}
          </ul>
        </details>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {!nothing && <Submit name="mode" value="apply" className="btn-primary">{c.signIns ? `Import ${c.signIns} sign-ins` : "Import"}</Submit>}
        {lookalikes > 0 && <Submit name="mode" value="preview" className="btn-ghost bg-white">Update preview</Submit>}
        {/* a full page load clears the preview */}
        <a href="/admin/attendance/import" className="text-sm font-semibold text-stone hover:text-fg">Start again</a>
      </div>
    </form>
  );
}
