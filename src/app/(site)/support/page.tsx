import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getImpact, getSnapshot, publicProject } from "@/lib/queries";
import { getFocusCoverage, getOpenNeeds, getPartnerGroups, getTrackRecord } from "@/lib/donor";
import { mediaSrc } from "@/lib/media";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl, cn, fmtDate, fmtNumber, initials } from "@/lib/utils";
import { Img, Monogram } from "@/components/site/Img";
import { SectionHead } from "@/components/site/Section";
import { BeforeAfter } from "@/components/site/BeforeAfter";
import { getComparisons } from "@/lib/comparisons";
import { VerificationBadge } from "@/components/site/Badges";
import { PrintButton } from "@/components/site/PrintButton";
import { InquiryForm } from "../get-involved/InquiryForm";

export const metadata: Metadata = {
  title: "Support our work",
  description:
    "Why sponsors and donors back Rotaract Club Kampala North: twelve years of service, the Kakindu community project since 2015, every president and project year by year, and where support goes next.",
  alternates: { canonical: "/support" },
};

/** Coverage of the club's work by the media, as reported in the club's own posts. */
const COVERAGE = [
  { outlet: "Excel TV", what: "President Clare Umutesi Ahebwa on the malaria project", date: "September 2021", url: "https://x.com/kanosug/status/1442838578430717954" },
  { outlet: "Bukedde TV", what: "#KANOs4Kakindu, phase 4", date: "March 2024", url: "https://x.com/kanosug/status/1770365930331123895" },
  { outlet: "Parrots UG", what: "Launch of the Child to Family malaria programme", date: "March 2024", url: "https://x.com/kanosug/status/1769326299200245938" },
  { outlet: "UBC TV", what: "\"Building Communities\": milestones and future of #KANOs4Kakindu", date: "March 2025", url: "https://x.com/kanosug/status/1900419592414969885" },
  { outlet: "NBS TV", what: "#NBSImpactUganda: #KANOs4Kakindu phase 5", date: "March 2025", url: "https://x.com/kanosug/status/1905167362480808200" },
  { outlet: "Bukedde TV", what: "#KANOs4Kakindu, phase 6", date: "October 2025", url: "https://x.com/kanosug/status/1973275739538518275" },
];

/** Ways to help, each grounded in something a partner has already done with the club. */
const WAYS = [
  { title: "Fund a phase", body: "Back the next phase of a running project: the Kakindu multipurpose building, a medical camp, an immunisation day. We agree the scope and budget with you before you commit.", example: "The Rotary Club of Madras joined a US$35,000 global grant for digital literacy." },
  { title: "Give in kind", body: "Most project days run on donated goods and services: books, seedlings, medicines, sanitary towels, printing, transport, refreshments.", example: "Enjuba gave 1,050 books; Roofings Group gave tree seedlings; Qipads gave sanitary towels; Abacus Pharma gave malaria medication." },
  { title: "Sponsor a project day", body: "Put your brand beside real service. Sponsors are thanked on the day, on our banners and across our social channels.", example: "MovingAds Uganda was gold sponsor of I Am For Peace 2023." },
  { title: "Share your skills", body: "Doctors, nurses, engineers, teachers and trainers make the biggest difference on the ground and in our Friday sessions.", example: "Volunteer doctors run every medical camp; a member engineer drew the Kakindu building plans." },
];

function Stat({ value, label, note, href }: { value: string; label: string; note?: string; href?: string }) {
  const inner = (
    <>
      <p className="font-display text-4xl font-bold leading-none text-royal sm:text-5xl">{value}</p>
      <p className="mt-2 text-sm font-semibold leading-snug">{label}</p>
      {note && <p className="mt-1 text-xs text-stone">{note}</p>}
    </>
  );
  return href ? <Link href={href} className="block border-t-4 border-cranberry bg-white p-5 hover:bg-paper-2">{inner}</Link> : <div className="border-t-4 border-cranberry bg-white p-5">{inner}</div>;
}

