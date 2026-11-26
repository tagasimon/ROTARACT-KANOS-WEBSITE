import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/rbac";
import { MobileNav } from "./MobileNav";
import { QrCode, Search } from "lucide-react";
import { db } from "@/lib/db";
import { mediaSrc } from "@/lib/media";
import { HeaderFrame } from "./HeaderFrame";

export const NAV = [
  { href: "/about", label: "Our Story" },
  { href: "/projects", label: "Projects" },
  { href: "/people", label: "People" },
  { href: "/leadership", label: "Leadership" },
  { href: "/events", label: "What's On" },
];

/** Shown in the mobile menu (and the footer), below the main items. */
export const NAV_MORE = [
  { href: "/businesses", label: "Member Businesses" },
  { href: "/stories", label: "Stories" },
  { href: "/achievements", label: "Achievements" },
  { href: "/district", label: "District" },
  { href: "/years", label: "Archive" },
];

/**
 * The club's Rotaract signature (cranberry on light backgrounds, white on dark ones).
 * An admin can replace it by uploading a logo in Settings.
 */
export function Wordmark({ name, light, logoSrc }: { name: string; light?: boolean; logoSrc?: string | null }) {
  const src = logoSrc && !light ? logoSrc : light ? "/brand/rotaract-kampala-north-white.png" : "/brand/rotaract-kampala-north.png";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={`Rotaract Club of ${name}`} width={442} height={100} className={light ? "h-12 w-auto" : "h-9 w-auto sm:h-10"} />
  );
}

export async function SiteHeader() {
  const [s, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const isAdmin = user && ADMIN_ROLES.includes(user.role);
  const logo = s.logoImageId ? await db.media.findUnique({ where: { id: s.logoImageId } }) : null;
  const logoSrc = mediaSrc(logo, "sm");
  // Over the homepage photo (group-data-[overlay]/hdr:…) the header turns white: the white signature, or an
  // uploaded logo knocked out to white. Class names stay written out in full so Tailwind can find them.
  return (
    <HeaderFrame>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-royal focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label={`${s.clubName} — home`} className="shrink-0">
          <span className="group-data-[overlay]/hdr:hidden">
            <Wordmark name={s.shortName} logoSrc={logoSrc} />
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc || "/brand/rotaract-kampala-north-white.png"}
            alt=""
            width={442}
            height={100}
            className={`hidden h-9 w-auto sm:h-10 group-data-[overlay]/hdr:block ${logoSrc ? "brightness-0 invert" : ""}`}
          />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-full px-2.5 py-2 text-[0.92rem] font-semibold text-royal transition-colors hover:bg-royal/5 2xl:px-3 group-data-[overlay]/hdr:text-white group-data-[overlay]/hdr:hover:bg-white/10">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/attend" aria-label="Meeting sign-in" title="Meeting sign-in" className="hidden h-10 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-royal hover:bg-royal/5 sm:flex group-data-[overlay]/hdr:text-white group-data-[overlay]/hdr:hover:bg-white/10">
            <QrCode className="size-5" aria-hidden /><span className="hidden 2xl:inline">Meeting sign-in</span>
          </Link>
          <Link href="/search" aria-label="Search" className="hidden size-10 items-center justify-center rounded-full text-fg hover:bg-royal/5 sm:flex group-data-[overlay]/hdr:text-white group-data-[overlay]/hdr:hover:bg-white/10">
            <Search className="size-5" aria-hidden />
          </Link>
          {user ? (
            <Link href={isAdmin ? "/admin" : "/account"} className="btn-ghost btn-sm hidden sm:inline-flex group-data-[overlay]/hdr:border-white/50 group-data-[overlay]/hdr:text-white group-data-[overlay]/hdr:hover:border-white group-data-[overlay]/hdr:hover:bg-white/10">
              {isAdmin ? "Admin" : "My account"}
            </Link>
          ) : (
            <Link href="/login" className="hidden whitespace-nowrap text-sm font-medium text-fg/70 hover:text-fg sm:inline group-data-[overlay]/hdr:text-white/85 group-data-[overlay]/hdr:hover:text-white">
              Sign in
            </Link>
          )}
          <Link href="/get-involved?type=JOIN" className="hidden whitespace-nowrap px-1 text-sm font-semibold text-royal hover:text-azure xl:inline group-data-[overlay]/hdr:text-white group-data-[overlay]/hdr:hover:text-gold">
            Join us
          </Link>
          <Link href="/support" className="btn-primary btn-sm hidden whitespace-nowrap md:inline-flex">
            Support us
          </Link>
          <div className="text-fg group-data-[overlay]/hdr:text-white">
            <MobileNav items={[{ href: "/", label: "Home" }, ...NAV, ...NAV_MORE]} signedIn={!!user} isAdmin={!!isAdmin} />
          </div>
        </div>
      </div>
    </HeaderFrame>
  );
}
