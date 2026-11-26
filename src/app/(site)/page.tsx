import Link from "next/link";
import { MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCurrentYear } from "@/lib/years";
import { getLeadershipForYear, getSnapshot, nextRegularMeeting, publicProject } from "@/lib/queries";
import { Img } from "@/components/site/Img";
import { JsonLd } from "@/components/site/JsonLd";
import { absoluteUrl, cn, initials, truncate } from "@/lib/utils";
import { mediaSrc, mediaSrcSet } from "@/lib/media";
import { campaignProgress, fmtMoneyShort, getFeaturedCampaign } from "@/lib/campaigns";
import { MEETING } from "@/lib/meeting/config";

const TZ = "Africa/Kampala";
const kampalaDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...o }).format(d);
const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const words = (n: number) => NUMBER_WORDS[n] ?? String(n);
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Small gold label above a heading. */
function Eyebrow({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return <p className={cn("text-[0.72rem] font-bold uppercase tracking-[0.2em]", dark ? "text-gold" : "text-gold-deep")}>{children}</p>;
}

/** Quiet "MORE ABOUT US ——" link. */
function MoreLink({ href, children, dark }: { href: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-3 text-[0.76rem] font-bold uppercase tracking-[0.16em]", dark ? "text-cream" : "text-heading")}>
      {children}
      <span className="h-px w-8 bg-current transition-[width] duration-300 group-hover:w-12" aria-hidden />
    </Link>
  );
}

export default async function HomePage() {
  const [s, year, snap, campaign] = await Promise.all([getSettings(), getCurrentYear(), getSnapshot(), getFeaturedCampaign()]);
  const [heroMedia, aboutMedia, joinMedia, projects, recognition, leaders] = await Promise.all([
    s.heroImageId ? db.media.findUnique({ where: { id: s.heroImageId } }) : null,
    s.homeAboutImageId ? db.media.findUnique({ where: { id: s.homeAboutImageId } }) : null,
    s.homeJoinImageId ? db.media.findUnique({ where: { id: s.homeJoinImageId } }) : null,
    db.project.findMany({
      where: publicProject,
      include: { cover: true, media: { where: { kind: "IMAGE" }, orderBy: { createdAt: "asc" }, take: 4 } },
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      take: 12,
    }),
    db.achievement.findFirst({ where: { publishStatus: "PUBLISHED" }, orderBy: [{ featured: "desc" }, { date: "desc" }] }),
    year ? getLeadershipForYear(year.id) : Promise.resolve([]),
  ]);

  // Projects: what's happening now first; never repeat a photo already used higher up the page.
  const used = new Set([heroMedia, aboutMedia].filter(Boolean).map((m) => mediaSrc(m!, "sm")));
  const fresh = (m: { id: string } | null) => !!m && !used.has(mediaSrc(m as never, "sm"));
  const live = ["IDEA", "PLANNING", "FUNDRAISING", "IMPLEMENTATION", "ONGOING"];
  const showcase = [...projects.filter((p) => live.includes(p.status)), ...projects.filter((p) => !live.includes(p.status))]
    .filter((p) => p.cover || p.media.length)
    .slice(0, 3)
    .map((p) => ({ ...p, picture: fresh(p.cover) ? p.cover : p.media.find(fresh) ?? p.cover }));

  const heroSrc = mediaSrc(heroMedia, "xl");
  const aboutSrc = mediaSrc(aboutMedia, "lg");
  const joinSrc = mediaSrc(joinMedia, "lg");
  const meeting = nextRegularMeeting(s.meetingDay, s.meetingTime);
  const isToday = meeting && kampalaDay(meeting) === kampalaDay(new Date());
  const meetingDay = capital((s.meetingDay || "Friday").toLowerCase());
  const directions =
    s.meetingLat != null && s.meetingLng != null
      ? `https://www.google.com/maps/search/?api=1&query=${s.meetingLat},${s.meetingLng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.meetingVenue}, ${s.meetingAddress}`)}`;
  const president = leaders.find((l) => l.role.slug === "president");
  const team = leaders.slice(0, 6);
  const money = campaign ? campaignProgress(campaign) : null;
  const facts = [
    snap.founded ? `Chartered on ${fmt(snap.founded, { day: "numeric", month: "long", year: "numeric" })} in Rotary District ${MEETING.DISTRICT} (Rotary International club ID ${MEETING.CLUB_ID}).` : null,
    snap.members ? `${snap.members} active members${president && year ? `, led in ${year.label} by President ${president.person.name}` : ""}.` : null,
  ].filter(Boolean).join(" ");
  const projectsTitle =
    snap.projects && snap.communities ? `${capital(words(snap.projects))} projects across ${words(snap.communities)} communities` : "What we're working on";

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

      {/* ── Hero: dark, the photo on the right (on top on phones), a serif headline ── */}
      <section className="relative isolate overflow-hidden bg-ink text-cream">
        {heroSrc && (
          <div className="relative h-[44svh] min-h-64 lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[60%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroSrc}
              srcSet={heroMedia ? mediaSrcSet(heroMedia) : undefined}
              sizes="(min-width:1024px) 60vw, 100vw"
              alt={heroMedia?.alt || ""}
              fetchPriority="high"
              className="size-full object-cover object-[40%_center]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/5 to-transparent lg:bg-gradient-to-r lg:from-ink lg:via-ink/30 lg:to-transparent" aria-hidden />
          </div>
        )}
        <div className="container-x relative">
          <div className="flex max-w-xl flex-col justify-center pb-12 pt-8 lg:min-h-[min(calc(100svh-9rem),720px)] lg:max-w-[33rem] lg:py-24 xl:max-w-[36rem]">
            <div className="rise">
              <Eyebrow dark>Rotaract club · Kampala, Uganda</Eyebrow>
            </div>
            <h1 className="rise rise-2 mt-5 text-balance font-serif text-[clamp(2.6rem,5.4vw,4.75rem)] font-normal leading-[1.04] tracking-[-0.02em] text-cream">{s.heroHeadline}</h1>
            {(s.heroSubhead || s.description) && (
              <p className="rise rise-3 mt-7 font-serif text-lg leading-[1.7] text-cream/80 sm:text-xl">{s.heroSubhead || s.description}</p>
            )}
            <nav aria-label="Get started" className="rise rise-4 mt-10 flex flex-wrap gap-x-9 gap-y-5">
              {[
                { k: "Visit", v: meeting ? (isToday ? "Tonight" : `${meetingDay} ${fmt(meeting, { day: "numeric", month: "short" })}`) : `This ${meetingDay}`, href: "/get-involved?type=ATTEND" },
                { k: "See", v: "Our projects", href: "/projects" },
                { k: "Join", v: "The club", href: "/get-involved?type=JOIN" },
              ].map((l) => (
                <Link key={l.k} href={l.href} className="group border-b border-cream/30 pb-2 transition-colors hover:border-gold">
                  <span className="mr-2.5 text-[0.66rem] font-bold uppercase tracking-[0.2em] text-gold">{l.k}</span>
                  <span className="font-serif text-lg text-cream">{l.v}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <div className="relative border-t border-cream/15 bg-ink/70 backdrop-blur-sm">
          <div className="container-x flex flex-wrap items-center justify-between gap-x-10 gap-y-2 py-5 text-[0.68rem] font-bold uppercase tracking-[0.2em]">
            <span className="text-gold">Service above self</span>
            <span className="text-cream/70">{s.meetingVenue}, {s.meetingAddress}</span>
            <span className="text-cream/70">{meetingDay}s, {s.meetingTime}</span>
          </div>
        </div>
      </section>

      {/* ── The club's current appeal ── */}
      {campaign && (
        <section aria-labelledby="appeal-title" className="bg-cream">
          <div className="container-x pt-14 sm:pt-20">
            <div className="grid gap-7 border-l-4 border-gold bg-sand px-6 py-8 sm:px-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-12">
              <div>
                <Eyebrow>One of our own needs us</Eyebrow>
                <h2 id="appeal-title" className="mt-3 font-serif text-2xl leading-snug text-heading sm:text-[1.9rem]">{campaign.tagline || campaign.title}</h2>
                {campaign.summary && <p className="mt-3 max-w-2xl text-base leading-relaxed text-charcoal">{campaign.summary}</p>}
                {money?.percent != null && money.raised != null && money.goal != null && (
                  <div className="mt-4 max-w-md">
                    <div className="h-1.5 overflow-hidden bg-heading/10" role="progressbar" aria-valuenow={money.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Raised so far">
                      <div className="h-full bg-gold" style={{ width: `${money.percent}%` }} />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-heading">{fmtMoneyShort(money.raised, campaign.currency)} raised of {fmtMoneyShort(money.goal, campaign.currency)}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-6">
                {campaign.donateUrl && (
                  <a href={campaign.donateUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center bg-gold px-6 text-[0.76rem] font-bold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-heading hover:text-cream">
                    {campaign.donateLabel || "Donate"}
                  </a>
                )}
                <MoreLink href={`/campaigns/${campaign.slug}`}>Read his story</MoreLink>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Who we are ── */}
      <section aria-labelledby="about-title" className="bg-cream">
        <div className={cn("container-x grid gap-12 pb-20 sm:pb-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-20", campaign ? "pt-16 sm:pt-24" : "pt-20 sm:pt-28")}>
          {aboutSrc && (
            <Img media={aboutMedia} size="lg" sizes="(min-width:1024px) 40vw, 100vw" className="aspect-[4/5] w-full max-w-md object-cover lg:max-w-none" />
          )}
          <div className={cn(!aboutSrc && "lg:col-span-2 lg:max-w-3xl")}>
            <Eyebrow>Who we are</Eyebrow>
            <h2 id="about-title" className="mt-4 text-balance font-serif text-[clamp(2.2rem,4vw,3.4rem)] leading-[1.08] tracking-[-0.015em] text-heading">Young professionals, serving Kampala together</h2>
            {s.description && <p className="mt-6 font-serif text-xl leading-[1.65] text-heading/90">{s.description}</p>}
            {facts && <p className="mt-5 text-base leading-relaxed text-charcoal">{facts}</p>}
            <div className="mt-9">
              <MoreLink href="/about">More about the club</MoreLink>
            </div>
          </div>
        </div>
      </section>

      {/* ── Projects ── */}
      {showcase.length > 0 && (
        <section aria-labelledby="work-title" className="bg-sand">
          <div className="container-x py-20 sm:py-28">
            <Eyebrow>Our projects</Eyebrow>
            <h2 id="work-title" className="mt-4 max-w-3xl text-balance font-serif text-[clamp(2.2rem,4vw,3.4rem)] leading-[1.08] tracking-[-0.015em] text-heading">{projectsTitle}</h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-charcoal">Three of the projects the club is working on. Each one has its own page with the full story and photos.</p>
            <ul aria-label="Projects" className="scrollbar-none -mx-4 mt-12 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-0 md:overflow-visible md:border md:border-heading/15 md:px-0">
              {showcase.map((p, i) => (
                <li key={p.id} className="w-[82%] shrink-0 snap-start border border-heading/15 bg-cream/60 md:w-auto md:border-0 md:bg-transparent md:[&:not(:last-child)]:border-r md:[&:not(:last-child)]:border-heading/15">
                  <Link href={`/projects/${p.slug}`} className="group flex h-full flex-col">
                    <Img media={p.picture} size="lg" sizes="(min-width:768px) 33vw, 85vw" className="aspect-[3/2] w-full" priority={i === 0} />
                    <div className="flex flex-1 flex-col p-6 sm:p-8">
                      <h3 className="font-serif text-[1.6rem] leading-tight text-heading group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">{p.title}</h3>
                      {(p.tagline || p.summary) && <p className="mt-3 text-[0.95rem] leading-relaxed text-charcoal">{truncate(p.tagline || p.summary || "", 140)}</p>}
                      {p.locationName && (
                        <div className="mt-auto pt-6">
                          <p className="border-t border-heading/15 pt-4 text-sm font-semibold text-heading">{p.locationName}</p>
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <MoreLink href="/projects">All projects</MoreLink>
            </div>
          </div>
        </section>
      )}

      {/* ── One piece of recognition ── */}
      {recognition && (
        <section aria-label="Recognition" className="bg-cream">
          <div className="container-x py-20 text-center sm:py-28">
            <p className="mx-auto max-w-4xl text-balance font-serif text-[clamp(1.75rem,3.4vw,2.9rem)] leading-[1.22] text-heading">{recognition.title}</p>
            <span className="mx-auto mt-9 block h-px w-16 bg-gold" aria-hidden />
            {recognition.description && <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-charcoal">{truncate(recognition.description, 160)}</p>}
            <div className="mt-8">
              <MoreLink href="/achievements">What the club has achieved</MoreLink>
            </div>
          </div>
        </section>
      )}

      {/* ── Who leads the club ── */}
      {team.length > 0 && (
        <section aria-labelledby="people-title" className="bg-sand">
          <div className="container-x py-20 sm:py-28">
            <Eyebrow>Our people</Eyebrow>
            <h2 id="people-title" className="mt-4 font-serif text-[clamp(2.2rem,4vw,3.4rem)] leading-[1.08] tracking-[-0.015em] text-heading">Who leads the club</h2>
            {year && <p className="mt-5 max-w-2xl text-base leading-relaxed text-charcoal">The {year.label} leadership team{snap.members ? `, for a club of ${snap.members} members` : ""}.</p>}
            <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((l) => (
                <li key={l.id} className="border-t-2 border-heading pt-5">
                  <Link href={`/people/${l.person.slug}`} className="group flex items-center gap-4">
                    <Img
                      media={l.person.photo}
                      size="sm"
                      sizes="56px"
                      className="size-14 shrink-0 rounded-full"
                      fallback={<span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-cream text-sm font-bold text-heading" aria-hidden>{initials(l.person.name)}</span>}
                    />
                    <span>
                      <span className="block font-serif text-xl leading-snug text-heading group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">{l.person.name}</span>
                      <span className="mt-0.5 block text-sm font-semibold text-gold-deep">{l.customTitle || l.role.title}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-12">
              <MoreLink href="/people">Meet the members</MoreLink>
            </div>
          </div>
        </section>
      )}

      {/* ── Join us ── */}
      <section aria-labelledby="join-title" className="relative isolate overflow-hidden bg-ink text-cream">
        {joinSrc && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={joinSrc} alt="" loading="lazy" className="absolute inset-0 -z-10 size-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-ink/70 lg:bg-gradient-to-r lg:from-ink lg:via-ink/70 lg:to-ink/15" aria-hidden />
          </>
        )}
        <div className="container-x py-24 sm:py-32">
          <div className="max-w-2xl">
            <Eyebrow dark>Join us</Eyebrow>
            <h2 id="join-title" className="mt-4 font-serif text-[clamp(2.5rem,5vw,4.25rem)] leading-[1.05] tracking-[-0.015em] text-cream">Pull up a chair on {meetingDay}.</h2>
            <p className="mt-6 text-lg leading-relaxed text-cream/80">
              Visitors are welcome at every fellowship: {meetingDay}s at {s.meetingTime}, {s.meetingVenue}, {s.meetingAddress}.
              {meeting && !isToday && <> The next one is on {fmt(meeting, { weekday: "long", day: "numeric", month: "long" })}.</>}
              {" "}Joining starts with a visit, not a form. Young professionals aged 18 and over are welcome.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/get-involved?type=ATTEND" className="inline-flex min-h-12 items-center bg-gold px-6 text-[0.76rem] font-bold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-cream">Tell us you&rsquo;re coming</Link>
              <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 border border-cream/40 px-6 text-[0.76rem] font-bold uppercase tracking-[0.16em] text-cream transition-colors hover:border-cream">
                <MapPin className="size-4" aria-hidden /> Get directions
              </a>
            </div>
            <p className="mt-10 text-sm leading-relaxed text-cream/70">
              Other ways to help:{" "}
              <Link href="/get-involved?type=VOLUNTEER" className="text-cream underline decoration-cream/40 underline-offset-4 hover:decoration-cream">volunteer on a project day</Link>,{" "}
              <Link href="/get-involved?type=PARTNER" className="text-cream underline decoration-cream/40 underline-offset-4 hover:decoration-cream">partner with the club</Link>
              {campaign ? ", " : " or "}
              <Link href="/support" className="text-cream underline decoration-cream/40 underline-offset-4 hover:decoration-cream">sponsor a project</Link>
              {campaign && (
                <>
                  {" "}or <Link href={`/campaigns/${campaign.slug}`} className="text-cream underline decoration-cream/40 underline-offset-4 hover:decoration-cream">give to {campaign.title}</Link>
                </>
              )}
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
