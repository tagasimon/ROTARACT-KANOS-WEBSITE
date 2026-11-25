"use client";
import { useActionState } from "react";
import { updateProfile, changePassword, type FormState } from "./actions";

function Msg({ s }: { s: FormState }) {
  if (s.error) return <p role="alert" className="rounded-sm bg-cranberry/10 px-3 py-2 text-sm font-semibold text-cranberry">{s.error}</p>;
  if (s.ok) return <p role="status" className="rounded-sm bg-grass/10 px-3 py-2 text-sm font-semibold text-fg">{s.ok}</p>;
  return null;
}

type P = { professionalTitle: string | null; organization: string | null; bio: string | null; interests: string | null; expertise: string | null; linkedin: string | null; x: string | null; instagram: string | null; website: string | null; isPublic: boolean; skills: { id: string }[] };

export function ProfileForm({ p, skills }: { p: P; skills: { id: string; name: string }[] }) {
  const [s, action, pending] = useActionState<FormState, FormData>(updateProfile, {});
  const mine = new Set(p.skills.map((x) => x.id));
  const T = (name: keyof P, label: string, type = "text") => (
    <div className="field"><label htmlFor={name} className="label">{label}</label><input id={name} name={name} type={type} defaultValue={(p[name] as string) || ""} className="input" /></div>
  );
  return (
    <form action={action} className="grid gap-5">
      <Msg s={s} />
      <div className="grid gap-5 sm:grid-cols-2">{T("professionalTitle", "Professional title")}{T("organization", "Company / organisation")}</div>
      <div className="field"><label htmlFor="bio" className="label">Biography</label><textarea id="bio" name="bio" rows={6} defaultValue={p.bio || ""} className="input" /><span className="text-xs text-stone">Markdown supported.</span></div>
      <div className="grid gap-5 sm:grid-cols-2">{T("expertise", "Areas of expertise")}{T("interests", "Interests")}</div>
      <fieldset>
        <legend className="label mb-2">Skills</legend>
        <div className="flex flex-wrap gap-2">
          {skills.map((sk) => (
            <label key={sk.id} className="cursor-pointer rounded-full border border-fg/20 px-3 py-1.5 text-sm has-[:checked]:border-cranberry has-[:checked]:bg-cranberry has-[:checked]:text-paper">
              <input type="checkbox" name="skills" value={sk.id} defaultChecked={mine.has(sk.id)} className="sr-only" />
              {sk.name}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">{T("linkedin", "LinkedIn URL", "url")}{T("x", "X URL", "url")}{T("instagram", "Instagram URL", "url")}{T("website", "Website", "url")}</div>
      <div className="field"><label htmlFor="photo" className="label">Photo</label><input id="photo" name="photo" type="file" accept="image/*" className="input" /></div>
      <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" name="isPublic" defaultChecked={p.isPublic} className="size-5 accent-[var(--color-cranberry)]" /> Show my profile publicly on the website</label>
      <p className="text-xs text-stone">Never public: your phone, email, member ID, PIN, attendance and internal notes.</p>
      <button className="btn-ink justify-self-start" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
    </form>
  );
}

export function PasswordForm() {
  const [s, action, pending] = useActionState<FormState, FormData>(changePassword, {});
  return (
    <form action={action} className="grid gap-3">
      <Msg s={s} />
      <input name="current" type="password" autoComplete="current-password" placeholder="Current password" aria-label="Current password" className="input" required />
      <input name="next" type="password" autoComplete="new-password" placeholder="New password (8+ characters)" aria-label="New password" className="input" required minLength={8} />
      <button className="btn-ghost btn-sm justify-self-start" disabled={pending}>Change password</button>
    </form>
  );
}
