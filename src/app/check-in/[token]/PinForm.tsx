"use client";
import { useActionState } from "react";
import Link from "next/link";
import { pinCheckIn, type PinState } from "./actions";
import { Done } from "./Done";

export function PinForm({ token, ts, grant }: { token: string; ts: number; grant: string }) {
  const [state, action, pending] = useActionState<PinState, FormData>(pinCheckIn, {});
  if (state.ok) return <Done name={state.name!} at={state.at!} already={state.already}><Link href="/activate" className="btn-ghost-light mt-6 w-full">Make next time automatic: activate your account</Link></Done>;
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="ts" value={ts} />
      <input type="hidden" name="grant" value={grant} />
      {state.error && <p role="alert" className="rounded-md bg-cranberry px-4 py-3 text-sm font-semibold">{state.error}</p>}
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-3">
        <label className="grid gap-1 text-left text-xs font-semibold uppercase tracking-wider text-paper/60">Member ID
          <input name="memberNumber" required autoCapitalize="characters" autoComplete="username" className="min-h-14 w-full min-w-0 rounded-md border border-paper/20 bg-paper/10 px-3 font-cond text-lg uppercase text-paper focus:border-gold focus:outline-none" />
        </label>
        <label className="grid gap-1 text-left text-xs font-semibold uppercase tracking-wider text-paper/60">PIN
          <input name="pin" required inputMode="numeric" pattern="\d*" maxLength={8} autoComplete="current-password" className="min-h-14 w-full min-w-0 rounded-md border border-paper/20 bg-paper/10 px-3 font-cond text-lg text-paper focus:border-gold focus:outline-none" />
        </label>
      </div>
      <button className="btn-primary min-h-14 text-base" disabled={pending}>{pending ? "Checking in…" : "Check me in"}</button>
    </form>
  );
}
