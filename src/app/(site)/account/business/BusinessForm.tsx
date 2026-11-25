"use client";
import { useActionState } from "react";
import { BUSINESS_CATEGORIES } from "@/lib/businesses";
import type { FormState } from "../actions";
import { saveMyBusiness } from "./actions";

type B = Partial<Record<"name" | "category" | "tagline" | "description" | "services" | "location" | "ownerRole" | "website" | "contactUrl" | "linkedin" | "x" | "instagram" | "facebook", string | null>>;

export function BusinessForm({ id, b }: { id: string | null; b: B }) {
  const [s, action, pending] = useActionState<FormState, FormData>(saveMyBusiness, {});
  const T = (name: keyof B, label: string, opts: { type?: string; help?: string; required?: boolean; placeholder?: string } = {}) => (
    <div className="field">
      <label htmlFor={name} className="label">{label}{opts.required && <span className="text-cranberry"> *</span>}</label>
      <input id={name} name={name} type={opts.type || "text"} required={opts.required} placeholder={opts.placeholder} defaultValue={b[name] || ""} className="input" />
      {opts.help && <span className="text-xs text-stone">{opts.help}</span>}
    </div>
  );
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="id" value={id ?? ""} />
      {s.error && <p role="alert" className="rounded-sm bg-cranberry/10 px-3 py-2 text-sm font-semibold text-cranberry">{s.error}</p>}
      {s.ok && <p role="status" className="rounded-sm bg-grass/10 px-3 py-2 text-sm font-semibold text-fg">{s.ok}</p>}
      <div className="grid gap-5 sm:grid-cols-2">
        {T("name", "Business name", { required: true })}
        <div className="field">
          <label htmlFor="category" className="label">Category</label>
          <select id="category" name="category" defaultValue={b.category || ""} className="input">
            <option value="">Choose…</option>
            {BUSINESS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      {T("tagline", "One-line summary", { help: "What the business does, in one sentence." })}
      <div className="field"><label htmlFor="description" className="label">Description</label><textarea id="description" name="description" rows={5} defaultValue={b.description || ""} className="input" /></div>
      <div className="field"><label htmlFor="services" className="label">Products or services</label><textarea id="services" name="services" rows={4} defaultValue={b.services || ""} className="input" /><span className="text-xs text-stone">One per line. Visitors can search these.</span></div>
      <div className="grid gap-5 sm:grid-cols-2">
        {T("ownerRole", "Your role", { placeholder: "e.g. Founder" })}
        {T("location", "Location", { help: "An area or address you're happy to publish." })}
        {T("website", "Website", { type: "url", placeholder: "https://" })}
        {T("contactUrl", "Contact or enquiry link", { type: "url", placeholder: "https://wa.me/2567…", help: "A contact page, booking page or WhatsApp link." })}
        {T("linkedin", "LinkedIn", { type: "url" })}
        {T("x", "X", { type: "url" })}
        {T("instagram", "Instagram", { type: "url" })}
        {T("facebook", "Facebook", { type: "url" })}
      </div>
      <div className="field"><label htmlFor="logo" className="label">Logo</label><input id="logo" name="logo" type="file" accept="image/*" className="input" /></div>
      <p className="text-xs text-stone">Everything on this form is shown publicly once the listing is published.</p>
      <button className="btn-ink justify-self-start" disabled={pending}>{pending ? "Saving…" : id ? "Save listing" : "Submit for publishing"}</button>
    </form>
  );
}
