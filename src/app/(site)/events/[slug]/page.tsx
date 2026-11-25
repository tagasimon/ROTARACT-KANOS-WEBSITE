import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarPlus, Clock, ExternalLink, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { personCardSelect } from "@/lib/queries";
import { mediaSrc } from "@/lib/media";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl, fmtDate, fmtTime, humanize, truncate } from "@/lib/utils";
import { Img } from "@/components/site/Img";
import { OrganizerTag, StatusPill, VerificationBadge } from "@/components/site/Badges";
import { PersonCard, StoryCard } from "@/components/site/Cards";
import { MapEmbed } from "@/components/site/MapEmbed";
import { JsonLd } from "@/components/site/JsonLd";
import { canPreview } from "@/lib/preview";
import { PreviewBanner } from "@/components/site/PreviewBanner";

async function load(slug: string) {
  const e = await db.event.findUnique({
    where: { slug },
    include: {
      organizer: true,
      cover: true,
      project: { select: { slug: true, title: true } },
      year: true,
      people: { where: { isPublic: true }, select: personCardSelect },
      sources: { orderBy: { firstImported: "asc" } },
      stories: { where: { publishStatus: "PUBLISHED" }, include: { cover: true } },
      albums: { where: { publishStatus: "PUBLISHED" }, include: { cover: true } },
      media: { where: { kind: "IMAGE" }, take: 12 },
      mergedInto: { select: { slug: true } },
    },
  });
  return e;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = await load((await params).slug);
  if (!e) return {};
  const desc = e.seoDescription || truncate(e.description, 160) || `${humanize(e.type)} on ${fmtDate(e.date)}${e.organizer ? `, organised by ${e.organizer.name}` : ""}.`;
  return { title: e.seoTitle || e.title, description: desc, alternates: { canonical: `/events/${e.slug}` }, openGraph: { title: e.title, description: desc, images: mediaSrc(e.cover) ? [absoluteUrl(mediaSrc(e.cover)!)] : undefined } };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const e = await load((await params).slug);
  if (!e || (e.publishStatus !== "PUBLISHED" && !e.mergedInto && !(await canPreview("events")))) notFound();
  if (e.mergedInto) redirect(`/events/${e.mergedInto.slug}`);
  return (
    <article>
      {e.publishStatus !== "PUBLISHED" && <PreviewBanner status={e.publishStatus} editHref={`/admin/c/events/${e.id}`} />}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: e.title,
          startDate: (e.startTime || e.date).toISOString(),
          endDate: (e.endTime || e.endDate)?.toISOString(),
          eventStatus: e.status === "CANCELLED" ? "https://schema.org/EventCancelled" : e.status === "POSTPONED" ? "https://schema.org/EventPostponed" : "https://schema.org/EventScheduled",
          eventAttendanceMode: e.onlineUrl ? "https://schema.org/OnlineEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
          location: e.venue ? { "@type": "Place", name: e.venue, address: e.address || "Kampala, Uganda" } : undefined,
          organizer: e.organizer ? { "@type": "Organization", name: e.organizer.name, url: e.organizer.website || undefined } : undefined,
          description: e.description || undefined,
          url: absoluteUrl(`/events/${e.slug}`),
        }}
      />
      <header className="grain bg-royal text-paper">
        <div className="container-x grid gap-10 py-16 md:grid-cols-12 md:py-24">
          <div className="md:col-span-8">
            <nav aria-label="Breadcrumb" className="mb-6 text-sm text-paper/60"><Link href="/events" className="hover:text-paper">What's happening</Link></nav>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <OrganizerTag name={e.organizer?.name} type={e.organizer?.type} self={e.organizer?.isSelf} className="px-3 py-1 text-xs" />
              <span className="text-sm text-paper/60">{humanize(e.type)}</span>
              {e.status !== "SCHEDULED" && <StatusPill status={e.status} dark />}
              <VerificationBadge v={e.verification} dark />
            </div>
            <h1 className="text-[clamp(2.5rem,6vw,5.5rem)] font-bold leading-[1.06]">{e.title}</h1>
          </div>
          <div className="flex flex-col justify-end gap-4 md:col-span-4">
            <div className="rounded-sm bg-paper/5 p-6 ring-1 ring-paper/15">
              <p className="font-display text-6xl font-bold leading-none">{fmtDate(e.date, { day: "2-digit" })}</p>
              <p className="mt-1 font-semibold uppercase tracking-widest text-paper/70">{fmtDate(e.date, { weekday: "long", month: "long", year: "numeric" })}</p>
              {e.endDate && <p className="mt-1 text-sm text-paper/60">until {fmtDate(e.endDate, { weekday: "short", day: "numeric", month: "long" })}</p>}
              {(e.startTime || e.endTime) && <p className="mt-4 flex items-center gap-2"><Clock className="size-4" aria-hidden />{fmtTime(e.startTime)}{e.endTime && ` – ${fmtTime(e.endTime)}`}</p>}
              {e.venue && <p className="mt-2 flex items-start gap-2"><MapPin className="mt-1 size-4 shrink-0" aria-hidden /><span>{e.venue}{e.address && <span className="block text-sm text-paper/60">{e.address}</span>}</span></p>}
              <div className="mt-6 flex flex-wrap gap-2">
                <a href={`/api/events.ics?event=${e.slug}`} className="btn-primary btn-sm"><CalendarPlus className="size-4" aria-hidden />Add to calendar</a>
                {e.registrationUrl && <a href={e.registrationUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost-light btn-sm">Register <ExternalLink className="size-3.5" aria-hidden /></a>}
                {e.onlineUrl && <a href={e.onlineUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost-light btn-sm">Join online</a>}
              </div>
            </div>
          </div>
        </div>
      </header>
      {e.cover && <div className="container-x -mt-1 pt-10"><Img media={e.cover} alt={e.title} className="aspect-[21/9] w-full rounded-sm" /></div>}
      <div className="container-x grid gap-14 py-16 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {e.description ? <div className="prose-ed" dangerouslySetInnerHTML={{ __html: renderMarkdown(e.description) }} /> : <p className="font-serif text-xl text-stone">No further details have been published.</p>}
          {e.people.length > 0 && (
            <section className="mt-14">
              <h2 className="mb-6 text-2xl font-bold">People</h2>
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">{e.people.map((p) => <PersonCard key={p.slug} p={p} />)}</div>
            </section>
          )}
          {e.stories.length > 0 && (
            <section className="mt-14">
              <h2 className="mb-6 text-2xl font-bold">Stories</h2>
              <div className="grid gap-8 sm:grid-cols-2">{e.stories.map((s) => <StoryCard key={s.slug} s={s} />)}</div>
            </section>
          )}
          {e.media.length > 0 && (
            <section className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3">{e.media.map((m) => <Img key={m.id} media={m} size="md" sizes="30vw" className="aspect-square w-full rounded-sm" />)}</section>
          )}
        </div>
        <aside className="space-y-8 lg:col-span-4">
          {e.project && <div><p className="eyebrow mb-1">Part of project</p><Link href={`/projects/${e.project.slug}`} className="font-display text-xl font-bold hover:text-cranberry">{e.project.title}</Link></div>}
          {e.year && <div><p className="eyebrow mb-1">Rotaract year</p><Link href={`/years/${e.year.slug}`} className="font-cond hover:text-cranberry">{e.year.label}</Link></div>}
          {e.organizer && (
            <div>
              <p className="eyebrow mb-1">Organizer</p>
              <p className="font-semibold">{e.organizer.name}</p>
              {e.organizer.website && <a className="link-u text-sm" href={e.organizer.website} target="_blank" rel="noopener noreferrer">{e.organizer.website.replace(/^https?:\/\//, "")}</a>}
            </div>
          )}
          {e.latitude != null && e.longitude != null && <MapEmbed lat={e.latitude} lng={e.longitude} label={e.venue || undefined} className="h-64" />}
          {e.sources.length > 0 && (
            <div>
              <p className="eyebrow mb-2">Sources</p>
              <ul className="space-y-2 text-sm">
                {e.sources.map((s) => (
                  <li key={s.id}>
                    {s.sourceUrl ? <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="link-u">{s.source}</a> : s.source}
                    <span className="block text-xs text-stone">first seen {fmtDate(s.firstImported, { day: "numeric", month: "short", year: "numeric" })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}
