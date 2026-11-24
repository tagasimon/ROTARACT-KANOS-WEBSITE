"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronsLeftRight, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type Stage = { label: string; src: string; srcSet?: string; date?: string };

/**
 * The slider itself: `left` is revealed from the left edge up to the handle, `right` shows beyond it.
 * Drag anywhere on the photo (mouse or touch). Keyboard: focus the slider, then use the arrow keys,
 * Home and End. Vertical swipes still scroll the page.
 */
function Compare({ left, right, alt, fill }: { left: Stage; right: Stage; alt: string; fill?: boolean }) {
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const move = useCallback((clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || !r.width) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  return (
    <div
      ref={box}
      className={cn("group relative w-full cursor-ew-resize touch-pan-y select-none overflow-hidden bg-royal", fill ? "h-full" : "aspect-[16/10] rounded-sm")}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && move(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={right.src} srcSet={right.srcSet} sizes={fill ? "100vw" : "(min-width:1024px) 60vw, 100vw"} alt={`${alt}: ${right.label.toLowerCase()}`} draggable={false} loading="lazy" className={cn("pointer-events-none absolute inset-0 size-full", fill ? "object-contain" : "object-cover")} />
      <div className="pointer-events-none absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={left.src} srcSet={left.srcSet} sizes={fill ? "100vw" : "(min-width:1024px) 60vw, 100vw"} alt={`${alt}: ${left.label.toLowerCase()}`} draggable={false} loading="lazy" className={cn("absolute inset-0 size-full bg-royal", fill ? "object-contain" : "object-cover")} />
      </div>

      <span className="pointer-events-none absolute left-3 top-3 rounded-sm bg-royal px-2.5 py-1.5 text-xs font-bold uppercase tracking-widest text-paper shadow">
        {left.label}{left.date && <span className="ml-2 font-normal normal-case tracking-normal text-paper/75">{left.date}</span>}
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-sm bg-cranberry px-2.5 py-1.5 text-xs font-bold uppercase tracking-widest text-paper shadow">
        {right.label}{right.date && <span className="ml-2 font-normal normal-case tracking-normal text-paper/80">{right.date}</span>}
      </span>

      {/* Keyboard and screen-reader control. It sits over the handle so the focus ring shows there. */}
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(pos)}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label={`Compare ${left.label} and ${right.label}. Use the arrow keys to move the divider.`}
        aria-valuetext={`${Math.round(pos)}% ${left.label}, ${100 - Math.round(pos)}% ${right.label}`}
        className="peer pointer-events-none absolute inset-x-0 top-1/2 h-11 w-full -translate-y-1/2 opacity-0"
      />
      <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-paper shadow-[0_0_0_1px_rgba(0,0,0,.25)] peer-focus-visible:[&>span]:ring-4 peer-focus-visible:[&>span]:ring-gold" style={{ left: `${pos}%` }} aria-hidden>
        <span className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-royal shadow-lg transition-transform group-active:scale-110">
          <ChevronsLeftRight className="size-5" />
        </span>
      </div>
    </div>
  );
}

/**
 * Before/after comparison with two or three stages.
 * With three (Before, During, After) the visitor picks which two to compare.
 */
export function BeforeAfter({ stages, alt, title, caption, sourceUrl }: { stages: Stage[]; alt: string; title?: string | null; caption?: string | null; sourceUrl?: string | null }) {
  const id = useId();
  const last = stages.length - 1;
  const pairs = stages.length >= 3 ? ([[0, last], [0, 1], [1, last]] as const) : ([[0, last]] as const);
  const [pair, setPair] = useState(0);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const [l, r] = pairs[Math.min(pair, pairs.length - 1)];

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  if (stages.length < 2) return null;
  const picker = pairs.length > 1 && (
    <div role="group" aria-label="Choose which stages to compare" className="flex flex-wrap gap-2">
      {pairs.map(([a, b], i) => (
        <button key={i} type="button" aria-pressed={i === pair} onClick={() => setPair(i)} className={cn("min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors", i === pair ? "border-royal bg-royal text-paper" : "border-royal/30 text-royal hover:border-royal")}>
          {stages[a].label} → {stages[b].label}
        </button>
      ))}
    </div>
  );

  return (
    <figure aria-labelledby={title ? `${id}-t` : undefined} className="print-avoid">
      {(title || picker) && (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          {title ? <h3 id={`${id}-t`} className="text-2xl font-bold sm:text-3xl">{title}</h3> : <span />}
          {picker}
        </div>
      )}
      <div className="relative">
        <Compare key={`${l}-${r}`} left={stages[l]} right={stages[r]} alt={alt} />
        <button type="button" onClick={() => setOpen(true)} className="absolute bottom-3 right-3 flex size-11 items-center justify-center rounded-full bg-fg/70 text-paper hover:bg-fg print:hidden" aria-label="View full screen">
          <Maximize2 className="size-5" aria-hidden />
        </button>
      </div>
      <figcaption className="mt-3 text-sm text-stone">
        <span className="font-semibold text-fg">Drag to compare.</span> {caption}
        {sourceUrl && <> <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="link-u">Source</a></>}
      </figcaption>

      <dialog ref={dialog} onClose={() => setOpen(false)} aria-label={`${title || alt}: full-screen comparison`} className="m-0 h-dvh max-h-none w-screen max-w-none bg-fg p-0 text-paper backdrop:bg-fg">
        {open && (
          <div className="flex h-dvh flex-col">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <p className="truncate font-display font-bold">{title || alt}</p>
              <button type="button" onClick={() => setOpen(false)} className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-paper/15" aria-label="Close full screen"><X aria-hidden /></button>
            </div>
            <div className="min-h-0 flex-1">
              <Compare key={`f-${l}-${r}`} left={stages[l]} right={stages[r]} alt={alt} fill />
            </div>
            {caption && <p className="px-4 py-3 text-sm text-paper/75">{caption}</p>}
          </div>
        )}
      </dialog>
    </figure>
  );
}
