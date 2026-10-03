import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/rbac";
import { MobileNav } from "./MobileNav";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { mediaSrc } from "@/lib/media";

export const NAV = [
  { href: "/about", label: "Our Story" },
  { href: "/projects", label: "Projects" },
  { href: "/people", label: "People" },
  { href: "/leadership", label: "Leadership" },
  { href: "/events", label: "What's On" },
  { href: "/district", label: "District" },
  { href: "/stories", label: "Stories" },
  { href: "/years", label: "Archive" },
];

/**
 * Typographic club lockup in brand type and colour (Rotaract in Cranberry, club name in Royal Blue).
 * When an admin uploads the club's official Rotaract signature in Settings, that image is used instead.
 */
export function Wordmark({ name, light, logoSrc }: { name: string; light?: boolean; logoSrc?: string | null }) {
  if (logoSrc)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoSrc} alt={`Rotaract Club of ${name}`} className={`h-10 w-auto ${light ? "rounded bg-white p-1.5" : ""}`} />;
  return (
    <span className="flex flex-col leading-none">
      <span className={`font-display text-[1.6rem] font-bold tracking-tight ${light ? "text-white" : "text-cranberry"}`}>Rotaract</span>
      <span className={`font-cond mt-0.5 text-[0.72rem] font-bold uppercase tracking-[0.08em] ${light ? "text-gold" : "text-royal"}`}>Club of {name}</span>
    </span>
  );
}

export async function SiteHeader() {
  const [s, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const isAdmin = user && ADMIN_ROLES.includes(user.role);
  const logo = s.logoImageId ? await db.media.findUnique({ where: { id: s.logoImageId } }) : null;
  return (
    <header className="sticky top-0 z-40 border-t-4 border-t-gold border-b border-line bg-white/95 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-royal focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <div className="container-x flex h-16 items-center justify-between gap-6">
        <Link href="/" aria-label={`${s.clubName} — home`}>
          <Wordmark name={s.shortName} logoSrc={mediaSrc(logo, "sm")} />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 xl:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-2 text-[0.95rem] font-semibold text-royal transition-colors hover:bg-royal/5">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/search" aria-label="Search" className="hidden size-10 items-center justify-center rounded-full hover:bg-royal/5 sm:flex">
            <Search className="size-5" aria-hidden />
          </Link>
          {user ? (
            <Link href={isAdmin ? "/admin" : "/account"} className="btn-ghost btn-sm hidden sm:inline-flex">
              {isAdmin ? "Admin" : "My account"}
            </Link>
          ) : (
            <Link href="/login" className="hidden text-sm font-medium text-fg/70 hover:text-fg sm:inline">
              Member sign in
            </Link>
          )}
          <Link href="/get-involved" className="btn-primary btn-sm hidden md:inline-flex">
            Get involved
          </Link>
          <MobileNav items={NAV} signedIn={!!user} isAdmin={!!isAdmin} />
        </div>
      </div>
    </header>
  );
}
