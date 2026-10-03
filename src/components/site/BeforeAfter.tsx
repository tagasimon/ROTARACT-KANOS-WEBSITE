"use client";
import { useState } from "react";

/** Accessible before/after comparison: drag on touch, range input for keyboard. */
export function BeforeAfter({ before, after, beforeLabel = "Then", afterLabel = "Now", alt }: { before: string; after: string; beforeLabel?: string; afterLabel?: string; alt: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md bg-royal select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={`${alt} — ${afterLabel}`} className="absolute inset-0 size-full object-cover" loading="lazy" />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={`${alt} — ${beforeLabel}`} className="absolute inset-0 size-full object-cover" loading="lazy" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-paper shadow-[0_0_0_1px_rgba(0,0,0,.2)]" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-fg shadow-lg">⟷</div>
      </div>
      <span className="absolute left-3 top-3 rounded-sm bg-royal/80 px-2 py-1 text-xs font-bold uppercase tracking-widest text-paper">{beforeLabel}</span>
      <span className="absolute right-3 top-3 rounded-sm bg-cranberry px-2 py-1 text-xs font-bold uppercase tracking-widest text-paper">{afterLabel}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label={`Compare ${beforeLabel} and ${afterLabel}`}
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
