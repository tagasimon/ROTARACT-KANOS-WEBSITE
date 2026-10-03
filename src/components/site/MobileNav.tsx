"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export function MobileNav({ items, signedIn, isAdmin }: { items: { href: string; label: string }[]; signedIn: boolean; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div className="xl:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-11 items-center justify-center rounded-full hover:bg-royal/5"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
      >
        <Menu className="size-6" aria-hidden />
      </button>
      {open && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 flex flex-col bg-royal text-paper">
          <div className="container-x flex h-16 items-center justify-end">
            <button type="button" onClick={() => setOpen(false)} className="flex size-11 items-center justify-center rounded-full hover:bg-paper/10" aria-label="Close menu">
              <X className="size-6" aria-hidden />
            </button>
          </div>
          <nav aria-label="Mobile" className="container-x flex flex-1 flex-col gap-1 overflow-y-auto pb-10">
            {items.map((n, i) => (
              <Link key={n.href} href={n.href} className="flex items-baseline gap-4 border-b border-paper/10 py-3 font-display text-3xl font-bold">
                <span className="font-cond text-xs text-gold">{String(i + 1).padStart(2, "0")}</span>
                {n.label}
              </Link>
            ))}
            <div className="mt-8 grid gap-3">
              <Link href="/get-involved" className="btn-primary">Get involved</Link>
              <Link href="/search" className="btn-ghost-light">Search the archive</Link>
              <Link href={signedIn ? (isAdmin ? "/admin" : "/account") : "/login"} className="btn-ghost-light">
                {signedIn ? (isAdmin ? "Admin" : "My account") : "Member sign in"}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