export default async function SupportPage() {
  const [s, snap, impact, trackRecord, focus, partners, needs, flagship, achievements, presidentsCount, projectsList] = await Promise.all([
    getSettings(),
    getSnapshot(),
    getImpact(),
    getTrackRecord(),
    getFocusCoverage(),
    getPartnerGroups(),
    getOpenNeeds(),
    db.project.findFirst({
      where: { ...publicProject, featured: true },
      include: { cover: true, metrics: { orderBy: { sortOrder: "asc" } }, milestones: { orderBy: [{ date: "asc" }, { sortOrder: "asc" }], include: { image: true } }, _count: { select: { partners: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    db.achievement.findMany({ where: { publishStatus: "PUBLISHED" }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], include: { image: true, year: true } }),
    db.leadershipAssignment.count({ where: { role: { slug: "president" } } }),
    db.project.findMany({ where: { ...publicProject, status: { not: "COMPLETED" } }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  const pair = flagship ? (await getComparisons(flagship.id))[0] ?? null : null;
  const firstFlagship = flagship?.milestones.find((m) => m.date)?.date ?? flagship?.startDate ?? null;
  const flagshipSince = firstFlagship ? new Date(firstFlagship).getUTCFullYear() : null;
  const flagshipYears = flagshipSince ? new Date().getUTCFullYear() - flagshipSince : null;
  // Flagship milestones grouped by calendar year, for the "since 2015" strip.
  const byYear = new Map<number, { title: string }[]>();
  for (const m of flagship?.milestones || []) {
    if (!m.date) continue;
    const y = new Date(m.date).getUTCFullYear();
    byYear.set(y, [...(byYear.get(y) || []), { title: m.title }]);
  }
  // One photo per era of the flagship, so a sponsor sees the same community across the years.
  const withPhotos = (flagship?.milestones || []).filter((m) => m.date && m.image && !pair?.mediaIds.includes(m.image.id));
  const photoYears = [...new Set(withPhotos.map((m) => new Date(m.date!).getUTCFullYear()))];
  const pick = photoYears.length <= 3 ? photoYears : [photoYears[0], photoYears[Math.floor(photoYears.length / 2)], photoYears[photoYears.length - 1]];
  const strip = pick.map((y) => withPhotos.find((m) => new Date(m.date!).getUTCFullYear() === y)!).filter(Boolean);
  const impactShown = impact.filter((m) => m.key !== "members_2026" && !m.key.startsWith("members")).slice(0, 6);
  const otherNeeds = needs.filter((n) => n.id !== flagship?.id);
  const pct = (p: { fundingGoal: number | null; fundingRaised: number | null }) => (p.fundingGoal && p.fundingRaised != null ? Math.min(100, Math.round((p.fundingRaised / p.fundingGoal) * 100)) : null);
  const coveredAreas = focus.filter((f) => f.projects.length).length;

  return (
    <article className="support-pack">
      {/* ── Hero ── */}
      <section className="bg-royal text-paper">
        <div className="container-x grid gap-10 pb-14 pt-14 sm:pt-20 lg:grid-cols-12 lg:items-end lg:pb-20 print:grid-cols-12 print:items-end print:gap-6">
          <div className="lg:col-span-7 print:col-span-7">
            <p className="eyebrow rise mb-5 text-paper/70">Support our work · For sponsors, donors and partners</p>
            <h1 className="rise rise-2 text-[clamp(2.6rem,6vw,5.5rem)] font-bold leading-[1.03]">Back a club that keeps going back.</h1>
            <p className="rise rise-3 mt-7 max-w-2xl font-serif text-xl leading-relaxed text-paper/80">
              Since {snap.founded ? snap.founded.getUTCFullYear() : 2014}, the Rotaract Club of Kampala North has turned a Friday fellowship of young professionals into service that lasts.
              {flagshipSince ? ` We have returned to the same community in Mityana since ${flagshipSince}.` : ""} Below is what we have done, who led each year, and where your support would go next.
              Every fact on this page links back to the record.
            </p>
            <div className="rise rise-4 mt-9 flex flex-wrap gap-3 no-print">
              <a href="#talk" className="btn bg-gold text-fg hover:bg-paper">Talk to us about support <ArrowRight className="size-4" aria-hidden /></a>
              <a href="#needs" className="btn-ghost-light">See current needs</a>
              <PrintButton className="btn-ghost-light" label="Save as PDF" />
            </div>
          </div>
          {flagship?.cover && (
            <figure className="rise rise-3 lg:col-span-5 print:col-span-5">
              <div className="aspect-[4/3] overflow-hidden rounded-sm bg-azure">
                <Img media={flagship.cover} alt={flagship.title} priority sizes="(min-width:1024px) 40vw, 100vw" className="size-full" />
              </div>
              <figcaption className="mt-2 text-xs text-paper/60">{flagship.title}: {flagship.locationName}</figcaption>
            </figure>
          )}
        </div>
      </section>

      {/* ── At a glance ── */}
      <section className="border-b border-line bg-paper-2 py-12 print-avoid">
        <div className="container-x">
          <p className="eyebrow mb-6">At a glance</p>
          <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-6">
            {snap.yearsOfService != null && <Stat value={String(snap.yearsOfService)} label="years of service" note={snap.founded ? `Chartered ${fmtDate(snap.founded)}` : undefined} href="/about" />}
            {flagshipYears != null && flagship && <Stat value={`${flagshipYears}`} label={`years serving Kakindu`} note={`Since ${flagshipSince}`} href={`/projects/${flagship.slug}`} />}
            {snap.members ? <Stat value={fmtNumber(snap.members)} label="members" note={snap.membersFromRoll ? "District roll, 2026–27" : "Active members"} /> : null}
            <Stat value={String(presidentsCount)} label="presidents on record" note="Every one listed below" href="#record" />
            <Stat value={String(partners.total)} label="project partners" note="Named below" href="#partners" />
            <Stat value={`${coveredAreas} of 7`} label="Rotary areas of focus" note="Covered by our projects" href="#focus" />
          </div>
          {impactShown.length > 0 && (
            <>
              <p className="eyebrow mb-4 mt-10">Results on the record</p>
              <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-6">
                {impactShown.map((m) => (
                  <div key={m.key} className="bg-white p-5">
                    <p className="font-display text-3xl font-bold leading-none">
                      {m.unit === "USD" ? "US$" : ""}
                      {fmtNumber(m.value)}
                      {m.unit && m.unit !== "USD" && <span className="ml-1 text-base font-semibold text-stone">{m.unit}</span>}
                    </p>
                    <p className="mt-2 text-sm leading-snug">{m.label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-stone">Figures come from the club&apos;s own project records. Open a project to see the source for each one.</p>
            </>
          )}
        </div>
      </section>

      {/* ── Flagship ── */}
      {flagship && (
        <section className="container-x py-16 sm:py-24">
          <SectionHead index="01" eyebrow="Flagship project" title={flagship.title} intro={flagship.tagline || undefined} href={`/projects/${flagship.slug}`} hrefLabel="Read the full journey" />
          <div className="grid gap-12 lg:grid-cols-12 print:grid-cols-12 print:gap-8">
            <div className="lg:col-span-7 print:col-span-7">
              {pair ? (
                <BeforeAfter stages={pair.stages} alt={pair.title || flagship.title} caption={pair.caption} sourceUrl={pair.sourceUrl} />
              ) : (
                <div className="aspect-[16/10] overflow-hidden rounded-sm bg-royal"><Img media={flagship.cover} alt={flagship.title} className="size-full" /></div>
              )}
              <p className="mt-8 font-serif text-xl leading-relaxed text-charcoal">{flagship.summary}</p>
              {strip.length > 0 && (
                <ul className="mt-8 grid grid-cols-3 gap-3 print-avoid">
                  {strip.map((m) => (
                    <li key={m.id}>
                      <div className="aspect-[4/3] overflow-hidden rounded-sm bg-paper-2"><Img media={m.image} alt={m.title} size="md" sizes="(min-width: 1024px) 15vw, 33vw" className="size-full" /></div>
                      <p className="mt-1.5 font-cond text-sm font-bold text-royal">{new Date(m.date!).getUTCFullYear()}</p>
                      <p className="text-xs leading-snug text-stone">{m.title}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="lg:col-span-5 print:col-span-5 print:text-[0.85rem]">
              <p className="eyebrow mb-4 text-cranberry">{flagshipSince ? `Since ${flagshipSince}, year by year` : "Year by year"}</p>
              <ol className="border-l-2 border-royal">
                {[...byYear.entries()].map(([y, items]) => (
                  <li key={y} className="relative pb-5 pl-6 last:pb-0">
                    <span className="absolute -left-[7px] top-1.5 size-3 rounded-full border-2 border-royal bg-paper" aria-hidden />
                    <p className="font-cond text-sm font-bold text-royal">{y}</p>
                    <ul className="mt-1 space-y-0.5 text-[0.95rem] leading-snug">
                      {items.map((it) => <li key={it.title}>{it.title}</li>)}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      {/* ── Needs ── */}
      <section id="needs" className="scroll-mt-24 bg-royal py-16 text-paper sm:py-24">
        <div className="container-x">
          <SectionHead dark index="02" eyebrow="Where support goes next" title={<>What would help,<br />right now.</>} intro="Only real, current needs are listed, in the club's own words. Ask us for the budget behind any of them." />
          <div className="grid gap-8 lg:grid-cols-12 print:grid-cols-12 print:gap-6">
            {flagship?.supportNeeds && (
              <div className="rounded-sm bg-paper p-6 text-fg sm:p-10 lg:col-span-7 print:col-span-7 print:p-6 print-avoid">
                <p className="eyebrow mb-3 text-cranberry">{flagship.title}</p>
                <div className="prose-ed max-w-none text-[1.05rem] [&_strong]:text-fg" dangerouslySetInnerHTML={{ __html: renderMarkdown(flagship.supportNeeds) }} />
                <FundingBar p={flagship} pct={pct(flagship)} />
                <div className="mt-6 flex flex-wrap gap-3 no-print">
                  <a href="#talk" className="btn-primary">Support {flagship.title}</a>
                  <Link href={`/projects/${flagship.slug}`} className="btn-ghost">The full story</Link>
                </div>
              </div>
            )}
            <div className={cn("grid gap-6", flagship?.supportNeeds ? "lg:col-span-5 print:col-span-5" : "lg:col-span-12 lg:grid-cols-3 print:col-span-12 print:grid-cols-3")}>
              {otherNeeds.map((p) => (
                <div key={p.id} className="rounded-sm border border-paper/25 p-6 print-avoid">
                  <p className="font-display text-2xl font-bold">{p.title}</p>
                  {p.tagline && <p className="mt-1 text-sm text-paper/70">{p.tagline}</p>}
                  <div className="mt-4 font-serif text-[1.02rem] leading-relaxed text-paper/85 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.supportNeeds) }} />
                  <FundingBar p={p} pct={pct(p)} dark />
                  <Link href={`/projects/${p.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold no-print">
                    The project so far <ArrowUpRight className="size-4" aria-hidden />
                  </Link>
                </div>
              ))}
              {!otherNeeds.length && !flagship?.supportNeeds && <p className="font-serif text-lg text-paper/80">No open needs are listed right now. Get in touch and we&apos;ll tell you what&apos;s coming next.</p>}
            </div>
          </div>
        </div>
      </section>

      {/* ── Track record ── */}
      <section id="record" className="container-x scroll-mt-24 py-16 sm:py-24">
        <SectionHead index="03" eyebrow="Track record" title={<>Every year,<br />every president.</>} intro="The club's work year by year, from the record. Years marked for verification are still being confirmed with past members." href="/leadership/past-presidents" hrefLabel="All past presidents" />
        <div className="hidden grid-cols-[8rem_15rem_1fr_15rem] gap-6 border-b-2 border-fg pb-3 text-xs font-bold uppercase tracking-wider text-stone lg:grid print:grid print:grid-cols-[5rem_10rem_1fr_9rem] print:gap-3">
          <span>Rotary year</span><span>President</span><span>What the club did</span><span>Recognition</span>
        </div>
        <ol>
          {trackRecord.map(({ year, president, work, extra, awards }) => (
            <li key={year.id} className="grid gap-4 border-b border-line py-6 lg:grid-cols-[8rem_15rem_1fr_15rem] lg:gap-6 print:grid-cols-[5rem_10rem_1fr_9rem] print:gap-3 print:py-3 print:text-[0.8rem] print-avoid">
              <Link href={`/years/${year.slug}`} className="font-cond text-lg font-bold text-cranberry hover:underline">{year.label}</Link>
              <div className="flex items-start gap-3">
                <div className="size-16 shrink-0 overflow-hidden rounded-sm bg-paper-2 print:size-10">
                  {president ? <Img media={president.person.photo} alt={president.person.name} size="sm" sizes="4rem" className="size-full" fallback={<Monogram text={initials(president.person.name)} className="size-full [&_span]:text-xl" />} /> : null}
                </div>
                <div className="min-w-0">
                  {president ? (
                    <>
                      <Link href={`/people/${president.person.slug}`} className="font-display text-lg font-bold leading-tight hover:text-azure">{president.person.name}</Link>
                      <VerificationBadge v={president.verification} className="mt-1" />
                    </>
                  ) : (
                    <p className="font-serif italic text-stone">Not yet recorded</p>
                  )}
                </div>
              </div>
              <div>
                {work.length || extra.length ? (
                  <ul className="space-y-1.5">
                    {work.slice(0, 5).map((m) => (
                      <li key={m.id} className="flex gap-2 leading-snug">
                        <Check className="mt-1 size-3.5 shrink-0 text-grass" aria-hidden />
                        <span>
                          {m.title} <Link href={`/projects/${m.project.slug}`} className="text-sm text-stone hover:text-azure">· {m.project.title}</Link>
                        </span>
                      </li>
                    ))}
                    {extra.slice(0, Math.max(0, 5 - work.length)).map((e) => (
                      <li key={e.slug} className="flex gap-2 leading-snug">
                        <Check className="mt-1 size-3.5 shrink-0 text-grass" aria-hidden />
                        <Link href={`/events/${e.slug}`} className="hover:text-azure">{e.title}</Link>
                      </li>
                    ))}
                    {work.length + extra.length > 5 && <li className="pl-5 text-sm text-stone"><Link href={`/years/${year.slug}`} className="link-u">and {work.length + extra.length - 5} more</Link></li>}
                  </ul>
                ) : (
                  <p className="text-sm text-stone">No service records added for this year yet.</p>
                )}
              </div>
              <div>
                {awards.length ? (
                  <ul className="space-y-1.5 text-sm">
                    {awards.map((a) => <li key={a.id} className="font-semibold leading-snug">★ {a.title}</li>)}
                  </ul>
                ) : <span className="hidden text-sm text-stone-2 lg:inline print:inline">—</span>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Areas of focus ── */}
      <section id="focus" className="scroll-mt-24 bg-paper-2 py-16 sm:py-24">
        <div className="container-x">
          <SectionHead index="04" eyebrow="Rotary's areas of focus" title={<>Where the work<br />fits in Rotary.</>} intro="Rotary International funds and measures service against seven areas of focus. This is how the club's projects line up." />
          <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:text-[0.85rem] print-avoid">
            {focus.map((f) => (
              <li key={f.area} className={cn("bg-white p-6", !f.projects.length && "text-stone")}>
                <p className="font-display text-lg font-bold leading-tight">{f.area}</p>
                {f.projects.length ? (
                  <ul className="mt-3 space-y-1 text-sm">
                    {f.projects.map((p) => <li key={p.slug}><Link href={`/projects/${p.slug}`} className="link-u">{p.title}</Link></li>)}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm">Not yet. A good place for a new partnership.</p>
                )}
              </li>
            ))}
            <li className="flex flex-col justify-between bg-cranberry p-6 text-white">
              <p className="font-display text-lg font-bold leading-tight">Have a cause in mind?</p>
              <p className="mt-3 text-sm text-white/85">If your organisation funds one of these areas, we can plan a project around it with you.</p>
              <a href="#talk" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline no-print">Talk to us <ArrowRight className="size-4" aria-hidden /></a>
            </li>
          </ul>
        </div>
      </section>

      {/* ── Partners ── */}
      <section id="partners" className="container-x scroll-mt-24 py-16 sm:py-24">
        <SectionHead index="05" eyebrow="In good company" title={<>{partners.total} organisations<br />have worked with us.</>} intro="Every name below partnered on at least one project in the record." />
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-5 print:text-[0.75rem]">
          {partners.groups.map((g) => (
            <div key={g.label} className="print-avoid">
              <p className="eyebrow mb-3 text-cranberry">{g.label} · {g.orgs.length}</p>
              <ul className="space-y-2">
                {g.orgs.map((o) => (
                  <li key={o.name} className="leading-snug">
                    <span className="font-semibold">{o.name}</span>
                    <span className="block text-xs text-stone">{o.projects.map((p) => p.title).join(" · ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Recognition & accountability ── */}
      <section className="border-y border-line bg-paper-2 py-16 sm:py-24">
        <div className="container-x grid gap-14 lg:grid-cols-12 print:grid-cols-12 print:gap-8 print:text-[0.85rem]">
          <div className="lg:col-span-7 print:col-span-7">
            <SectionHead index="06" eyebrow="Recognition" title="Recognised by Rotary." className="md:grid-cols-1 [&>div]:md:col-span-12" />
            <ul className="divide-y divide-line border-y border-line">
              {achievements.map((a) => (
                <li key={a.id} className="grid grid-cols-[5.5rem_1fr] gap-4 py-4 print-avoid">
                  <span className="font-cond text-sm text-cranberry">{a.date ? fmtDate(a.date, { month: "short", year: "numeric" }) : a.year?.label}</span>
                  <div>
                    <p className="font-semibold leading-snug">{a.title}</p>
                    {a.description && <p className="mt-0.5 text-sm text-stone">{a.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-5 print:col-span-5">
            <p className="eyebrow mb-4">Accountability</p>
            <h2 className="text-3xl font-bold">How you can check us</h2>
            <ul className="mt-6 space-y-4 font-serif text-lg leading-snug">
              <li><strong className="font-display">A registered Rotaract club.</strong> {s.legalNote || `Rotaract club of ${s.district}.`} Chartered {s.charterDate ? fmtDate(s.charterDate) : "2014"}.</li>
              {s.sponsorNote && <li><strong className="font-display">Sponsored by Rotary.</strong> {s.sponsorNote}</li>}
              <li><strong className="font-display">Sourced, not claimed.</strong> Projects, presidents and awards on this site link to the club&apos;s own posts or district records. Anything not yet confirmed is marked for verification.</li>
              <li><strong className="font-display">Open books on request.</strong> Ask us for the budget, receipts and report for any project you&apos;re considering.</li>
              <li><strong className="font-display">We meet every week.</strong> {s.meetingDay}s at {s.meetingTime}, {s.meetingVenue}, {s.meetingAddress}. Come and meet the members.</li>
            </ul>
            <p className="eyebrow mb-3 mt-10">In the media</p>
            <ul className="space-y-2 text-sm">
              {COVERAGE.map((c) => (
                <li key={c.url}>
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="group inline-flex items-start gap-1.5">
                    <span><strong>{c.outlet}</strong>, {c.date}: <span className="link-u">{c.what}</span></span>
                    <ExternalLink className="mt-1 size-3 shrink-0 text-stone" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Ways to help + contact ── */}
      <section id="talk" className="container-x scroll-mt-24 py-16 sm:py-24">
        <SectionHead index="07" eyebrow="How to help" title={<>Four ways to<br />make it happen.</>} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 print-avoid">
          {WAYS.map((w, i) => (
            <div key={w.title} className="border-t-4 border-royal pt-5 print-avoid">
              <p className="font-cond text-sm font-bold text-cranberry">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-1 text-2xl font-bold">{w.title}</h3>
              <p className="mt-2 font-serif text-[1.05rem] leading-relaxed text-charcoal">{w.body}</p>
              <p className="mt-3 text-sm text-stone"><span className="font-semibold text-fg">Already done:</span> {w.example}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-12 print:mt-8">
          <div className="lg:col-span-5 print-avoid">
            <h2 className="text-4xl font-bold leading-tight">Let&apos;s talk.</h2>
            <p className="mt-4 font-serif text-xl leading-relaxed text-stone">
              Tell us what you&apos;d like to support and we&apos;ll come back with the plan, the budget and the people responsible.
            </p>
            {s.donationInstructions ? (
              <div className="mt-8 rounded-sm border-l-4 border-gold bg-gold/10 p-6">
                <p className="eyebrow mb-2">Ready to give</p>
                <div className="prose-ed max-w-none text-base" dangerouslySetInnerHTML={{ __html: renderMarkdown(s.donationInstructions) }} />
              </div>
            ) : (
              <p className="mt-8 rounded-sm border-l-4 border-gold bg-gold/10 p-6 text-sm">
                Payment details are shared directly by the club treasurer once a project and amount are agreed. Please don&apos;t send money to anyone who contacts you claiming to represent the club without going through this form.
              </p>
            )}
            {(s.email || s.phone) && (
              <p className="mt-6 text-sm">
                {s.email && <>Email <a href={`mailto:${s.email}`} className="link-u">{s.email}</a></>}
                {s.email && s.phone && " · "}
                {s.phone && <>Call {s.phone}</>}
              </p>
            )}
            <p className="mt-6 hidden text-sm print:block">Online: {absoluteUrl("/support")}</p>
          </div>
          <div className="lg:col-span-7 no-print">
            <div className="rounded-sm bg-paper-2 p-6 sm:p-10">
              <InquiryForm defaultType="SUPPORT_PROJECT" projects={projectsList} />
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}

function FundingBar({ p, pct, dark }: { p: { fundingGoal: number | null; fundingRaised: number | null; fundingCurrency: string | null }; pct: number | null; dark?: boolean }) {
  if (!p.fundingGoal) return null;
  const cur = p.fundingCurrency || "UGX";
  return (
    <div className="mt-6">
      <div className={cn("flex justify-between text-sm", dark ? "text-paper/80" : "text-stone")}>
        <span>{p.fundingRaised != null ? `${cur} ${fmtNumber(p.fundingRaised)} raised` : "Goal"}</span>
        <span className="font-semibold">{cur} {fmtNumber(p.fundingGoal)}</span>
      </div>
      {pct != null && (
        <div className={cn("mt-2 h-2 overflow-hidden rounded-full", dark ? "bg-paper/20" : "bg-fg/10")} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Funding progress">
          <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
