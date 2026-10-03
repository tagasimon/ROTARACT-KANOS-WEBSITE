"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type GalleryItem = { id: string; thumb: string; full: string; srcSet?: string; alt: string; caption?: string | null; meta?: string };

export function Gallery({ items }: { items: GalleryItem[] }) {
  const [i, setI] = useState<number | null>(null);
  const close = useCallback(() => setI(null), []);
  const step = useCallback((d: number) => setI((x) => (x === null ? x : (x + d + items.length) % items.length)), [items.length]);
  useEffect(() => {
    if (i === null) return;
    const k = (e: KeyboardEvent) => (e.key === "Escape" ? close() : e.key === "ArrowRight" ? step(1) : e.key === "ArrowLeft" ? step(-1) : null);
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [i, close, step]);
  const cur = i !== null ? items[i] : null;
  return (
    <>
      <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>li]:mb-3">
        {items.map((it, idx) => (
          <li key={it.id} className="break-inside-avoid">
            <button type="button" onClick={() => setI(idx)} className="group block w-full overflow-hidden rounded-sm text-left" aria-label={`Open photo: ${it.alt || it.caption || idx + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.thumb} srcSet={it.srcSet} sizes="(min-width:1024px) 25vw, 50vw" alt={it.alt} loading="lazy" className="w-full transition-transform duration-500 group-hover:scale-[1.03]" />
            </button>
            {it.caption && <p className="mt-1 text-xs text-stone">{it.caption}</p>}
          </li>
        ))}
      </ul>
      {cur && (
        <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-50 flex flex-col bg-royal/95 text-paper" onClick={close}>
          <div className="flex items-center justify-between p-4" onClick={(e) => e.stopPropagation()}>
            <span className="font-cond text-sm text-paper/60">{(i ?? 0) + 1} / {items.length}</span>
            <button type="button" onClick={close} className="flex size-11 items-center justify-center rounded-full hover:bg-paper/10" aria-label="Close"><X className="size-6" /></button>
          </div>
          <div className="relative flex flex-1 items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cur.full} alt={cur.alt} className="max-h-[78vh] max-w-full object-contain" />
            <button type="button" onClick={() => step(-1)} className="absolute left-2 flex size-12 items-center justify-center rounded-full bg-royal/60 hover:bg-royal" aria-label="Previous"><ChevronLeft /></button>
            <button type="button" onClick={() => step(1)} className="absolute right-2 flex size-12 items-center justify-center rounded-full bg-royal/60 hover:bg-royal" aria-label="Next"><ChevronRight /></button>
          </div>
          <div className="p-5 text-center" onClick={(e) => e.stopPropagation()}>
            {cur.caption && <p className="font-serif text-lg">{cur.caption}</p>}
            {cur.meta && <p className="mt-1 text-sm text-paper/55">{cur.meta}</p>}
          </div>
        </div>
      )}
    </>
  );
}
