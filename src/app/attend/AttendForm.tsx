"use client";
import { useActionState, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { MEETING } from "@/lib/meeting/config";
import { ClubPicker } from "./ClubPicker";
import { signIn, type AttendState } from "./actions";

type Saved = { status: string; kind: string; club: string; clubOther: string; group: string; name: string; email: string; phone: string };
const KEY = "attend-v1";
const empty: Saved = { status: "", kind: "", club: "", clubOther: "", group: "", name: "", email: "", phone: "" };
/** matches NO_GROUP in lib/meeting/record */
const NO_GROUP = "none";

function Choice({ name, value, checked, onChange, children, sub, compact }: { name: string; value: string; checked: boolean; onChange: (v: string) => void; children: React.ReactNode; sub?: string; compact?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-center rounded-xl border-2 bg-white transition-colors", compact ? "min-h-14 gap-3 px-3 py-2.5" : "min-h-16 gap-4 px-4 py-3", checked ? "border-royal bg-royal/5" : "border-fg/15 hover:border-royal/50")}>
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="size-5 shrink-0 accent-[var(--color-royal)]" />
      <span>
        <span className="block text-base font-semibold">{children}</span>
        {sub && <span className="block text-sm text-stone">{sub}</span>}
      </span>
    </label>
  );
}

export function AttendForm({ meetingDay, groups }: { meetingDay: string; groups: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<AttendState, FormData>(signIn, { status: "idle" });
  const [f, setF] = useState<Saved>(empty);
  const [shown, setShown] = useState(true);
  const set = (k: keyof Saved) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  // Remember the person on this device
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved: Saved = { ...empty, ...JSON.parse(raw) };
        // a group the club has since removed shouldn't stay selected
        if (saved.group && saved.group !== NO_GROUP && !groups.some((g) => g.id === saved.group)) saved.group = "";
        setF(saved);
      }
    } catch {
      /* private mode or storage blocked: start empty */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (state.status === "ok") setShown(true);
  }, [state]);

  const setKind = (k: string) =>
    setF((x) => {
      // Switching between Rotarian and Rotaractor clears a club of the wrong type.
      const wasType = x.kind === "ROTARIAN" ? "ROTARY" : x.kind === "ROTARACTOR" ? "ROTARACT" : null;
      const nowType = k === "ROTARIAN" ? "ROTARY" : k === "ROTARACTOR" ? "ROTARACT" : null;
      return { ...x, kind: k, ...(wasType !== nowType ? { club: "", clubOther: "" } : {}) };
    });

  if (state.status === "ok" && shown) {
    return (
      <div role="status" className="rounded-2xl bg-royal p-7 text-paper shadow-xl sm:p-9">
        <span className="flex size-16 items-center justify-center rounded-full bg-gold text-fg"><Check className="size-9" strokeWidth={3} aria-hidden /></span>
        <h2 className="mt-6 text-3xl font-bold leading-tight sm:text-4xl">{state.duplicate ? "You're already signed in." : `Welcome, ${state.firstName}.`}</h2>
        {state.duplicate && <p className="mt-2 text-lg text-paper/85">We&rsquo;ve updated your details.</p>}
        <p className="mt-5 font-cond text-sm uppercase tracking-wider text-gold">{state.meetingLine}</p>
        <p className="mt-4 font-serif text-xl leading-relaxed text-paper/90">
          Thank you for joining us. Enjoy the meeting.
          {state.emailNote === "email" && " A thank-you note is on its way to your inbox."}
          {state.emailNote === "card" && " A thank-you note with your make-up card is on its way to your inbox."}
        </p>
        <button type="button" onClick={() => setShown(false)} className="mt-8 text-sm font-semibold text-paper/80 underline underline-offset-4 hover:text-paper">Sign in someone else on this phone</button>
      </div>
    );
  }

  const visiting = f.status === "visiting";
  const needsClub = visiting && (f.kind === "ROTARIAN" || f.kind === "ROTARACTOR");
  return (
    <form
      action={action}
      onSubmit={() => {
        try {
          localStorage.setItem(KEY, JSON.stringify(f));
        } catch {
          /* storage blocked */
        }
      }}
      className="grid gap-7"
      noValidate
    >
      {state.status === "error" && <p role="alert" className="rounded-xl border-2 border-cranberry/40 bg-cranberry/10 px-4 py-3 text-base font-semibold text-cranberry">{state.error}</p>}

      <fieldset className="grid gap-3">
        <legend className="mb-3 text-lg font-bold">Are you a member of {MEETING.CLUB_SHORT_NAME}?</legend>
        <Choice name="status" value="member" checked={f.status === "member"} onChange={set("status")}>Yes, I&rsquo;m a member</Choice>
        <Choice name="status" value="visiting" checked={visiting} onChange={set("status")}>No, I am visiting</Choice>
      </fieldset>

      {f.status === "member" && groups.length > 0 && (
        <fieldset className="grid gap-3">
          <legend className="mb-3 text-lg font-bold">Your buddy group</legend>
          <div className="grid grid-cols-2 gap-3">
            {groups.map((g) => (
              <Choice key={g.id} name="group" value={g.id} checked={f.group === g.id} onChange={set("group")} compact>{g.name}</Choice>
            ))}
          </div>
          <Choice name="group" value={NO_GROUP} checked={f.group === NO_GROUP} onChange={set("group")} compact>I&rsquo;m not in a buddy group yet</Choice>
        </fieldset>
      )}

      {visiting && (
        <fieldset className="grid gap-3">
          <legend className="mb-3 text-lg font-bold">Which best describes you?</legend>
          <Choice name="kind" value="ROTARIAN" checked={f.kind === "ROTARIAN"} onChange={setKind}>Visiting Rotarian</Choice>
          <Choice name="kind" value="ROTARACTOR" checked={f.kind === "ROTARACTOR"} onChange={setKind}>Visiting Rotaractor</Choice>
          <Choice name="kind" value="PROSPECT" checked={f.kind === "PROSPECT"} onChange={setKind} sub="New to Rotary or Rotaract">Prospect (guest)</Choice>
        </fieldset>
      )}

      {needsClub && (
        <div className="rounded-xl border-l-4 border-gold bg-white p-4 shadow-sm">
          <p className="mb-1 text-lg font-bold">Which club are you visiting from?</p>
          <p className="mb-3 text-sm text-stone">This helps the club see which clubs visit us.</p>
          <ClubPicker type={f.kind === "ROTARIAN" ? "ROTARY" : "ROTARACT"} club={f.club} setClub={set("club")} other={f.clubOther} setOther={set("clubOther")} />
        </div>
      )}
      {!needsClub && <input type="hidden" name="club" value="" />}

      <div className="grid gap-5">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-base font-semibold">Full name <span className="text-cranberry">*</span></label>
          <input id="name" name="name" autoComplete="name" required value={f.name} onChange={(e) => set("name")(e.target.value)} className="w-full rounded-lg border-2 border-fg/20 bg-white px-4 py-3.5 text-base focus:border-royal focus:outline-none" />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-base font-semibold">Email</label>
          <input id="email" name="email" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={(e) => set("email")(e.target.value)} className="w-full rounded-lg border-2 border-fg/20 bg-white px-4 py-3.5 text-base focus:border-royal focus:outline-none" />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-base font-semibold">Phone</label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="07XX XXX XXX" value={f.phone} onChange={(e) => set("phone")(e.target.value)} className="w-full rounded-lg border-2 border-fg/20 bg-white px-4 py-3.5 text-base focus:border-royal focus:outline-none" />
          <p className="mt-1.5 text-sm text-stone">Give an email or a phone number, or both.</p>
        </div>
      </div>

      {/* Honeypot: hidden from people, irresistible to bots */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div>
        <button disabled={pending} className="flex min-h-16 w-full items-center justify-center rounded-xl bg-cranberry px-6 text-lg font-bold text-white transition-colors hover:bg-royal disabled:opacity-60">
          {pending ? "Signing you in…" : "Sign in"}
        </button>
        <p className="mt-3 text-center text-sm text-stone">This phone will remember your details for next {meetingDay}.</p>
      </div>
    </form>
  );
}
