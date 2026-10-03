"use client";
import { useEffect, useState } from "react";

export function Countdown({ to, dark }: { to: string; dark?: boolean }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return <div className="h-20" aria-hidden />;
  const diff = Math.max(0, target - now);
  const parts = [
    ["Days", Math.floor(diff / 86400000)],
    ["Hours", Math.floor((diff / 3600000) % 24)],
    ["Min", Math.floor((diff / 60000) % 60)],
    ["Sec", Math.floor((diff / 1000) % 60)],
  ] as const;
  return (
    <div className="flex gap-3 sm:gap-5" role="timer" aria-live="off" aria-label={`${parts[0][1]} days ${parts[1][1]} hours to go`}>
      {parts.map(([l, v]) => (
        <div key={l} className="min-w-14 text-center">
          <div className={`font-display text-4xl font-bold tabular-nums sm:text-6xl ${dark ? "text-paper" : "text-fg"}`}>{String(v).padStart(2, "0")}</div>
          <div className={`mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] ${dark ? "text-paper/50" : "text-stone"}`}>{l}</div>
        </div>
      ))}
    </div>
  );
}
