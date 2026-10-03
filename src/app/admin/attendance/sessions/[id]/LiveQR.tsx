"use client";
import { useEffect, useState } from "react";

type Live = { svg: string; url: string; count: number; recent: { name: string; at: string; method: string }[]; open: boolean; rotateIn: number };

export function LiveQR({ id, initial }: { id: string; initial: Live }) {
  const [live, setLive] = useState(initial);
  const [full, setFull] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const r = await fetch(`/api/attendance/${id}/live`, { cache: "no-store" });
        if (r.ok) setLive(await r.json());
      } catch {}
      t = setTimeout(tick, 4000);
    };
    t = setTimeout(tick, 4000);
    return () => clearTimeout(t);
  }, [id]);
  return (
    <div className={full ? "fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white p-6" : "grid gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]"}>
      <div className={full ? "w-[min(80vh,90vw)]" : ""}>
        <div className="rounded-lg bg-white p-4 ring-1 ring-line" aria-label="Attendance QR code" role="img" dangerouslySetInnerHTML={{ __html: live.svg }} />
        {!live.open && <p className="mt-3 rounded-md bg-cranberry/10 p-3 text-center text-sm font-semibold text-cranberry">Check-in is not open right now. Scans will be refused.</p>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone">
          <span className="truncate font-cond">{live.url.replace(/^https?:\/\//, "")}</span>
          <button type="button" onClick={() => setFull((f) => !f)} className="btn-ink btn-sm">{full ? "Exit full screen" : "Full screen"}</button>
        </div>
      </div>
      <div className={full ? "text-center" : ""}>
        <p className="label">Checked in</p>
        <p className="font-display text-7xl font-bold tabular-nums" aria-live="polite">{live.count}</p>
        {!full && (
          <ul className="mt-4 max-h-80 divide-y divide-line overflow-y-auto">
            {live.recent.map((r, i) => (
              <li key={i} className="flex justify-between py-1.5 text-sm"><span className="font-semibold">{r.name}</span><span className="text-stone">{new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kampala", hour: "numeric", minute: "2-digit" }).format(new Date(r.at))} · {r.method}</span></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
