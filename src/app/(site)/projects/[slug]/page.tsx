import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowUpRight, Calendar, FileText, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { publicProject, personCardSelect, eventCardInclude } from "@/lib/queries";
import { mediaSrc, youtubeId } from "@/lib/media";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl, fmtDate, fmtNumber, humanize, truncate } from "@/lib/utils";
import { Img } from "@/components/site/Img";
import { OrganizerTag, SourceNote, StatusPill, VerificationBadge } from "@/components/site/Badges";
import { EventRow, PersonCard, StoryCard } from "@/components/site/Cards";
import { Timeline } from "@/components/site/Timeline";
import { BeforeAfter } from "@/components/site/BeforeAfter";
import { getComparisons } from "@/lib/comparisons";
import { MapEmbed } from "@/components/site/MapEmbed";
import { JsonLd } from "@/components/site/JsonLd";
import { Reveal } from "@/components/site/Reveal";
import { canPreview } from "@/lib/preview";
import { PreviewBanner } from "@/components/site/PreviewBanner";

async function load(slug: string) {
  const preview = await canPreview("content");
  return db.project.findFirst({
    where: { slug, ...(preview ? {} : publicProject) },
    include: {
      cover: true,
      year: true,
      committee: true,
      lead: { select: personCardSelect },
      milestones: {
        orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
        include: { image: true, people: { where: { isPublic: true }, select: { slug: true, name: true } }, event: { select: { slug: true, title: true } }, documents: true },
      },
      metrics: { orderBy: { sortOrder: "asc" } },
      partners: { include: { organization: { include: { logo: true } } } },
      team: { where: { person: { isPublic: true } }, include: { person: { select: personCardSelect } }, orderBy: { sortOrder: "asc" } },
      events: { where: { publishStatus: "PUBLISHED", mergedIntoId: null }, include: eventCardInclude, orderBy: { date: "asc" } },
      stories: { where: { publishStatus: "PUBLISHED" }, include: { cover: true }, orderBy: { publishedAt: "desc" } },
      media: { orderBy: [{ date: "asc" }, { sortOrder: "asc" }], include: { people: { select: { slug: true, name: true } } } },
      documents: { where: { isPublic: true } },
      achievements: { where: { publishStatus: "PUBLISHED" } },
      socialPosts: { where: { publishStatus: "PUBLISHED" }, orderBy: { postedAt: "desc" }, take: 6 },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return {};
  const img = mediaSrc(p.cover, "lg");
  return {
    title: p.seoTitle || p.title,
    description: p.seoDescription || truncate(p.tagline || p.summary, 160),
    alternates: { canonical: `/projects/${p.slug}` },
    openGraph: { title: p.title, description: truncate(p.tagline || p.summary, 160), images: img ? [absoluteUrl(img)] : undefined, type: "article" },
  };
}

const CHAPTERS = [
  ["need", "The need"],
  ["idea", "The idea"],
  ["beginning", "The beginning"],
  ["journey", "The journey"],
  ["then-now", "Then → Now"],
  ["people", "The people"],
  ["partners", "The partners"],
  ["impact", "The impact"],
  ["today", "Today"],
  ["support", "Support it"],
] as const;

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const p = await load(slug);
  if (!p) {
    // Projects folded into a bigger one keep working links.
    const r = await db.siteSetting.findUnique({ where: { key: "projectRedirects" } });
    const to = (r?.value as Record<string, string> | null)?.[slug];
    if (to && to !== slug) permanentRedirect(`/projects/${to}`);
    notFound();
  }

  const president = p.yearId
    ? await db.leadershipAssignment.findFirst({ where: { yearId: p.yearId, role: { slug: "president" }, person: { isPublic: true } }, include: { person: { select: personCardSelect } } })
    : null;

  const phases = { BEFORE: [] as typeof p.media, DURING: [] as typeof p.media, AFTER: [] as typeof p.media, CURRENT: [] as typeof p.media };
  for (const m of p.media) if (m.phase) phases[m.phase].push(m);
  const comparisons = await getComparisons(p.id);
  const hasPhasePhotos = p.media.some((m) => m.phase);
  const hasThenNow = hasPhasePhotos || comparisons.length > 0;
  const gallery = p.media.filter((m) => m.kind === "IMAGE" && !m.phase);
  const videos = p.media.filter((m) => m.kind === "VIDEO");
  const latest = [...p.milestones].reverse().find((m) => m.date);
  const teamByRole = p.team.reduce<Record<string, typeof p.team>>((acc, t) => ((acc[t.role] ||= []).push(t), acc), {});

  const present = new Set<string>([
    p.need && "need",
    p.idea && "idea",
    (p.beginning || p.startDate) && "beginning",
    p.milestones.length && "journey",
    hasThenNow && "then-now",
    (p.lead || p.team.length || president) && "people",
    p.partners.length && "partners",
    (p.impact || p.metrics.length || p.achievements.length) && "impact",
    (p.today || latest) && "today",
    p.supportNeeds && p.status !== "COMPLETED" && "support",
  ].filter(Boolean) as string[]);

  return (
    <article>
      {p.publishStatus !== "PUBLISHED" && <PreviewBanner status={p.publishStatus} editHref={`/admin/c/projects/${p.id}`} />}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: p.title,
          about: p.summary || p.tagline,
          url: absoluteUrl(`/projects/${p.slug}`),
          dateCreated: p.startDate?.toISOString(),
          locationCreated: p.locationName ? { "@type": "Place", name: p.locationName } : undefined,
          creator: { "@type": "Organization", name: "Rotaract Club Kampala North" },
          image: mediaSrc(p.cover, "lg") ? absoluteUrl(mediaSrc(p.cover, "lg")!) : undefined,
        }}
      />

      {/* HERO */}
      <header className="grain relative overflow-hidden bg-royal text-paper">
        <div className="absolute inset-0">
          <Img media={p.cover} alt="" priority size="xl" className="size-full" fallback={<div className="size-full bg-royal" />} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-royal via-royal/80 to-royal/20" aria-hidden />
        <div className="container-x relative flex min-h-[72vh] flex-col justify-end pb-14 pt-28">
          <nav aria-label="Breadcrumb" className="rise mb-6 text-sm text-paper/60">
            <Link href="/projects" className="hover:text-paper">Projects</Link> <span aria-hidden>/</span> {p.year && <Link href={`/years/${p.year.slug}`} className="hover:text-paper">{p.year.label}</Link>}
          </nav>
          <div className="rise mb-6 flex flex-wrap items-center gap-3">
            <StatusPill status={p.status} dark />
            <VerificationBadge v={p.verification} dark />
          </div>
          <h1 className="rise rise-2 max-w-5xl text-[clamp(2.75rem,7.5vw,7rem)] font-bold leading-[1.04]">{p.title}</h1>
          {p.tagline && <p className="rise rise-3 mt-6 max-w-3xl font-serif text-2xl leading-snug text-paper/80">{p.tagline}</p>}
          <dl className="rise rise-4 mt-10 grid grid-cols-2 gap-6 border-t border-paper/15 pt-6 text-sm sm:grid-cols-4">
            {[
              ["Started", p.startDate ? fmtDate(p.startDate, { month: "long", year: "numeric" }) : "—"],
              ["Where", p.locationName || "—"],
              ["Led by", p.lead?.name || "—"],
              ["Committee", p.committee?.name || "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-paper/50">{k}</dt>
                <dd className="mt-1 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          {p.focusAreas.length > 0 && (
            <ul className="rise rise-4 mt-6 flex flex-wrap gap-2" aria-label="Rotary areas of focus">
              {p.focusAreas.map((a) => <li key={a}><Link href={`/projects?focus=${encodeURIComponent(a)}`} className="inline-block rounded-full border border-paper/30 px-3 py-1 text-xs font-semibold text-paper/90 hover:border-gold hover:text-gold">{a}</Link></li>)}
            </ul>
          )}
        </div>
      </header>

      {/* CHAPTER NAV */}
      <nav aria-label="Project chapters" className="sticky top-16 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="container-x flex gap-1 overflow-x-auto py-2 scrollbar-none">
          {CHAPTERS.filter(([id]) => present.has(id)).map(([id, label], i) => (
            <a key={id} href={`#${id}`} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-stone hover:bg-royal/5 hover:text-fg">
              <span className="mr-1 font-cond text-xs text-cranberry">{String(i + 1).padStart(2, "0")}</span>
              {label}
            </a>
          ))}
        </div>
      </nav>

      {/* SUMMARY */}
      {p.summary && (
        <section className="container-x py-16 sm:py-24">
          <p className="max-w-4xl font-serif text-[clamp(1.5rem,2.6vw,2.25rem)] leading-snug text-fg">{p.summary}</p>
          <SourceNote source={p.source} url={p.sourceUrl} className="mt-6" />
        </section>
      )}

      {/* NEED / IDEA / BEGINNING */}
      {(p.need || p.idea || p.beginning) && (
        <section className="container-x grid gap-14 pb-20 lg:grid-cols-3">
          {([["need", "The need", "What were people facing?", p.need], ["idea", "The idea", "How was it conceived?", p.idea], ["beginning", "The beginning", p.startDate ? fmtDate(p.startDate, { month: "long", year: "numeric" }) : "When it started", p.beginning]] as const).map(
            ([id, title, sub, body]) =>
              body && (
                <Reveal key={id}>
                  <div id={id} className="scroll-mt-32 border-t-4 border-royal pt-6">
                    <p className="eyebrow text-cranberry">{title}</p>
                    <h2 className="mt-2 text-2xl font-bold">{sub}</h2>
                    <div className="prose-ed mt-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
                  </div>
                </Reveal>
              ),
          )}
        </section>
      )}

      {/* QUOTE */}
      {p.quote && (
        <section className="bg-paper-2 py-20">
          <figure className="container-x max-w-4xl">
            <blockquote className="font-serif text-[clamp(1.75rem,3.5vw,3rem)] italic leading-tight">“{p.quote}”</blockquote>
            {p.quoteAttribution && <figcaption className="mt-6 eyebrow">{p.quoteAttribution}</figcaption>}
          </figure>
        </section>
      )}

      {/* JOURNEY */}
      {p.milestones.length > 0 && (
        <section id="journey" className="grain scroll-mt-28 bg-royal py-20 text-paper sm:py-28">
          <div className="container-x">
            <p className="eyebrow mb-4 text-paper/55">The journey</p>
            <h2 className="mb-16 text-5xl font-bold sm:text-6xl">Milestone by milestone.</h2>
            <Timeline
              dark
              items={p.milestones.map((m) => ({
                id: m.id,
                date: m.date,
                dateLabel: m.dateLabel,
                title: m.title,
                description: m.description,
                kind: m.stage,
                image: m.image,
                videoUrl: m.videoUrl,
                verification: m.verification,
                source: m.source,
                sourceUrl: m.sourceUrl,
                people: m.people,
                event: m.event,
              }))}
              terminal={p.status === "COMPLETED" || p.status === "ONGOING" ? { label: "Today", title: p.status === "ONGOING" ? "Ongoing impact" : "Completed", description: p.today ? truncate(p.today, 180) : undefined } : undefined}
            />
          </div>
        </section>
      )}

      {/* THEN → NOW */}
      {hasThenNow && (
        <section id="then-now" className="container-x scroll-mt-28 py-20 sm:py-28">
          <p className="eyebrow mb-4">Then → Now</p>
          <h2 className="mb-10 text-5xl font-bold">What changed, in pictures.</h2>
          {comparisons.length > 0 && (
            <div className="space-y-14">
              {comparisons.map((c) => <BeforeAfter key={c.id} stages={c.stages} alt={c.title || p.title} title={c.title} caption={c.caption} sourceUrl={c.sourceUrl} />)}
            </div>
          )}
          {hasPhasePhotos && (
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {(["BEFORE", "DURING", "AFTER", "CURRENT"] as const).map((ph) => (
              <figure key={ph}>
                <div className="aspect-[4/3] overflow-hidden rounded-sm bg-paper-2">
                  {phases[ph][0] ? <Img media={phases[ph][0]} sizes="25vw" size="md" className="size-full" /> : <div className="flex size-full items-center justify-center text-sm text-stone">No photo yet</div>}
                </div>
                <figcaption className="mt-2">
                  <span className="eyebrow text-cranberry">{humanize(ph)}</span>
                  {phases[ph][0]?.date && <span className="ml-2 text-xs text-stone">{fmtDate(phases[ph][0].date, { month: "short", year: "numeric" })}</span>}
                  {phases[ph][0]?.caption && <p className="text-sm text-stone">{phases[ph][0].caption}</p>}
                </figcaption>
              </figure>
            ))}
          </div>
          )}
        </section>
      )}

      {/* PEOPLE */}
      {present.has("people") && (
        <section id="people" className="scroll-mt-28 bg-paper-2 py-20 sm:py-28">
          <div className="container-x">
            <p className="eyebrow mb-4">Who made it happen?</p>
            <h2 className="mb-12 text-5xl font-bold">The people.</h2>
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
              {p.lead && <PersonCard p={p.lead} role="Project lead" />}
              {president && president.person.slug !== p.lead?.slug && <PersonCard p={president.person} role={`Club president ${p.year?.label ?? ""}`} />}
              {Object.entries(teamByRole).flatMap(([role, list]) => list.map((t) => <PersonCard key={t.id} p={t.person} role={role} />))}
            </div>
          </div>
        </section>
      )}

      {/* PARTNERS */}
      {p.partners.length > 0 && (
        <section id="partners" className="container-x scroll-mt-28 py-20 sm:py-28">
          <p className="eyebrow mb-4">The partners</p>
          <h2 className="mb-10 text-5xl font-bold">Who helped make it possible.</h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {p.partners.map((pt) => (
              <li key={pt.id} className="border-t-4 border-royal bg-paper-2 p-6">
                <OrganizerTag name={pt.organization.type.replace(/_/g, " ").toLowerCase()} type={pt.organization.type} className="mb-3 capitalize" />
                <p className="font-display text-xl font-bold">{pt.organization.name}</p>
                {pt.role && <p className="mt-1 text-sm text-stone">{pt.role}</p>}
                {pt.description && <p className="mt-2 font-serif text-stone">{pt.description}</p>}
                <div className="mt-3 flex items-center gap-3"><VerificationBadge v={pt.verification} />{pt.sourceUrl && <SourceNote url={pt.sourceUrl} />}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* IMPACT */}
      {present.has("impact") && (
        <section id="impact" className="grain scroll-mt-28 bg-cranberry py-20 text-paper sm:py-28">
          <div className="container-x grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="eyebrow mb-4 text-paper/60">The impact</p>
              <h2 className="text-5xl font-bold">What changed.</h2>
              {p.impact && <div className="prose-ed mt-6 text-paper/85 [&_*]:text-paper/85" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.impact) }} />}
              {p.beneficiaries && <p className="mt-4 font-serif text-xl text-paper">Beneficiaries: {p.beneficiaries}</p>}
            </div>
            {(p.metrics.length > 0 || p.achievements.length > 0) && <div className="grid content-start gap-4 sm:grid-cols-2 lg:col-span-7">
              {p.metrics.map((m) => (
                <div key={m.id} className="rounded-sm border border-paper/20 p-6">
                  <div className="font-display text-5xl font-bold tabular-nums">{fmtNumber(m.value)}<span className="ml-1 text-xl text-paper/60">{m.unit}</span></div>
                  <p className="mt-2 font-semibold">{m.label}</p>
                  <div className="mt-2"><VerificationBadge v={m.verification} dark /></div>
                </div>
              ))}
              {p.achievements.map((a) => (
                <div key={a.id} className="rounded-sm border border-paper/20 p-6">
                  <p className="eyebrow text-gold">Achievement</p>
                  <p className="mt-2 font-display text-xl font-bold">{a.title}</p>
                </div>
              ))}
            </div>}
          </div>
        </section>
      )}

      {/* TODAY */}
      {present.has("today") && (
        <section id="today" className="container-x scroll-mt-28 py-20 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="eyebrow mb-4">Today</p>
              <h2 className="text-5xl font-bold">Where it stands now.</h2>
              {p.today ? <div className="prose-ed mt-6" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.today) }} /> : <p className="mt-6 font-serif text-xl text-stone">Status: {humanize(p.status)}.</p>}
            </div>
            {latest && (
              <aside className="rounded-sm border border-line bg-white p-6 lg:col-span-5">
                <p className="eyebrow text-cranberry">Latest update</p>
                <p className="mt-2 font-cond text-sm">{latest.dateLabel || fmtDate(latest.date)}</p>
                <p className="mt-2 font-display text-2xl font-bold">{latest.title}</p>
                {latest.description && <p className="mt-2 font-serif text-stone">{truncate(latest.description, 220)}</p>}
              </aside>
            )}
          </div>
          {p.latitude != null && p.longitude != null && (
            <div className="mt-14 h-96">
              <MapEmbed lat={p.latitude} lng={p.longitude} label={p.locationName || p.title} zoom={0.08} className="h-full" />
            </div>
          )}
        </section>
      )}

      {/* SUPPORT */}
      {p.supportNeeds && p.status !== "COMPLETED" && (
        <section id="support" className="scroll-mt-28 bg-gold py-16 sm:py-20">
          <div className="container-x grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="eyebrow mb-4 text-fg/70">Support this project</p>
              <h2 className="text-4xl font-bold leading-tight sm:text-5xl">What would help next.</h2>
              {p.fundingGoal ? (
                <p className="mt-6 font-display text-2xl font-bold">
                  {p.fundingCurrency || "UGX"} {fmtNumber(p.fundingGoal)} goal
                  {p.fundingRaised != null && <span className="block text-base font-semibold">{p.fundingCurrency || "UGX"} {fmtNumber(p.fundingRaised)} raised so far</span>}
                </p>
              ) : null}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/support#talk" className="btn-ink">Talk to us about supporting it</Link>
                <Link href="/support" className="btn border border-fg/30 hover:bg-fg/5">Why support us</Link>
              </div>
            </div>
            <div className="prose-ed max-w-none text-fg lg:col-span-7 [&_strong]:text-fg" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.supportNeeds) }} />
          </div>
        </section>
      )}

      {/* GALLERY / VIDEOS */}
      {(gallery.length > 0 || videos.length > 0) && (
        <section className="bg-paper-2 py-20">
          <div className="container-x">
            <p className="eyebrow mb-8">From the archive</p>
            <div className="columns-2 gap-4 lg:columns-3 [&>*]:mb-4">
              {gallery.map((m) => (
                <figure key={m.id} className="break-inside-avoid">
                  <Img media={m} sizes="(min-width:1024px) 30vw, 50vw" size="md" className="w-full rounded-sm" />
                  {m.caption && <figcaption className="mt-1 text-xs text-stone">{m.caption}</figcaption>}
                </figure>
              ))}
            </div>
            {videos.length > 0 && (
              <div className="mt-10 grid gap-6 md:grid-cols-2">
                {videos.map((vd) => {
                  const yt = youtubeId(vd.url);
                  return (
                    <figure key={vd.id}>
                      {yt ? (
                        <iframe className="aspect-video w-full rounded-sm" src={`https://www.youtube-nocookie.com/embed/${yt}`} title={vd.title || "Video"} loading="lazy" allowFullScreen />
                      ) : (
                        <video className="aspect-video w-full rounded-sm bg-royal" controls preload="none" src={mediaSrc(vd) || undefined} />
                      )}
                      {vd.title && <figcaption className="mt-2 font-semibold">{vd.title}</figcaption>}
                    </figure>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* RELATED */}
      {(p.events.length > 0 || p.stories.length > 0 || p.documents.length > 0 || p.socialPosts.length > 0) && (
        <section className="container-x grid gap-16 py-20 lg:grid-cols-2">
          {p.events.length > 0 && (
            <div>
              <p className="eyebrow mb-4 flex items-center gap-2"><Calendar className="size-4" aria-hidden /> Events</p>
              <div className="border-b border-line">{p.events.map((e) => <EventRow key={e.slug} e={e} />)}</div>
            </div>
          )}
          {p.stories.length > 0 && (
            <div>
              <p className="eyebrow mb-4">Stories</p>
              <div className="grid gap-8 sm:grid-cols-2">{p.stories.map((s) => <StoryCard key={s.slug} s={s} />)}</div>
            </div>
          )}
          {p.documents.length > 0 && (
            <div>
              <p className="eyebrow mb-4 flex items-center gap-2"><FileText className="size-4" aria-hidden /> Documents</p>
              <ul className="divide-y divide-line border-y border-line">
                {p.documents.map((d) => (
                  <li key={d.id}>
                    <a href={d.storageKey ? `/media/${d.storageKey}` : d.url || "#"} className="flex items-center justify-between py-3 font-semibold hover:text-cranberry" target="_blank" rel="noopener noreferrer">
                      {d.title} <ArrowUpRight className="size-4" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {p.socialPosts.length > 0 && (
            <div>
              <p className="eyebrow mb-4">On social media</p>
              <ul className="divide-y divide-line border-y border-line">
                {p.socialPosts.map((sp) => (
                  <li key={sp.id}>
                    <a href={sp.url} target="_blank" rel="noopener noreferrer" className="block py-3 hover:text-cranberry">
                      <span className="eyebrow">{humanize(sp.platform)} · {fmtDate(sp.postedAt, { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span className="mt-1 block font-serif">{truncate(sp.content, 140)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <footer className="border-t border-line">
        <div className="container-x flex flex-wrap items-center justify-between gap-4 py-8 text-sm text-stone">
          <div className="flex flex-wrap items-center gap-4">
            <VerificationBadge v={p.verification} />
            <SourceNote source={p.source} url={p.sourceUrl} />
            {p.locationName && <span className="inline-flex items-center gap-1"><MapPin className="size-4" aria-hidden />{p.locationName}</span>}
          </div>
          <Link href="/get-involved?type=SUPPORT_PROJECT" className="btn-primary btn-sm">Support a project like this</Link>
        </div>
      </footer>
    </article>
  );
}
