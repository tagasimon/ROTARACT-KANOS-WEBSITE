"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * The site header's outer frame. On the homepage the header floats over the hero photo
 * (transparent, white text) and turns solid white once the visitor scrolls; everywhere else
 * it is the usual sticky white bar. Children style themselves for the floating state with
 * `group-data-[overlay]/hdr:` variants.
 */
export function HeaderFrame({ children }: { children: React.ReactNode }) {
  const home = usePathname() === "/";
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!home) return;
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [home]);
  const overlay = home && !scrolled;
  return (
    <header
      data-overlay={overlay ? "" : undefined}
      className={cn(
        "group/hdr top-0 z-40 border-b border-t-4 transition-[background-color,border-color] duration-300",
        home ? "fixed inset-x-0" : "sticky",
        overlay ? "border-b-transparent border-t-transparent bg-transparent" : "border-b-line border-t-gold bg-white/95 backdrop-blur",
      )}
    >
      {children}
    </header>
  );
}
