import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCurrentYear } from "@/lib/years";
import {
  getImpact,
  getLeadershipForYear,
  getSnapshot,
  getUpcomingEvents,
  personCardSelect,
  publicProject,
  publicStory,
  startOfToday,
  nextRegularMeeting,
} from "@/lib/queries";
import { Img, Monogram } from "@/components/site/Img";
import { SectionHead, Empty } from "@/components/site/Section";
import { EventRow, PersonCard, ProjectCard, StoryCard } from "@/components/site/Cards";
import { Countdown } from "@/components/site/Countdown";
import { OrganizerTag, StatusPill, VerificationBadge } from "@/components/site/Badges";
import { Reveal } from "@/components/site/Reveal";
import { JsonLd } from "@/components/site/JsonLd";
import { absoluteUrl, cn, fmtDate, fmtNumber, fmtTime, humanize, initials, truncate } from "@/lib/utils";
import { mediaSrc } from "@/lib/media";
import { getFeaturedCampaign } from "@/lib/campaigns";
import { getComparisons } from "@/lib/comparisons";
import { BeforeAfter } from "@/components/site/BeforeAfter";
import { CampaignFeature } from "@/components/site/Campaign";

const JOURNEY: { key: string; label: string }[] = [
  { key: "NEED", label: "Need" },
  { key: "IDEA", label: "Idea" },
  { key: "PLANNING", label: "Planning" },
  { key: "FUNDRAISING", label: "Fundraising" },
  { key: "IMPLEMENTATION", label: "Implementation" },
  { key: "MILESTONE", label: "Milestones" },
  { key: "COMPLETION", label: "Completion" },
  { key: "IMPACT", label: "Impact today" },
];

/** Homepage "Support our work": the ways someone can take part. "attend" and "donate" get live details. */
const WAYS_IN = [
  { key: "attend", title: "Attend a fellowship", body: "", cta: "Plan your visit", href: "/get-involved?type=ATTEND" },
  { key: "join", title: "Explore membership", body: "Young professionals aged 18 and over are welcome. Come as a guest first and see if it fits.", cta: "Ask about joining", href: "/get-involved?type=JOIN" },
  { key: "volunteer", title: "Volunteer", body: "Bring your hands or your profession to a project day: medical camps, school builds, tree planting.", cta: "Offer your time", href: "/get-involved?type=VOLUNTEER" },
  { key: "partner", title: "Become a partner", body: "Clubs, companies and organisations work with us on projects neither could deliver alone.", cta: "Start a conversation", href: "/get-involved?type=PARTNER" },
  { key: "sponsor", title: "Sponsor a project", body: "Fund a phase, give in kind, or put your brand beside a project day.", cta: "See what needs support", href: "/support" },
  { key: "donate", title: "Donate", body: "Talk to us about giving to a project or to the club's service fund.", cta: "Give", href: "/support#talk" },
] as const;

