import Link from "next/link";
import { Img } from "./Img";
import { SourceNote, VerificationBadge } from "./Badges";
import { cn, fmtDate, humanize } from "@/lib/utils";
import type { Media, Verification } from "@prisma/client";
import { Reveal } from "./Reveal";

export type TimelineItem = {
  id: string;
  date?: Date | null;
  dateLabel?: string | null;
  title: string;
  description?: string | null;
  kind?: string | null;
  image?: Media | null;
  videoUrl?: string | null;
  verification?: Verification;
  source?: string | null;
  sourceUrl?: string | null;
  people?: { slug: string; name: string }[];
  projects?: { slug: string; title: string }[];
  event?: { slug: string; title: string } | null;
  year?: { slug: string; label: string } | null;
};

/** Vertical editorial timeline. On desktop items alternate sides around a central spine. */
export function Timeline({ items, dark, terminal }: { items: TimelineItem[]; dark?: boolean; terminal?: { label: string; title: string; description?: string } }) {
  return (
    <ol className="relative">
      <span className={cn("absolute bottom-0 left-[0.6rem] top-2 w-px md:left-1/2", dark ? "bg-paper/20" : "bg-royal/20")} aria-hidden />
      {items.map((it, i) => {
        const right = i % 2 === 1;
        return (
          <li key={it.id} className="relative pb-14 pl-10 md:grid md:grid-cols-2 md:gap-16 md:pl-0">
            <span className={cn("absolute left-0 top-1.5 size-5 rounded-full border-4 md:left-1/2 md:-translate-x-1/2", dark ? "border-royal bg-gold" : "border-paper bg-cranberry")} aria-hidden />
            <Reveal className={cn(right ? "md:col-start-2" : "md:col-start-1 md:text-right")}>
              <p className={cn("font-cond text-sm font-semibold", dark ? "text-gold" : "text-cranberry")}>
                {it.dateLabel || (it.date ? fmtDate(it.date, { month: "long", year: "numeric" }) : "Date unknown")}
              </p>
              {it.kind && <p className={cn("eyebrow mt-1", dark && "text-paper/50")}>{humanize(it.kind)}</p>}
              <h3 className={cn("mt-2 text-2xl font-bold leading-tight sm:text-3xl", dark && "text-paper")}>{it.title}</h3>
              {it.description && <p className={cn("mt-3 font-serif text-lg leading-relaxed", dark ? "text-paper/70" : "text-charcoal")}>{it.description}</p>}
              {it.image && (
                <div className={cn("mt-5 overflow-hidden rounded-sm", !right && "md:ml-auto", "max-w-md")}>
                  <Img media={it.image} sizes="(min-width:768px) 28rem, 90vw" size="md" className="aspect-[3/2] w-full" />
                </div>
              )}
              <div className={cn("mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm", !right && "md:justify-end", dark ? "text-paper/60" : "text-stone")}>
                {it.people?.map((p) => <Link key={p.slug} href={`/people/${p.slug}`} className="link-u">{p.name}</Link>)}
                {it.projects?.map((p) => <Link key={p.slug} href={`/projects/${p.slug}`} className="link-u">{p.title}</Link>)}
                {it.event && <Link href={`/events/${it.event.slug}`} className="link-u">{it.event.title}</Link>}
                {it.year && <Link href={`/years/${it.year.slug}`} className="link-u">{it.year.label}</Link>}
                {it.videoUrl && <a href={it.videoUrl} target="_blank" rel="noopener noreferrer" className="link-u">Watch video</a>}
              </div>
              <div className={cn("mt-3 flex flex-wrap items-center gap-3", !right && "md:justify-end")}>
                <VerificationBadge v={it.verification} dark={dark} />
                <SourceNote source={it.source} url={it.sourceUrl} className={dark ? "text-paper/45" : undefined} />
              </div>
            </Reveal>
          </li>
        );
      })}
      {terminal && (
        <li className="relative pl-10 md:pl-0 md:text-center">
          <span className="absolute left-0 top-1.5 size-5 rounded-full bg-gold md:left-1/2 md:-translate-x-1/2" aria-hidden />
          <div className="md:pt-10">
            <p className="font-cond text-sm font-semibold text-charcoal">{terminal.label}</p>
            <h3 className={cn("mt-2 text-3xl font-bold", dark && "text-paper")}>{terminal.title}</h3>
            {terminal.description && <p className={cn("mx-auto mt-3 max-w-xl font-serif text-lg", dark ? "text-paper/70" : "text-stone")}>{terminal.description}</p>}
          </div>
        </li>
      )}
    </ol>
  );
}
