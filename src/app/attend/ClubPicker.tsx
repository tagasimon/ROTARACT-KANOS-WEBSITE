"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CLUBS, type Club } from "@/lib/meeting/clubs";
import { cn } from "@/lib/utils";

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
const OTHER = "__other";

/**
 * Searchable club list for visiting Rotarians and Rotaractors.
 * Rotary clubs for Rotarians, Rotaract clubs for Rotaractors, grouped by district.
 * Keyboard: ↓/↑ to move, Enter to choose, Esc to close.
 */
export function ClubPicker({ type, club, setClub, other, setOther }: { type: "ROTARY" | "ROTARACT"; club: string; setClub: (v: string) => void; other: string; setOther: (v: string) => void }) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(club && club !== OTHER ? club : "");
  const [active, setActive] = useState(0);

  useEffect(() => setQuery(club && club !== OTHER ? club : ""), [club]);
  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pool = useMemo(() => CLUBS.filter((c) => c.type === type), [type]);
  const matches = useMemo(() => {
    const words = fold(query).split(/\s+/).filter((w) => w && !["rotary", "rotaract", "club", "of", "the"].includes(w));
    // Showing the chosen club's own name shouldn't filter the list down to one.
    if (!words.length || pool.some((c) => c.name === query)) return pool;
    return pool.filter((c) => words.every((w) => fold(c.name).includes(w)));
  }, [pool, query]);
  const options: (Club | typeof OTHER)[] = [...matches, OTHER];
  const groups = useMemo(() => {
    const g = new Map<string, { club: Club; index: number }[]>();
    matches.forEach((c, index) => g.set(c.district, [...(g.get(c.district) || []), { club: c, index }]));
    return [...g.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [matches]);

  useEffect(() => setActive(0), [query, type]);
  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (o: Club | typeof OTHER) => {
    if (o === OTHER) {
      setClub(OTHER);
      setQuery("");
    } else {
      setClub(o.name);
      setQuery(o.name);
    }
    setOpen(false);
  };
  const optId = (i: number) => `${id}-opt-${i}`;

  return (
    <div ref={box} className="relative">
      <input type="hidden" name="club" value={club} />
      <div className="relative">
        <input
          id={`${id}-input`}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open ? optId(active) : undefined}
          aria-labelledby={`${id}-label`}
          autoComplete="off"
          placeholder="Search for your club"
          value={club === OTHER ? "My club isn't listed" : query}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (club) setClub("");
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (!open) setOpen(true);
              else setActive((a) => Math.min(a + 1, options.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              if (open) {
                e.preventDefault();
                choose(options[active]);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="w-full rounded-lg border-2 border-fg/20 bg-white py-3.5 pl-4 pr-11 text-base focus:border-royal focus:outline-none"
        />
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-stone" aria-hidden />
      </div>
      <span id={`${id}-label`} className="sr-only">Your club</span>
      {open && (
        <ul ref={listRef} id={`${id}-list`} role="listbox" aria-label="Clubs" className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-fg/15 bg-white py-1 shadow-xl">
          {groups.map(([district, items]) => (
            <li key={district} role="presentation">
              <p className="sticky top-0 bg-paper-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-stone" aria-hidden>District {district}</p>
              <ul role="group" aria-label={`District ${district}`}>
                {items.map(({ club: c, index }) => (
                  <li
                    key={c.name}
                    id={optId(index)}
                    data-i={index}
                    role="option"
                    aria-selected={club === c.name}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(c)}
                    onMouseEnter={() => setActive(index)}
                    className={cn("cursor-pointer px-4 py-3 text-[0.95rem]", index === active && "bg-royal text-paper", club === c.name && index !== active && "font-semibold text-royal")}
                  >
                    {c.name}
                  </li>
                ))}
              </ul>
            </li>
          ))}
          {!matches.length && <li role="presentation" className="px-4 py-3 text-sm text-stone">No club matches &ldquo;{query}&rdquo;.</li>}
          <li
            id={optId(matches.length)}
            data-i={matches.length}
            role="option"
            aria-selected={club === OTHER}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(OTHER)}
            onMouseEnter={() => setActive(matches.length)}
            className={cn("cursor-pointer border-t border-line px-4 py-3 font-semibold", active === matches.length ? "bg-royal text-paper" : "text-cranberry")}
          >
            My club isn&rsquo;t listed →
          </li>
        </ul>
      )}
      {club === OTHER && (
        <div className="mt-3">
          <label htmlFor={`${id}-other`} className="mb-1.5 block text-sm font-semibold">Your club&rsquo;s name</label>
          <input id={`${id}-other`} name="clubOther" value={other} onChange={(e) => setOther(e.target.value)} autoComplete="off" placeholder={type === "ROTARY" ? "e.g. Rotary Club of Entebbe" : "e.g. Rotaract Club of Gulu"} className="w-full rounded-lg border-2 border-fg/20 bg-white px-4 py-3.5 text-base focus:border-royal focus:outline-none" />
        </div>
      )}
    </div>
  );
}