export default async function HomePage() {
  const [s, year, snap, impact, campaign] = await Promise.all([getSettings(), getCurrentYear(), getSnapshot(), getImpact(), getFeaturedCampaign()]);
  const today = startOfToday();

  const [heroMedia, history, currentProjects, featured, leaders, skills, achievements, upcoming, nextVisit, districtEvents, socialPosts, stories] =
    await Promise.all([
      s.heroImageId ? db.media.findUnique({ where: { id: s.heroImageId } }) : null,
      db.historyEntry.findMany({ where: { publishStatus: "PUBLISHED" }, orderBy: { date: "asc" }, take: 6, include: { image: true } }),
      db.project.findMany({
        where: { ...publicProject, status: { in: ["IDEA", "PLANNING", "FUNDRAISING", "IMPLEMENTATION", "ONGOING"] } },
        include: { cover: true, year: true },
        orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
        take: 3,
      }),
      db.project.findFirst({
        where: { ...publicProject, featured: true },
        include: { cover: true, milestones: { orderBy: [{ date: "asc" }, { sortOrder: "asc" }], take: 8 }, lead: { select: personCardSelect }, metrics: { take: 3 } },
        orderBy: { updatedAt: "desc" },
      }),
      year ? getLeadershipForYear(year.id) : Promise.resolve([]),
      db.skill.findMany({ where: { people: { some: { isPublic: true } } }, include: { _count: { select: { people: true } } }, orderBy: { name: "asc" } }),
      db.achievement.findMany({ where: { publishStatus: "PUBLISHED" }, orderBy: [{ featured: "desc" }, { date: "desc" }], take: 4, include: { year: true } }),
      getUpcomingEvents(6, { organizer: { type: { in: ["ROTARACT_CLUB", "ROTARY_CLUB"] } } }),
      db.districtVisit.findFirst({ where: { date: { gte: today }, status: { in: ["CONFIRMED", "TENTATIVE"] } }, orderBy: { date: "asc" } }),
      getUpcomingEvents(4, { organizer: { type: { in: ["ROTARACT_DISTRICT", "ROTARY_DISTRICT", "ROTARY_INTERNATIONAL"] } } }),
      db.socialPost.findMany({ where: { publishStatus: "PUBLISHED", showInFeed: true }, orderBy: { postedAt: "desc" }, take: 4, include: { image: true } }),
      db.story.findMany({ where: publicStory, orderBy: { publishedAt: "desc" }, take: 3, include: { cover: true } }),
    ]);

  const heroSrc = mediaSrc(heroMedia, "xl");
  const nextMeeting = nextRegularMeeting(s.meetingDay, s.meetingTime);
  const foundedYear = snap.founded ? snap.founded.getUTCFullYear() : null;
  const president = leaders.find((l) => l.role.slug === "president");
  const stageSet = new Set(featured?.milestones.map((m) => m.stage));
  const featuredCompare = featured ? (await getComparisons(featured.id))[0] ?? null : null;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NGO",
          name: s.clubName,
          url: absoluteUrl("/"),
          foundingDate: s.charterDate || undefined,
          description: s.description,
          sameAs: Object.values(s.socials).filter(Boolean),
          address: { "@type": "PostalAddress", addressLocality: "Kampala", addressCountry: "UG" },
          parentOrganization: { "@type": "Organization", name: "Rotary International" },
        }}
      />

      {/* ───────── HERO ───────── */}
      <section className="grain relative overflow-hidden bg-royal text-paper">
        {heroSrc && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroSrc} alt={heroMedia?.alt || ""} fetchPriority="high" className="absolute inset-0 size-full object-cover" />
            {/* Dark at the bottom where the words sit, clear at the top so the photo reads as a photo. */}
            <div className="absolute inset-0 bg-gradient-to-t from-royal via-royal/45 to-transparent" aria-hidden />
            <div className="absolute inset-0 bg-gradient-to-r from-royal/55 via-royal/15 to-transparent" aria-hidden />
          </>
        )}
        {!heroSrc && foundedYear && (
          <div className="pointer-events-none absolute -right-[4vw] bottom-[-3vw] select-none font-display text-[clamp(10rem,34vw,32rem)] font-bold leading-none tracking-tight text-paper/[0.05]" aria-hidden>
            {foundedYear}
          </div>
        )}
        <div className="container-x relative grid min-h-[min(88vh,860px)] content-end gap-10 pb-14 pt-24 md:pb-20">
          <div className="max-w-5xl">
            <p className="eyebrow rise mb-6 flex flex-wrap items-center gap-3 text-paper/60">
              <span className="inline-flex items-center gap-2 rounded-full bg-cranberry px-3 py-1 text-paper">
                <span className="size-1.5 animate-pulse rounded-full bg-paper" aria-hidden />
                {snap.currentYear ? `Rotaract year ${snap.currentYear}` : s.district}
              </span>
              <span>{s.clubName} · Kampala, Uganda</span>
            </p>
            <h1 className="rise rise-2 text-[clamp(2.75rem,7.5vw,7rem)] font-bold leading-[1.02] tracking-tight">{s.heroHeadline}</h1>
            <p className="rise rise-3 mt-8 max-w-2xl font-serif text-xl leading-relaxed text-paper/80 sm:text-2xl">{s.heroSubhead || s.description}</p>
            <div className="rise rise-4 mt-10 flex flex-wrap gap-3">
              <Link href="/projects" className="btn-primary">Discover our impact <ArrowRight className="size-4" aria-hidden /></Link>
              <Link href="/people" className="btn-ghost-light">Meet the people</Link>
              <Link href="/get-involved?type=JOIN" className="btn bg-gold text-fg hover:bg-paper">Join us</Link>
            </div>
          </div>
          <div className="rise rise-4 flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-paper/15 pt-6 text-sm text-paper/65">
            <span><strong className="text-paper">Fridays, {s.meetingTime}</strong> · {s.meetingVenue}, {s.meetingAddress}</span>
            {president && <span>President {year?.label}: <Link href={`/people/${president.person.slug}`} className="text-paper underline-offset-4 hover:underline">{president.person.name}</Link></span>}
          </div>
        </div>
      </section>

      {/* ───────── SNAPSHOT ───────── */}
      <section aria-label="Club snapshot" className="border-b border-line bg-paper">
        <div className="container-x grid grid-cols-2 divide-line sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
          {[
            { k: "Chartered", v: foundedYear ? String(foundedYear) : "—", sub: snap.founded ? fmtDate(snap.founded, { day: "numeric", month: "short" }) : "" },
            { k: "Years of service", v: snap.yearsOfService != null ? String(snap.yearsOfService) : "—" },
            { k: snap.membersFromRoll ? "Members (district roll)" : "Active members", v: snap.members ? fmtNumber(snap.members) : "—" },
            { k: "Projects archived", v: String(snap.projects) },
            { k: "Communities", v: String(snap.communities) },
            { k: "Achievements", v: String(snap.achievements) },
          ].map((it, i) => (
            <div key={it.k} className={cn("py-7 lg:px-6", i % 2 === 1 && "pl-4 sm:pl-0", i > 0 && "lg:pl-6")}>
              <div className="font-display text-4xl font-bold tabular-nums sm:text-5xl">{it.v}</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone">{it.k}{it.sub && <span className="font-normal normal-case tracking-normal"> · {it.sub}</span>}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── FEATURED FUNDRAISING CAMPAIGN ───────── */}
      {campaign && <CampaignFeature c={campaign} />}

      {/* ───────── OUR STORY ───────── */}
      <section className="container-x py-20 sm:py-28">
        <SectionHead index="01" eyebrow="Our story" title={<>From a charter in {foundedYear ?? "Kampala"}<br className="hidden sm:block" /> to a club of {snap.members || "many"}.</>} intro="The moments that made Kampala North — kept on the record, with sources." href="/about" hrefLabel="The full timeline" />
        {history.length ? (
          <div className="-mx-4 flex snap-x gap-px overflow-x-auto px-4 pb-4 scrollbar-none sm:mx-0 sm:px-0">
            {history.map((h) => (
              <Link key={h.id} href="/about" className="group relative min-w-[78%] snap-start border-l-2 border-royal bg-paper-2 p-6 transition-colors hover:bg-paper-3 sm:min-w-[22rem] lg:min-w-0 lg:flex-1">
                <p className="font-cond text-sm font-semibold text-cranberry">{h.dateLabel || (h.date ? fmtDate(h.date, { month: "short", year: "numeric" }) : "")}</p>
                <h3 className="mt-3 text-xl font-bold leading-tight">{h.title}</h3>
                <p className="mt-2 font-serif text-stone">{truncate(h.description, 110)}</p>
                <VerificationBadge v={h.verification} className="mt-4" />
              </Link>
            ))}
          </div>
        ) : (
          <Empty title="Our timeline is being written">Club admins can add milestones from the CMS.</Empty>
        )}
      </section>

      {/* ───────── CURRENT PROJECTS ───────── */}
      <section className="bg-paper-2 py-20 sm:py-28">
        <div className="container-x">
          <SectionHead index="02" eyebrow="What we're working on" title="Service in progress." intro="Projects the club is planning, funding or delivering right now." href="/projects" hrefLabel="All projects" />
          {currentProjects.length ? (
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
              {currentProjects.map((p, i) => (
                <Reveal key={p.slug} delay={i * 0.08}>
                  <ProjectCard p={p} />
                </Reveal>
              ))}
            </div>
          ) : (
            <Empty title="No active projects published yet">When the club adds a project in the CMS, it appears here automatically.</Empty>
          )}
        </div>
      </section>

      {/* ───────── PROJECT JOURNEY ───────── */}
      {featured && (
        <section className="grain bg-royal py-20 text-paper sm:py-28">
          <div className="container-x">
            <SectionHead dark index="03" eyebrow="Project journey" title={featured.title} intro={featured.tagline || truncate(featured.summary, 160)} href={`/projects/${featured.slug}`} hrefLabel="Follow the full journey" />
            <ol className="mb-12 grid grid-cols-4 gap-px overflow-hidden rounded-sm bg-paper/10 sm:grid-cols-8" aria-label="Project stages">
              {JOURNEY.map((st, i) => {
                const reached = stageSet.has(st.key as never) || (st.key === "NEED" && !!featured.need) || (st.key === "IDEA" && !!featured.idea) || (st.key === "IMPACT" && !!featured.impact);
                return (
                  <li key={st.key} className={cn("p-3 sm:p-4", reached ? "bg-cranberry text-paper" : "bg-royal text-powder ring-1 ring-inset ring-white/15")}>
                    <span className="font-cond text-[0.65rem]">{String(i + 1).padStart(2, "0")}</span>
                    <span className="mt-1 block text-xs font-semibold sm:text-sm">{st.label}</span>
                  </li>
                );
              })}
            </ol>
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                {featuredCompare ? (
                  <div className="[&_figcaption]:text-paper/70 [&_figcaption_span]:text-paper">
                    <BeforeAfter stages={featuredCompare.stages} alt={featured.title} caption={featuredCompare.caption} />
                  </div>
                ) : (
                  <div className="aspect-[16/10] overflow-hidden rounded-sm">
                    <Img media={featured.cover} alt={featured.title} sizes="(min-width:1024px) 55vw, 100vw" className="size-full" fallback={<Monogram text={initials(featured.title)} dark className="size-full" />} />
                  </div>
                )}
              </div>
              <div className="lg:col-span-5">
                {featured.need && (
                  <>
                    <p className="eyebrow text-paper/50">The need</p>
                    <p className="mt-3 font-serif text-2xl leading-snug text-paper/90">{truncate(featured.need, 220)}</p>
                  </>
                )}
                <ol className="mt-8 space-y-4">
                  {featured.milestones.slice(0, 4).map((m) => (
                    <li key={m.id} className="grid grid-cols-[6.5rem_1fr] gap-4 border-t border-paper/15 pt-4">
                      <span className="font-cond text-sm text-gold">{m.dateLabel || (m.date ? fmtDate(m.date, { month: "short", year: "numeric" }) : "")}</span>
                      <span className="font-semibold">{m.title}</span>
                    </li>
                  ))}
                </ol>
                <Link href={`/projects/${featured.slug}`} className="btn-primary mt-8">Read the story <ArrowRight className="size-4" aria-hidden /></Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────── ACHIEVEMENTS + IMPACT ───────── */}
      <section className="bg-paper-2 py-20 sm:py-28">
        <div className="container-x">
          <SectionHead index="04" eyebrow="What we have achieved" title="On the record." intro="Only numbers backed by club data. Each one links back to where it came from." href="/achievements" hrefLabel="All achievements" />
          {impact.length > 0 && (
            <div className="mb-14 grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
              {impact.slice(0, 8).map((m) => (
                <div key={m.key} className="rounded-sm border-t-4 border-cranberry bg-paper p-6">
                  <div className="font-display text-4xl font-bold tabular-nums sm:text-5xl">{fmtNumber(m.value)}{m.unit && <span className="ml-1 text-xl font-bold text-stone">{m.unit}</span>}</div>
                  <div className="mt-2 font-semibold">{m.label}</div>
                  {m.description && <div className="mt-1 text-sm text-stone">{m.description}</div>}
                  {!m.verified && <VerificationBadge v="NEEDS_VERIFICATION" className="mt-3" />}
                </div>
              ))}
            </div>
          )}
          {achievements.length ? (
            <div className="grid gap-6 md:grid-cols-2">
              {achievements.map((a) => (
                <article key={a.id} className="grid grid-cols-[auto_1fr] gap-6 border-t-2 border-royal pt-5">
                  <div className="font-display text-5xl font-bold leading-none text-cranberry tabular-nums">{a.metricValue != null ? fmtNumber(a.metricValue) : "★"}</div>
                  <div>
                    <p className="eyebrow">{[a.date && fmtDate(a.date, { month: "long", year: "numeric" }), a.year?.label].filter(Boolean).join(" · ")}</p>
                    <h3 className="mt-1 text-xl font-bold leading-tight">{a.title}</h3>
                    {a.description && <p className="mt-2 font-serif text-stone">{truncate(a.description, 180)}</p>}
                    <VerificationBadge v={a.verification} className="mt-3" />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty title="Achievements will appear here" />
          )}
        </div>
      </section>

      {/* ───────── PEOPLE ───────── */}
      <section className="container-x py-20 sm:py-28">
        <SectionHead index="05" eyebrow="The people behind the club" title={<>Young professionals who<br className="hidden sm:block" /> put their skills to work.</>} intro={year ? `The ${year.label} leadership team and the members who make the work happen.` : undefined} href="/people" hrefLabel="Meet everyone" />
        {leaders.length ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
            {leaders.slice(0, 10).map((l) => (
              <PersonCard key={l.id} p={l.person} role={l.customTitle || l.role.title} />
            ))}
          </div>
        ) : (
          <Empty title="Leadership for this year hasn't been published">Admins can assign the board under Leadership in the CMS.</Empty>
        )}
        {skills.length > 0 && (
          <div className="mt-16 border-t border-line pt-8">
            <p className="eyebrow mb-4">Skills in the room</p>
            <div className="flex flex-wrap gap-2">
              {skills.map((sk) => (
                <Link key={sk.slug} href={`/skills?skill=${sk.slug}`} className="rounded-full border border-fg/20 px-4 py-2 text-sm font-medium transition-colors hover:border-cranberry hover:bg-cranberry hover:text-paper">
                  {sk.name} <span className="ml-1 text-stone">{sk._count.people}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ───────── WHAT'S HAPPENING ───────── */}
      <section className="bg-paper-2">
        <div className="container-x py-20 sm:py-28">
        <SectionHead index="06" eyebrow="What's happening" title="Come through." intro="Club meetings and Rotary-family events, each labelled with who's organising it." href="/events" hrefLabel="Full calendar" />
        <div className="grid gap-10 lg:grid-cols-12">
          {nextMeeting && (
            <aside className="lg:col-span-4">
              <div className="grain rounded-sm bg-royal p-7 text-paper">
                <p className="eyebrow text-paper/55">Every {s.meetingDay} · regular fellowship</p>
                <p className="mt-5 font-display text-6xl font-bold leading-none">{fmtDate(nextMeeting, { day: "2-digit" })}</p>
                <p className="mt-1 text-sm font-semibold uppercase tracking-widest text-paper/60">{fmtDate(nextMeeting, { weekday: "long", month: "long" })}</p>
                <p className="mt-6 text-lg font-semibold">{s.meetingTime} · {s.meetingVenue}</p>
                <p className="text-paper/65">{s.meetingAddress}</p>
                <p className="mt-6 font-serif text-paper/70">Visitors are welcome. Come early, introduce yourself and stay for fellowship.</p>
                <Link href="/get-involved?type=ATTEND" className="btn-primary mt-6 w-full">Tell us you're coming</Link>
              </div>
            </aside>
          )}
          <div className={nextMeeting ? "lg:col-span-8" : "lg:col-span-12"}>
            {upcoming.length ? (
              <div className="border-b border-line">{upcoming.map((e) => <EventRow key={e.slug} e={e} />)}</div>
            ) : (
              <Empty title="No special club events scheduled">Service days, trainings and socials appear here as soon as they're added. Until then, the weekly fellowship is the place to be.</Empty>
            )}
          </div>
        </div>
        </div>
      </section>

      {/* ───────── SUPPORT OUR WORK ───────── */}
      <section className="bg-cranberry text-paper">
        <div className="container-x py-20 sm:py-28">
          <div className="mb-12 grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <p className="eyebrow mb-4 flex items-center gap-3 text-paper/70"><span className="font-cond text-gold">07</span><span className="h-px w-8 bg-paper/30" aria-hidden />Support our work</p>
              <h2 className="text-4xl font-bold leading-[1.06] sm:text-5xl lg:text-6xl">There is a place for you in this.</h2>
            </div>
            <p className="max-w-sm font-serif text-lg leading-snug text-paper/85 md:col-span-4 md:justify-self-end md:text-right">Give an evening, a skill, a partnership or a gift. Every one of them moves a project forward.</p>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-sm bg-paper/25 sm:grid-cols-2 lg:grid-cols-3">
            {WAYS_IN.map((w) => {
              const href = w.key === "donate" ? (campaign ? `/campaigns/${campaign.slug}` : "/support#talk") : w.href;
              const body = w.key === "attend" ? `${s.meetingDay}s at ${s.meetingTime}, ${s.meetingVenue}. Visitors are welcome.` : w.key === "donate" && campaign ? `Our current appeal: ${campaign.title}.` : w.body;
              return (
                <li key={w.key} className="bg-cranberry">
                  <Link href={href} className="group flex h-full flex-col justify-between gap-8 p-7 transition-colors hover:bg-royal sm:p-8">
                    <div>
                      <h3 className="text-2xl font-bold">{w.title}</h3>
                      <p className="mt-2 font-serif text-lg leading-snug text-paper/85">{body}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold">{w.cta} <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-8 text-paper/85">Sponsor or donor? <Link href="/support" className="font-semibold text-paper underline underline-offset-4 hover:text-gold">See our track record and where support goes next</Link>.</p>
        </div>
      </section>

      {/* ───────── FROM KAMPALA NORTH ───────── */}
      <section className="container-x py-20 sm:py-28">
        <SectionHead index="08" eyebrow="From Kampala North" title="Stories from the club." intro="Posts from our socials, turned into a record that doesn't scroll away." href="/stories" hrefLabel="All stories" />
        {stories.length || socialPosts.length ? (
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((st) => <StoryCard key={st.slug} s={st} />)}
            {socialPosts.slice(0, Math.max(0, 3 - stories.length)).map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="group flex flex-col justify-between rounded-sm border border-line bg-white p-6 transition-colors hover:border-royal">
                <div>
                  <p className="eyebrow"><span className="text-cranberry">{humanize(p.platform)}</span>{p.postedAt && <> · {fmtDate(p.postedAt, { day: "numeric", month: "short", year: "numeric" })}</>}</p>
                  <p className="mt-4 font-serif text-xl leading-snug">{truncate(p.content, 220)}</p>
                </div>
                <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold">View original <ArrowUpRight className="size-4" aria-hidden /></span>
              </a>
            ))}
          </div>
        ) : (
          <Empty title="No stories yet">Admins can import a post from X or Instagram and publish it as a story.</Empty>
        )}
      </section>

      {/* ───────── DISTRICT CONNECTION ───────── */}
      <section className="bg-gold py-20 text-fg sm:py-28">
        <div className="container-x grid gap-14 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-4 text-fg"><span className="text-royal">09</span> · District connection</p>
            {nextVisit ? (
              <>
                <h2 className="text-4xl font-bold leading-tight sm:text-5xl">Next visit: {nextVisit.visitorTitle}</h2>
                <p className="mt-3 font-serif text-2xl text-fg">{nextVisit.visitorName}</p>
                <p className="mt-2 text-fg">{fmtDate(nextVisit.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}{nextVisit.startTime && ` · ${fmtTime(nextVisit.startTime)}`}{nextVisit.venue && ` · ${nextVisit.venue}`}</p>
                <div className="mt-8"><Countdown to={(nextVisit.startTime || nextVisit.date).toISOString()} /></div>
                <div className="mt-6 flex items-center gap-3"><StatusPill status={nextVisit.status} /><VerificationBadge v={nextVisit.verification} /></div>
              </>
            ) : (
              <>
                <h2 className="text-4xl font-bold leading-tight sm:text-5xl">Part of Rotary District 9213.</h2>
                <p className="mt-4 max-w-md font-serif text-xl text-fg">No District Governor or DRR visit is scheduled on the record right now. Confirmed visits appear here with a countdown.</p>
              </>
            )}
            <Link href="/district" className="btn-ink mt-10">District visits & archive</Link>
          </div>
          <div>
            <p className="eyebrow mb-4 text-fg">Coming up across the district</p>
            {districtEvents.length ? (
              <div className="border-b border-fg/20">{districtEvents.map((e) => <EventRow key={e.slug} e={e} onGold />)}</div>
            ) : (
              <Empty title="No district events listed" />
            )}
          </div>
        </div>
      </section>

      {/* ───────── JOIN ───────── */}
      <section className="border-t border-line bg-paper-2">
        <div className="container-x grid gap-10 py-20 sm:py-28 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-4"><span className="font-cond text-cranberry">10</span> · Join the movement</p>
            <h2 className="text-5xl font-bold leading-[1.06] sm:text-7xl">Pull up a chair on Friday.</h2>
            <p className="mt-6 max-w-xl font-serif text-xl text-stone">{s.joinIntro}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-5">
            <Link href="/get-involved?type=ATTEND" className="btn-ghost sm:col-span-2">Tell us you are coming</Link>
            <Link href="/get-involved?type=JOIN" className="btn-primary sm:col-span-2">Express interest in joining</Link>
            <p className="flex items-center gap-1.5 text-sm text-stone sm:col-span-2"><MapPin className="size-4" aria-hidden /> {s.meetingVenue}, {s.meetingAddress} · {s.meetingDay}s {s.meetingTime}</p>
          </div>
        </div>
      </section>
    </>
  );
}
