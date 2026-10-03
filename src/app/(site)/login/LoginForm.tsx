"use client";
import { useActionState } from "react";
import { login, activate, type AuthState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});
  return (
    <form action={action} className="grid gap-4">
      {state.error && <p role="alert" className="rounded-sm bg-cranberry/10 px-4 py-3 text-sm font-semibold text-cranberry">{state.error}</p>}
      <input type="hidden" name="next" value={next || ""} />
      <div className="field"><label htmlFor="email" className="label">Email</label><input id="email" name="email" type="email" autoComplete="email" required className="input min-h-12" /></div>
      <div className="field"><label htmlFor="password" className="label">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required className="input min-h-12" /></div>
      <button className="btn-ink min-h-12" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

export function ActivateForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(activate, {});
  return (
    <form action={action} className="grid gap-4">
      {state.error && <p role="alert" className="rounded-sm bg-cranberry/10 px-4 py-3 text-sm font-semibold text-cranberry">{state.error}</p>}
      <input type="hidden" name="next" value={next || ""} />
      <div className="grid grid-cols-2 gap-3">
        <div className="field"><label htmlFor="memberNumber" className="label">Member ID</label><input id="memberNumber" name="memberNumber" autoCapitalize="characters" required className="input min-h-12 font-cond uppercase" placeholder="KN-0001" /></div>
        <div className="field"><label htmlFor="pin" className="label">PIN</label><input id="pin" name="pin" inputMode="numeric" pattern="\d*" maxLength={8} required className="input min-h-12 font-cond" /></div>
      </div>
      <div className="field"><label htmlFor="aemail" className="label">Your email</label><input id="aemail" name="email" type="email" autoComplete="email" required className="input min-h-12" /></div>
      <div className="field"><label htmlFor="apassword" className="label">Choose a password</label><input id="apassword" name="password" type="password" autoComplete="new-password" minLength={8} required className="input min-h-12" /></div>
      <button className="btn-primary min-h-12" disabled={pending}>{pending ? "Creating account…" : "Create my account"}</button>
    </form>
  );
}
