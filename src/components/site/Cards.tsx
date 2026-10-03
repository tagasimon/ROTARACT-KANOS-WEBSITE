import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Img, Monogram } from "./Img";
import { OrganizerTag, StatusPill, VerificationBadge } from "./Badges";
import { cn, fmtDate, fmtTime, humanize, initials, truncate } from "@/lib/utils";
import type { Media, Organization, Verification } from "@prisma/client";

type PersonLite = {
  slug: string;
  name: string;
  honorific?: string | null;
  professionalTitle?: string | null;
  organization?: string | null;
  photo?: Media | null;
  verification?: Verification;
};

export function PersonCard({ p, role, year, className }: { p: PersonLite; role?: string; year?: string; className?: string }) {
  return (
    <Link href={`/people/${p.slug}`} className={cn("group block", className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-paper-2">
        <Img media={p.photo} alt={p.name} sizes="(min-width:1024px) 22vw, 45vw" size="md" className="size-full transition-transform duration-700 group-hover:scale-[1.03]" fallback={<Monogram text={initials(p.name)} className="size-full" />} />
        {role && (
          <span className="absolute bottom-0 left-0 bg-royal px-2.5 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-paper">{role}</span>
        )}
      </div>
      <div className="mt-3">
        <p className="font-display text-lg font-bold leading-tight group-hover:text-azure">
          {p.honorific && <span className="font-medium text-stone">{p.honorific} </span>}
          {p.name}
        </p>
        {(p.professionalTitle || p.organization) && (
          <p className="mt-0.5 text-sm text-stone">{[p.professionalTitle, p.organization].filter(Boolean).join(" · ")}</p>
        )}
        {year && <p className="mt-1 font-cond text-xs text-stone">{year}</p>}
        <VerificationBadge v={p.verification} className="mt-2" />
      </div>
    </Link>
  );
}

type ProjectLite = {
  slug: string;
  title: string;
  tagline?: string | null;
  summary?: string | null;
  status: string;
  locationName?: string | null;
  cover?: Media | null;
  year?: { label: string } | null;
  verification?: Verification;
};

export function ProjectCard({ p, large, className }: { p: ProjectLite; large?: boolean; className?: string }) {
  return (
    <Link href={`/projects/${p.slug}`} className={cn("group block", className)}>
      <div className={cn("relative overflow-hidden rounded-sm bg-royal", large ? "aspect-[16/10]" : "aspect-[4/3]")}>
        <Img media={p.cover} alt={p.title} sizes={large ? "(min-width:1024px) 60vw, 100vw" : "(min-width:1024px) 30vw, 100vw"} className="size-full opacity-95 transition-transform duration-700 group-hover:scale-[1.03]" fallback={<Monogram text={initials(p.title)} dark className="size-full" />} />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <StatusPill status={p.status} />
        </div>
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-1.5">{[p.year?.label, p.locationName].filter(Boolean).join(" · ")}</p>
          <h3 className={cn("font-bold leading-tight group-hover:text-azure", large ? "text-3xl" : "text-xl")}>{p.title}</h3>
          {(p.tagline || p.summary) && <p className="mt-2 font-serif text-[1.05rem] leading-snug text-stone">{truncate(p.tagline || p.summary, large ? 200 : 120)}</p>}
          <VerificationBadge v={p.verification} className="mt-3" />
        </div>
        <ArrowUpRight className="mt-1 size-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
      </div>
    </Link>
  );
}

type EventLite = {
  slug: string;
  title: string;
  date: Date;
  endDate?: Date | null;
  startTime?: Date | null;
  venue?: string | null;
  type: string;
  status: string;
  organizer?: Pick<Organization, "name" | "type" | "isSelf"> | null;
  verification?: Verification;
};

export function EventRow({ e, dark, onGold }: { e: EventLite; dark?: boolean; onGold?: boolean }) {
  const d = new Date(e.date);
  return (
    <Link href={`/events/${e.slug}`} className={cn("group grid grid-cols-[4.5rem_1fr_auto] items-start gap-4 border-t py-5 sm:grid-cols-[6rem_1fr_auto] sm:gap-6", dark ? "border-paper/15" : onGold ? "border-fg/20" : "border-line")}>
      <div className="leading-none">
        <div className={cn("font-display text-4xl font-bold tabular-nums sm:text-5xl", dark ? "text-paper" : "text-fg")}>{fmtDate(d, { day: "2-digit" })}</div>
        <div className={cn("font-cond mt-1 text-xs font-bold uppercase tracking-wider", dark ? "text-paper/75" : onGold ? "text-fg" : "text-stone")}>{fmtDate(d, { month: "short", year: "numeric" })}</div>
      </div>
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <OrganizerTag name={e.organizer?.name} type={e.organizer?.type} self={e.organizer?.isSelf} />
          <span className={cn("text-xs", dark ? "text-paper/70" : onGold ? "text-fg" : "text-stone")}>{humanize(e.type)}</span>
          {e.status !== "SCHEDULED" && <StatusPill status={e.status} dark={dark} />}
        </div>
        <h3 className={cn("text-xl font-bold leading-tight sm:text-2xl", dark ? "text-paper group-hover:text-gold" : onGold ? "group-hover:underline" : "group-hover:text-azure")}>{e.title}</h3>
        <p className={cn("mt-1 flex flex-wrap items-center gap-x-3 text-sm", dark ? "text-paper/75" : onGold ? "text-fg" : "text-stone")}>
          {e.endDate && <span>until {fmtDate(e.endDate, { day: "numeric", month: "short" })}</span>}
          {e.startTime && <span>{fmtTime(e.startTime)}</span>}
          {e.venue && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {e.venue}
            </span>
          )}
        </p>
        <VerificationBadge v={e.verification} dark={dark} className="mt-2" />
      </div>
      <ArrowUpRight className={cn("mt-2 size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5", dark && "text-paper")} aria-hidden />
    </Link>
  );
}

type StoryLite = {
  slug: string;
  title: string;
  excerpt?: string | null;
  category: string;
  publishedAt?: Date | null;
  cover?: Media | null;
};

export function StoryCard({ s, className, dark }: { s: StoryLite; className?: string; dark?: boolean }) {
  return (
    <Link href={`/stories/${s.slug}`} className={cn("group block", className)}>
      <div className="aspect-[3/2] overflow-hidden rounded-sm bg-paper-2">
        <Img media={s.cover} alt="" sizes="(min-width:1024px) 30vw, 100vw" size="md" className="size-full transition-transform duration-700 group-hover:scale-[1.03]" fallback={<Monogram text={initials(s.title)} dark={dark} className="size-full" />} />
      </div>
      <p className={cn("eyebrow mt-4", dark && "text-paper/55")}>
        <span className={dark ? "text-gold" : "text-cranberry"}>{humanize(s.category)}</span>
        {s.publishedAt && <> · {fmtDate(s.publishedAt, { day: "numeric", month: "short", year: "numeric" })}</>}
      </p>
      <h3 className={cn("mt-2 text-xl font-bold leading-tight group-hover:text-azure", dark && "text-paper group-hover:text-gold")}>{s.title}</h3>
      {s.excerpt && <p className={cn("mt-2 font-serif leading-snug", dark ? "text-paper/65" : "text-stone")}>{truncate(s.excerpt, 140)}</p>}
    </Link>
  );
}
