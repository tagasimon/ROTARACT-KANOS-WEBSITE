"use client";
import { useActionState } from "react";
import { submitInquiry, type InquiryState } from "./actions";

const TYPES = [
  ["ATTEND", "Attend an event or meeting"],
  ["VOLUNTEER", "Volunteer on a project"],
  ["PARTNER", "Partner with the club"],
  ["SUPPORT_PROJECT", "Support a project"],
  ["JOIN", "Express interest in joining"],
  ["CONTACT", "Something else / share information"],
] as const;

export function InquiryForm({ defaultType, projects }: { defaultType?: string; projects: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(submitInquiry, {});
  if (state.ok)
    return (
      <div role="status" className="rounded-sm border-l-4 border-grass bg-grass/10 p-8">
        <p className="font-display text-3xl font-bold">Thank you. We've got it.</p>
        <p className="mt-2 font-serif text-lg text-stone">A member of the club will get back to you by email. If it's about attending, you're welcome at our next Friday fellowship.</p>
      </div>
    );
  const f = state.fields || {};
  return (
    <form action={action} className="grid gap-5" noValidate>
      {state.error && <p role="alert" className="rounded-sm bg-cranberry/10 px-4 py-3 text-sm font-semibold text-cranberry">{state.error}</p>}
      <fieldset className="grid gap-2">
        <legend className="label mb-2">I'd like to</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TYPES.map(([v, l]) => (
            <label key={v} className="flex cursor-pointer items-center gap-3 rounded-sm border border-fg/20 bg-white px-4 py-3 text-sm font-medium has-[:checked]:border-cranberry has-[:checked]:bg-cranberry/5">
              <input type="radio" name="type" value={v} defaultChecked={(f.type || defaultType || "ATTEND") === v} className="accent-[var(--color-cranberry)]" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="field"><label htmlFor="name" className="label">Your name *</label><input id="name" name="name" required autoComplete="name" defaultValue={f.name} className="input" /></div>
        <div className="field"><label htmlFor="email" className="label">Email *</label><input id="email" name="email" type="email" required autoComplete="email" defaultValue={f.email} className="input" /></div>
        <div className="field"><label htmlFor="phone" className="label">Phone (optional)</label><input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={f.phone} className="input" /></div>
        <div className="field"><label htmlFor="organization" className="label">Organisation (optional)</label><input id="organization" name="organization" autoComplete="organization" defaultValue={f.organization} className="input" /></div>
      </div>
      {projects.length > 0 && (
        <div className="field">
          <label htmlFor="projectId" className="label">Related project (optional)</label>
          <select id="projectId" name="projectId" defaultValue={f.projectId} className="input"><option value="">—</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
        </div>
      )}
      <div className="field"><label htmlFor="message" className="label">Message</label><textarea id="message" name="message" rows={5} defaultValue={f.message} className="input" /></div>
      <div className="hidden" aria-hidden><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <button className="btn-primary justify-self-start" disabled={pending}>{pending ? "Sending…" : "Send"}</button>
      <p className="text-xs text-stone">We use your details only to reply to this message.</p>
    </form>
  );
}
