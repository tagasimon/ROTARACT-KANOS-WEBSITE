"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminNav({ groups, children }: { groups: { title: string; items: { href: string; label: string; badge?: number }[] }[]; children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const all = groups.flatMap((g) => g.items.map((i) => i.href));
  const best = all.filter((h) => (h === "/admin" ? path === h : path === h || path.startsWith(h + "/"))).sort((a, b) => b.length - a.length)[0];
  const active = (h: string) => h === best;
  return (
    <>
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between bg-royal px-4 text-paper lg:hidden">
        <Link href="/admin" className="font-display font-bold">KN Admin</Link>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Toggle admin menu" className="flex size-10 items-center justify-center">{open ? <X /> : <Menu />}</button>
      </div>
      <aside className={cn("fixed inset-0 top-14 z-30 print:hidden flex flex-col overflow-y-auto bg-royal text-paper lg:sticky lg:top-0 lg:h-dvh", open ? "flex" : "hidden lg:flex")}>
        <Link href="/admin" className="hidden px-5 py-5 font-display text-lg font-bold lg:block">Kampala North <span className="text-gold">CMS</span></Link>
        <nav aria-label="Admin" className="flex-1 px-3 pb-6">
          {groups.map((g) => (
            <div key={g.title} className="mt-4">
              <p className="px-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-paper/40">{g.title}</p>
              <ul>
                {g.items.map((it) => (
                  <li key={it.href}>
                    <Link href={it.href} aria-current={active(it.href) ? "page" : undefined} className={cn("flex items-center justify-between rounded-md px-2 py-1.5 text-sm", active(it.href) ? "bg-paper/10 font-semibold text-paper" : "text-paper/70 hover:bg-paper/5 hover:text-paper")}>
                      {it.label}
                      {!!it.badge && <span className="rounded-full bg-cranberry px-1.5 text-[0.65rem] font-bold">{it.badge}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        {children}
      </aside>
    </>
  );
}
