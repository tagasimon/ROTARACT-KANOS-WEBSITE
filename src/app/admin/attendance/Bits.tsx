"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Destructive actions ask once more, inline. Never a browser confirm() dialog. */
export function TwoStep({ label, question, yes = "Yes", className }: { label: string; question: string; yes?: string; className?: string }) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  if (!armed)
    return (
      <button type="button" onClick={() => setArmed(true)} className={cn("text-sm font-semibold text-cranberry hover:underline", className)}>
        {label}
      </button>
    );
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-sm" role="group" aria-label={question}>
      <span className="font-semibold">{question}</span>
      <button type="submit" disabled={pending} className="rounded-full bg-cranberry px-3 py-1 font-semibold text-white hover:bg-red-800 disabled:opacity-50">{pending ? "…" : yes}</button>
      <button type="button" onClick={() => setArmed(false)} className="rounded-full border border-fg/20 px-3 py-1 font-semibold hover:bg-paper-2">Cancel</button>
    </span>
  );
}

export function Pending({ children, pendingText = "Working…", className }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className={className}>{pending ? pendingText : children}</button>;
}

export function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost btn-sm bg-white"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setDone(true);
          setTimeout(() => setDone(false), 2500);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {done ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      <span aria-live="polite">{done ? "Copied" : "Copy link"}</span>
    </button>
  );
}

/** Keeps today's meeting page up to date while people are signing in. */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return <p className="text-xs text-stone">Updates every {seconds} seconds while the meeting is on.</p>;
}
