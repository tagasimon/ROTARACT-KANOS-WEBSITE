import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCurrentYear } from "@/lib/years";
import { getLeadershipForYear, getSnapshot, nextRegularMeeting, publicProject } from "@/lib/queries";
import { Img } from "@/components/site/Img";
import { JsonLd } from "@/components/site/JsonLd";
import { absoluteUrl, initials, truncate } from "@/lib/utils";
import { mediaSrc } from "@/lib/media";
import { campaignProgress, fmtMoneyShort, getFeaturedCampaign } from "@/lib/campaigns";

const TZ = "Africa/Kampala";
const kampalaDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const words = (n: number) => NUMBER_WORDS[n] ?? String(n);

/**
 * The homepage is an invitation: come on Friday. Everything else has its own page.
 * Hero with the Friday "ticket" → the current appeal → what we're working on → recognition → join.
 */
export default async function HomePage() {
  const [s, year, snap, campaign] = await Promise.all([getSettings(), getCurrentYear(), getSnapshot(), getFeaturedCampaign()]);
  const [heroMedia, projects, recognition, leaders] = await Promise.all([
    s.heroImageId ? db.media.findUnique({ where: { id: s.heroImageId } }) : null,
    db.project.findMany({
      where: publicProject,
      include: { cover: true, media: { where: { kind: "IMAGE" }, orderBy: { createdAt: "asc" }, take: 4 } },
      // what's happening now first, then the club's featured work
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      take: 12,
    }),
    db.achievement.findFirst({ where: { publishStatus: "PUBLISHED" }, orderBy: [{ featured: "desc" }, { date: "desc" }] }),
    year ? getLeadershipForYear(year.id) : Promise.resolve([]),
  ]);

  const live = ["IDEA", "PLANNING", "FUNDRAISING", "IMPLEMENTATION", "ONGOING"];
  const showcase = [...projects.filter((p) => live.includes(p.status) && p.cover), ...projects.filter((p) => !live.includes(p.status) && p.cover)].slice(0, 3);
  const heroSrc = mediaSrc(heroMedia, "xl");
  // Don't show the hero photo twice: a project whose cover is the hero uses its next photo.
  const sameAsHero = (m: { id: string } | null) => !!m && !!heroMedia && (m.id === heroMedia.id || mediaSrc(m as never, "sm") === mediaSrc(heroMedia, "sm"));
  const picture = (p: (typeof projects)[number]) => (sameAsHero(p.cover) ? p.media.find((m) => !sameAsHero(m)) ?? p.cover : p.cover);
  const meeting = nextRegularMeeting(s.meetingDay, s.meetingTime);
  const isToday = meeting && kampalaDay(meeting) === kampalaDay(new Date());
  const directions = s.meetingLat != null && s.meetingLng != null
    ? `https://www.google.com/maps/search/?api=1&query=${s.meetingLat},${s.meetingLng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.meetingVenue}, ${s.meetingAddress}`)}`;
  const foundedYear = snap.founded ? snap.founded.getUTCFullYear() : null;
  const record = [
    foundedYear && `Since ${foundedYear}`,
    snap.members ? `${snap.members} members` : null,
    snap.projects ? `${words(snap.projects)} projects` : null,
    snap.communities ? `${words(snap.communities)} communities` : null,
  ];
  const trackRecord =
    record[0] && record[1] && record[2] && record[3]
      ? `${record[0]}, the club has grown to ${record[1]} and taken on ${record[2]} across ${record[3]}.`
      : null;
  const team = leaders.slice(0, 3);
  const money = campaign ? campaignProgress(campaign) : null;

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

      {/* Hero: the headline, the club's photo in full colour, and a seat for Friday */}
      <section className="bg-paper">
        <div className="container-x grid gap-y-8 pb-14 pt-8 sm:pt-12 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:gap-x-12 xl:gap-y-0 xl:pb-20 xl:pt-14">
          <h1 className="rise max-w-5xl text-balance text-[clamp(2.75rem,6.2vw,5.5rem)] font-bold leading-[0.98] tracking-[-0.025em] xl:col-span-2">{s.heroHeadline}</h1>
          {(s.heroSubhead || s.description) && (
            <p className="rise rise-2 -mt-2 hidden max-w-2xl font-serif text-xl leading-relaxed text-charcoal sm:block xl:col-span-2 xl:mt-6">{s.heroSubhead || s.description}</p>
          )}

          <div className="rise rise-2 max-w-3xl xl:col-start-1 xl:row-span-2 xl:row-start-3 xl:mt-12 xl:max-w-none xl:self-start">
            {heroSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              // shown whole, at its own shape: club photos often carry text or a logo near the edges
              <img src={heroSrc} alt={heroMedia?.alt || ""} width={heroMedia?.width ?? undefined} height={heroMedia?.height ?? undefined} fetchPriority="high" className="h-auto w-full rounded-2xl" />
            ) : (
              <div className="aspect-[4/3] w-full rounded-2xl bg-paper-2 xl:aspect-square" aria-hidden />
            )}
          </div>

          {meeting && (
            <aside aria-labelledby="friday-title" className="ticket rise rise-3 flex w-full max-w-sm flex-col rounded-2xl bg-cranberry text-paper shadow-[0_24px_48px_-24px_rgb(0_0_0/0.45)] xl:col-start-2 xl:row-start-3 xl:mt-12 xl:max-w-md xl:self-start">
              <div className="flex-1 px-6 pb-7 pt-6">
                <p id="friday-title" className="text-base font-semibold text-paper/85">{isToday ? "Your seat tonight" : `Your seat this ${new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long" }).format(meeting)}`}</p>
                <div className="mt-1">
                  <p className="whitespace-nowrap font-display text-6xl font-bold leading-none tracking-tight">{new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" }).format(meeting)}</p>
                  <div className="mt-4">
                    <p className="text-xl font-bold leading-tight">{s.meetingTime}</p>
                    <p className="text-lg leading-snug">{s.meetingVenue}, {s.meetingAddress}</p>
                    <a href={directions} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-paper/90 underline underline-offset-4 hover:no-underline">
                      <MapPin className="size-4" aria-hidden /> Get directions
                    </a>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-paper/80">Visitors are welcome. Come a little early and stay for fellowship.</p>
              </div>
              <div className="flex h-[5.25rem] shrink-0 items-center border-t-2 border-dashed border-paper/45 px-6">
                <Link href="/get-involved?type=ATTEND" className="btn w-full bg-paper text-base text-cranberry hover:bg-gold hover:text-fg">Tell us you&rsquo;re coming</Link>
              </div>
            </aside>
          )}

          <p className="rise rise-4 text-base text-charcoal xl:col-start-2 xl:row-start-4 xl:mt-5">
            New here? <Link href="/projects" className="link-u font-semibold text-fg">See our projects</Link> or <Link href="/get-involved?type=JOIN" className="link-u font-semibold text-fg">ask about joining</Link>.
          </p>
        </div>
      </section>

      {/* The club's current appeal: one strip, not a whole screen */}
      {campaign && (
        <section aria-labelledby="appeal-title" className="bg-gold text-fg">
          <div className="container-x flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between md:gap-10">
            <div className="flex max-w-3xl items-start gap-5">
              {campaign.image && <Img media={campaign.image} size="sm" sizes="80px" className="hidden size-20 shrink-0 rounded-full sm:block" />}
              <div>
                <h2 id="appeal-title" className="text-2xl font-bold leading-tight">{campaign.tagline || campaign.title}</h2>
                {campaign.summary && <p className="mt-2 text-base leading-relaxed">{campaign.summary}</p>}
                {money?.percent != null && money.raised != null && money.goal != null && (
                  <div className="mt-3 max-w-md">
                    <div className="h-2 overflow-hidden rounded-full bg-fg/15" role="progressbar" aria-valuenow={money.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Raised so far">
                      <div className="h-full rounded-full bg-royal" style={{ width: `${money.percent}%` }} />
                    </div>
                    <p className="mt-1.5 text-sm font-semibold">{fmtMoneyShort(money.raised, campaign.currency)} raised of {fmtMoneyShort(money.goal, campaign.currency)}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-4">
              {campaign.donateUrl && (
                <a href={campaign.donateUrl} target="_blank" rel="noopener noreferrer" className="btn bg-royal px-6 text-base text-paper hover:bg-fg">
                  {campaign.donateLabel || "Donate"} <ArrowUpRight className="size-4" aria-hidden />
                </a>
              )}
              <Link href={`/campaigns/${campaign.slug}`} className="font-semibold underline underline-offset-4 hover:no-underline">Read his story</Link>
            </div>
          </div>
        </section>
      )}

      {/* What we're working on */}
      {showcase.length > 0 && (
        <section aria-labelledby="work-title" className="container-x py-20 sm:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h2 id="work-title" className="text-[clamp(2.25rem,4.6vw,3.75rem)] font-bold leading-[1.02] tracking-tight">What we&rsquo;re working on</h2>
              {trackRecord && <p className="mt-4 font-serif text-xl leading-relaxed text-charcoal">{trackRecord}</p>}
            </div>
            <Link href="/projects" className="link-u text-base font-semibold">All projects</Link>
          </div>
          <ul className="scrollbar-none -mx-4 mt-10 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:mt-12 sm:scroll-px-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0" aria-label="Projects">
            {showcase.map((p, i) => (
              <li key={p.id} className="w-[78%] shrink-0 snap-start md:w-auto">
                <Link href={`/projects/${p.slug}`} className="group block">
                  <Img media={picture(p)} size="lg" sizes="(min-width:768px) 33vw, 100vw" className="aspect-[4/5] w-full rounded-xl bg-paper-2" priority={i === 0} />
                  <h3 className="mt-5 text-2xl font-bold leading-tight group-hover:text-cranberry">{p.title}</h3>
                  {p.locationName && <p className="mt-1 text-sm font-semibold text-stone">{p.locationName}</p>}
                  {(p.tagline || p.summary) && <p className="mt-3 font-serif text-lg leading-relaxed text-charcoal">{truncate(p.tagline || p.summary || "", 120)}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* One piece of recognition, and who leads the club this year */}
      {(recognition || team.length > 0) && (
        <section aria-label="Recognition and leadership" className="bg-paper-2">
          <div className="container-x grid gap-14 py-20 sm:py-24 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end lg:gap-20">
            {recognition && (
              <div>
                <p className="font-serif text-[clamp(1.9rem,3.8vw,3.4rem)] leading-[1.15] text-balance text-fg">{recognition.title}</p>
                {recognition.description && <p className="mt-6 max-w-2xl text-base leading-relaxed text-charcoal">{truncate(recognition.description, 160)}</p>}
                <Link href="/achievements" className="mt-6 inline-block font-semibold text-cranberry underline-offset-4 hover:underline">More of what the club has achieved</Link>
              </div>
            )}
            {team.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-charcoal">Leading the club{year ? ` in ${year.label}` : ""}</h2>
                <ul className="mt-4 divide-y divide-line border-y border-line">
                  {team.map((l) => (
                    <li key={l.id}>
                      <Link href={`/people/${l.person.slug}`} className="group flex items-center gap-4 py-3.5">
                        <Img
                          media={l.person.photo}
                          size="sm"
                          sizes="48px"
                          className="size-12 shrink-0 rounded-full"
                          fallback={<span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-paper text-sm font-bold text-charcoal" aria-hidden>{initials(l.person.name)}</span>}
                        />
                        <span>
                          <span className="block font-semibold group-hover:underline">{l.person.name}</span>
                          <span className="block text-sm text-charcoal">{l.customTitle || l.role.title}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/people" className="mt-4 inline-block font-semibold text-cranberry underline-offset-4 hover:underline">Meet the members</Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Join */}
      <section aria-labelledby="join-title" className="container-x py-20 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end lg:gap-20">
          <div>
            <h2 id="join-title" className="text-[clamp(2.5rem,5.4vw,4.75rem)] font-bold leading-[0.98] tracking-tight">Pull up a chair on {s.meetingDay ? s.meetingDay.charAt(0).toUpperCase() + s.meetingDay.slice(1).toLowerCase() : "Friday"}.</h2>
            <p className="mt-6 max-w-xl font-serif text-xl leading-relaxed text-charcoal">
              Joining starts with a visit, not a form. Come as a guest, meet the club, and we&rsquo;ll walk you through membership. Young professionals aged 18 and over are welcome.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/get-involved?type=ATTEND" className="btn-primary px-6 text-base">Tell us you&rsquo;re coming</Link>
              <Link href="/get-involved?type=JOIN" className="btn-ghost px-6 text-base">Ask about joining</Link>
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone">Other ways to help</h3>
            <ul className="mt-3 divide-y divide-line border-y border-line text-lg font-semibold">
              {[
                { href: "/get-involved?type=VOLUNTEER", label: "Volunteer on a project day" },
                { href: "/get-involved?type=PARTNER", label: "Partner with the club" },
                { href: "/support", label: "Sponsor a project" },
                campaign ? { href: `/campaigns/${campaign.slug}`, label: `Give to ${campaign.title}` } : { href: "/support#talk", label: "Donate" },
              ].map((w) => (
                <li key={w.href}>
                  <Link href={w.href} className="flex items-center justify-between gap-4 py-3.5 hover:text-cranberry">
                    {w.label} <ArrowUpRight className="size-5 shrink-0 text-stone" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
