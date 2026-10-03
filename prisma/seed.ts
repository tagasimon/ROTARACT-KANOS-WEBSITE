/**
 * Seed: structure (roles, committees, skills, years, organizations) + researched
 * public content from prisma/seed-data/research.json.
 *
 * Rules followed:
 *  - nothing invented; every researched record keeps source/sourceUrl/discoveredAt
 *  - unclear facts are stored with verification NEEDS_VERIFICATION or CONFLICTING
 *  - no private contact details of individuals are imported
 *  - idempotent: safe to run more than once (upserts by slug / unique keys)
 */
import { PrismaClient, type EventType, type Verification, type Prisma } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const R = JSON.parse(fs.readFileSync(path.join(__dirname, "seed-data/research.json"), "utf8"));
const DISCOVERED = new Date(R.generated_at || "2026-10-03T00:00:00Z");

const slugify = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const v = (s?: string): Verification => (s === "verified" ? "VERIFIED" : "NEEDS_VERIFICATION");
const prov = (url: string | undefined | null, source: string, ver: Verification = "NEEDS_VERIFICATION") => ({
  source,
  sourceUrl: url || null,
  sourceType: url?.includes("instagram") ? "CLUB_SOCIAL" : url?.includes("rotaryo") ? "ROTARYO" : url?.match(/rotar(y|act)d9213/) ? "DISTRICT" : "PUBLIC_WEB",
  discoveredAt: DISCOVERED,
  lastCheckedAt: DISCOVERED,
  verification: ver,
});
const sourceName = (url?: string | null) => {
  if (!url) return "Public research";
  if (url.includes("rotaractd9213.org")) return "Rotaract District 9213";
  if (url.includes("rotaryd9213.org")) return "Rotary District 9213";
  if (url.includes("instagram.com")) return "Club Instagram (@kanosug)";
  if (url.includes("rotaryo.org")) return "Rotary-O";
  if (url.includes("kiu.ac.ug")) return "KIU News";
  return new URL(url).hostname;
};

/** Parse "2026-10-30 to 2026-11-01", "2022-01 (…)", "2016-11-25 (…)". */
function parseDates(s?: string | null) {
  if (!s) return null;
  const full = [...s.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)].map((m) => new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 0, 0)));
  if (full.length) return { start: full[0], end: full[1] ?? null, exact: true, label: null as string | null };
  const ym = s.match(/(\d{4})-(\d{2})/);
  if (ym) {
    const d = new Date(Date.UTC(+ym[1], +ym[2] - 1, 1));
    return { start: d, end: null, exact: false, label: d.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }) };
  }
  return null;
}

function rotaryYearOf(d: Date) {
  const y = d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return `${y}-${y + 1}`;
}

async function main() {
  console.log("Seeding…");

  // ── Site settings ──
  const club = R.club;
  await db.siteSetting.upsert({
    where: { key: "site" },
    update: {},
    create: {
      key: "site",
      value: {
        clubName: "Rotaract Club Kampala North",
        shortName: "Kampala North",
        legalNote: `Listed by Rotary International as "${club.official_name_ri}" (club ID ${club.ri_club_id}), ${club.district}.`,
        heroHeadline: "Young leaders, showing up for Kampala since 2014.",
        heroSubhead:
          "A community Rotaract club of young professionals in Rotary District 9213. We meet every Friday to serve, to learn from each other and to build friendships that outlast a term of office.",
        description:
          "A community Rotaract club of young professionals in Kampala, chartered on 1 December 2014 and part of Rotary District 9213.",
        charterDate: club.charter_date,
        charterVerified: club.charter_date_verification === "verified",
        district: "Rotary District 9213",
        riClubId: String(club.ri_club_id),
        meetingDay: "Friday",
        meetingTime: "6:00 PM",
        meetingVenue: "Hotel Triangle",
        meetingAddress: "Buganda Road, Kampala",
        meetingLat: 0.3205,
        meetingLng: 32.5735,
        meetingVerified: true,
        email: "",
        socials: { x: club.handles.x, instagram: club.handles.instagram, facebook: club.handles.facebook, linkedin: "", youtube: "", tiktok: "" },
        sponsorNote: club.sponsor_note,
      } satisfies Prisma.InputJsonValue,
    },
  });

  // ── Rotaract years: one per Rotary year from charter to next year ──
  const nowYear = new Date().getUTCMonth() >= 6 ? new Date().getUTCFullYear() : new Date().getUTCFullYear() - 1;
  const years: Record<string, string> = {};
  for (let y = 2014; y <= nowYear; y++) {
    const slug = `${y}-${y + 1}`;
    const yr = await db.rotaractYear.upsert({
      where: { slug },
      update: { isCurrent: y === nowYear },
      create: { slug, label: `${y}–${y + 1}`, startDate: new Date(Date.UTC(y, 6, 1)), endDate: new Date(Date.UTC(y + 1, 5, 30, 23, 59, 59)), isCurrent: y === nowYear },
    });
    years[slug] = yr.id;
  }
  const ry26 = R.rotaract_years.find((y: { label: string }) => y.label === "2026-2027");
  if (ry26?.district_theme && years["2026-2027"]) {
    await db.rotaractYear.update({ where: { id: years["2026-2027"] }, data: { riTheme: null, summary: `District theme: ${ry26.district_theme} (Rotaract District 9213).` } });
  }

  // ── Leadership roles (standard Rotaract board; admins can rename/add club-specific roles) ──
  const roles = [
    ["President", "BOARD", 1], ["Vice President", "BOARD", 2], ["President-Elect", "BOARD", 3], ["Immediate Past President", "BOARD", 4],
    ["Secretary", "BOARD", 5], ["Executive Secretary / Director", "BOARD", 6], ["Treasurer", "BOARD", 7], ["Sergeant-at-Arms", "BOARD", 8],
    ["Club Service Director", "COMMITTEE_CHAIR", 20], ["Community Service Director", "COMMITTEE_CHAIR", 21], ["Professional Development Director", "COMMITTEE_CHAIR", 22],
    ["International Service Director", "COMMITTEE_CHAIR", 23], ["Public Image Director", "COMMITTEE_CHAIR", 24], ["Membership Director", "COMMITTEE_CHAIR", 25],
    ["Fundraising Director", "COMMITTEE_CHAIR", 26], ["Attendance Officer", "OTHER", 40],
    ["District Governor", "DISTRICT", 90], ["District Rotaract Representative", "DISTRICT", 91], ["Assistant District Rotaract Representative", "DISTRICT", 92],
    ["District Team Member", "DISTRICT", 95],
  ] as const;
  const roleId: Record<string, string> = {};
  for (const [title, category, sortOrder] of roles) {
    const r = await db.leadershipRole.upsert({ where: { slug: slugify(title) }, update: {}, create: { title, slug: slugify(title), category, sortOrder } });
    roleId[title] = r.id;
  }

  // ── Committees (common Rotaract avenues; editable) ──
  const committees = ["Club Service", "Community Service", "Professional Development", "Public Image", "Membership", "International Service", "Fundraising", "Finance"];
  for (const [i, name] of committees.entries()) {
    await db.committee.upsert({ where: { slug: slugify(name) }, update: {}, create: { name, slug: slugify(name), sortOrder: i } });
  }

  // ── Skills taxonomy ──
  const skills = ["Software Development", "Finance", "Accounting", "Law", "Medicine", "Engineering", "Marketing", "Entrepreneurship", "Communications", "Design", "Project Management", "Education", "Public Relations", "Human Resources", "Business Development", "Data", "Research", "Public Health", "Photography", "Events"];
  for (const name of skills) await db.skill.upsert({ where: { slug: slugify(name) }, update: {}, create: { name, slug: slugify(name) } });

  // ── Organizations ──
  const orgs: [string, Prisma.OrganizationCreateInput["type"], Partial<Prisma.OrganizationCreateInput>][] = [
    ["Rotaract Club Kampala North", "ROTARACT_CLUB", { isSelf: true, shortName: "Kampala North", description: club.notes }],
    ["Rotary Club of Kampala North", "ROTARY_CLUB", { description: "A separate Rotary club (RI club 25541) that meets on Mondays at Protea Hotel, Kololo. A public source naming it as this club's sponsor hasn't been found yet.", website: "https://rotaryd9213.org/clubinfo/kampala-north" }],
    ["Rotaract District 9213", "ROTARACT_DISTRICT", { shortName: "Rotaract D9213", website: "https://rotaractd9213.org/" }],
    ["Rotary District 9213", "ROTARY_DISTRICT", { shortName: "D9213", website: "https://rotaryd9213.org/" }],
    ["Rotary International", "ROTARY_INTERNATIONAL", { website: "https://www.rotary.org/" }],
    ["Rotary Zone 22", "ROTARY_DISTRICT", {}],
    ["Rotaract Africa", "ROTARACT_DISTRICT", {}],
    ["Rotary Club of Muyenga", "ROTARY_CLUB", {}],
    ["Rotaract Club of KIU", "ROTARACT_CLUB", {}],
    ["Rotaract Club of Kampala North Musical", "ROTARACT_CLUB", { description: "A separate Rotaract club (RI 214715), chartered 18 April 2017." }],
    ["Rotaract E-Club of Kampala North", "ROTARACT_CLUB", { description: "A separate Rotaract e-club (RI 8827515), chartered 6 August 2025." }],
  ];
  const orgId: Record<string, string> = {};
  for (const [name, type, extra] of orgs) {
    const o = await db.organization.upsert({ where: { slug: slugify(name) }, update: {}, create: { name, slug: slugify(name), type, ...extra } as Prisma.OrganizationCreateInput });
    orgId[name] = o.id;
  }
  const SELF = orgId["Rotaract Club Kampala North"];

  // ── People (public profiles; no private contact data) ──
  async function person(name: string, data: Partial<Prisma.PersonUncheckedCreateInput>) {
    const slug = slugify(name);
    return db.person.upsert({ where: { slug }, update: {}, create: { slug, name, ...data } as Prisma.PersonUncheckedCreateInput });
  }
  async function assign(personId: string, role: string, yearSlug: string, data: Partial<Prisma.LeadershipAssignmentUncheckedCreateInput>) {
    const yearId = years[yearSlug];
    if (!yearId) return;
    const existing = await db.leadershipAssignment.findFirst({ where: { personId, roleId: roleId[role], yearId } });
    if (!existing) await db.leadershipAssignment.create({ data: { personId, roleId: roleId[role], yearId, ...data } as Prisma.LeadershipAssignmentUncheckedCreateInput });
  }

  const ppl = Object.fromEntries((R.people as { name: string; source_url: string; also_source?: string; verification: string; note?: string }[]).map((p) => [p.name, p]));

  const ezekiel = await person("Ezekiel Kiggundu", { ...prov(ppl["Ezekiel Kiggundu"].source_url, "ClubRunner (Rotary District 9213) & Rotary-O", "CONFLICTING") });
  await assign(ezekiel.id, "President", "2026-2027", {
    ...prov(ppl["Ezekiel Kiggundu"].source_url, "ClubRunner (Rotary District 9213) & Rotary-O", "CONFLICTING"),
    highlights: "Sources conflict: ClubRunner and Rotary-O list Ezekiel Kiggundu as President, but the RI export in the district's 2026-27 clubs list names Rogers Waneloba as President. Please confirm.",
  });
  const rogers = await person("Rogers Waneloba", { ...prov(ppl["Rogers Waneloba"].source_url, "ClubRunner (Rotary District 9213) & RI clubs export", "CONFLICTING") });
  await assign(rogers.id, "Executive Secretary / Director", "2026-2027", {
    ...prov(ppl["Rogers Waneloba"].source_url, "ClubRunner (Rotary District 9213)", "CONFLICTING"),
    highlights: "ClubRunner lists him as Executive Secretary/Director. The RI club export (district 2026-27 clubs list) names him Club President. Please confirm.",
  });

  const districtTeam: [string, string, string, string][] = [
    ["Nahurira Victor", "Projects Chair, Rotaract District 9213", "2026-2027", ppl["Nahurira Victor"].source_url],
    ["Mumbere Kisembo Walter", "Deputy Public Image Chair, Rotaract District 9213", "2026-2027", ppl["Mumbere Kisembo Walter"].source_url],
    ["Karen Claire Nassanga", "Rotaract Ladies Initiative (ROLI) Chair, Rotaract District 9213", "2026-2027", ppl["Karen Claire Nassanga"].source_url],
    ["Pascal Ongom", "Rotaract District PIME Chair", "2024-2025", ppl["Pascal Ongom"].source_url],
    ["Victoria Nattabi", "Rotaract District Qualification & Stewardship Chair", "2024-2025", ppl["Victoria Nattabi"].source_url],
    ["Clare Ahebwa", "Youth Co-Chair, Rotary District 9213 committee", "2024-2025", ppl["Clare Ahebwa"].source_url],
  ];
  const memberPeople: Record<string, string> = {};
  for (const [name, title, yr, url] of districtTeam) {
    const p = await person(name, { ...prov(url, sourceName(url), "VERIFIED"), honorific: name === "Karen Claire Nassanga" ? "PP" : null });
    memberPeople[name] = p.id;
    await assign(p.id, "District Team Member", yr, { customTitle: title, ...prov(url, sourceName(url), "VERIFIED") });
  }
  if (memberPeople["Karen Claire Nassanga"]) {
    await db.person.update({
      where: { id: memberPeople["Karen Claire Nassanga"] },
      data: { verification: "NEEDS_VERIFICATION", bio: null, expertise: null, seoDescription: "Past President of Rotaract Club Kampala North (year to be confirmed); ROLI Chair, Rotaract District 9213 (2026–27)." },
    });
  }

  const julius = await person("Julius Sse", { ...prov(ppl["Julius Sse"].source_url, "Club Instagram bio (undated)") });
  await assign(julius.id, "President", "2016-2017", {
    ...prov(ppl["Julius Sse"].source_url, "Club Instagram bio (undated)"),
    highlights: "The club's Instagram bio (undated, c. 2016) reads \"Our All Star President Julius Sse\". The year and full surname need confirming.",
  });
  const eric = await person("Eric Byenkya", { ...prov(ppl["Eric Byenkya"].source_url, "Club Instagram post, 16 Nov 2016") });
  await assign(eric.id, "President", "2015-2016", {
    ...prov(ppl["Eric Byenkya"].source_url, "Club Instagram post, 16 Nov 2016"),
    highlights: "Referred to as \"IPP\" (Immediate Past President) in a November 2016 post, which suggests he led the club in 2015–16. Needs confirmation.",
  });
  await assign(eric.id, "Immediate Past President", "2016-2017", { ...prov(ppl["Eric Byenkya"].source_url, "Club Instagram post, 16 Nov 2016") });

  // ADRR (cluster) — district leader, club not stated
  const fatuma = await person("Nanziri Fatuma", { type: "DISTRICT_LEADER", ...prov(ppl["Nanziri Fatuma"].source_url, "Rotaract D9213 Team Directory", "VERIFIED") });
  await assign(fatuma.id, "Assistant District Rotaract Representative", "2026-2027", { customTitle: "ADRR, Central Cluster 16 (includes Kampala North)", ...prov(ppl["Nanziri Fatuma"].source_url, "Rotaract D9213 Team Directory", "VERIFIED") });

  // District Governors & DRRs
  for (const g of R.district.governors as { name: string; year: string; club?: string; source_url: string }[]) {
    const m = g.year.match(/^(\d{4})-(\d{4})$/);
    if (!m) continue;
    const name = g.name.replace(/\s*\(.*\)$/, "");
    const p = await person(name, { type: "DISTRICT_LEADER", organization: g.club ? `Rotary Club of ${g.club}` : null, ...prov(g.source_url, "Rotary District 9213 organisation chart", "VERIFIED") });
    await assign(p.id, "District Governor", `${m[1]}-${m[2]}`, prov(g.source_url, "Rotary District 9213 organisation chart", "VERIFIED"));
  }
  for (const d of R.district.drrs as { name: string; year: string; club?: string; source_url: string }[]) {
    const m = d.year.match(/^(\d{4})-(\d{4})/);
    if (!m) continue;
    const p = await person(d.name, { type: "DISTRICT_LEADER", organization: d.club ? `Rotaract Club of ${d.club.replace(/ \(Rotaract\).*/, "").replace(/ - NOT.*/, "")}` : null, ...prov(d.source_url, "Rotary District 9213 organisation chart", "VERIFIED") });
    await assign(p.id, "District Rotaract Representative", `${m[1]}-${m[2]}`, prov(d.source_url, "Rotary District 9213 organisation chart", "VERIFIED"));
  }

  // Guest speakers from 2016 fellowships
  const mwondha = await person("Ivan Mwondha", { type: "ROTARIAN", honorific: "Rtn.", ...prov("https://www.instagram.com/p/BMVsuI6Ac4w/", "Club Instagram post, 3 Nov 2016") });
  const mugerwa = await person("Innocent Mugerwa Robin", { type: "GUEST", organization: "Pearl Foundation (founder); Rotaract Club of Kampala East", ...prov("https://www.instagram.com/p/BNHv2Wzg1rQ/", "Club Instagram post, 22 Nov 2016") });

  // ── Projects ──
  const kigezi = R.projects[0];
  const retreat = await db.project.upsert({
    where: { slug: "kigezi-new-year-retreat-2022" },
    update: {},
    create: {
      slug: "kigezi-new-year-retreat-2022",
      title: "Kigezi New Year's Retreat",
      tagline: "Three days in Kabale: trees at Kigezi Primary School, career guidance and team building.",
      summary: kigezi.summary,
      status: "COMPLETED",
      need: null,
      idea: null,
      beginning: "The club organised a three-day new year's retreat in Kabale, in the Kigezi sub-region of Western Uganda, in January 2022.",
      impact: "Activities reported by KIU News included tree planting around Kigezi Primary School, career guidance and team building, with the Rotary Club of Muyenga and the Rotaract Club of KIU taking part.",
      today: null,
      startDate: new Date(Date.UTC(2022, 0, 1)),
      locationName: "Kabale, Kigezi sub-region",
      latitude: -1.2486,
      longitude: 29.9899,
      yearId: years["2021-2022"],
      featured: true,
      ...prov(kigezi.source_url, "KIU News, 24 Jan 2022"),
      seoDescription: "A three-day new year's retreat in Kabale organised by Rotaract Club Kampala North in January 2022.",
    },
  });
  if (!(await db.projectMilestone.count({ where: { projectId: retreat.id } }))) {
    await db.projectMilestone.createMany({
      data: [
        { projectId: retreat.id, date: new Date(Date.UTC(2022, 0, 1)), dateLabel: "January 2022", title: "Retreat in Kabale", description: "Three days of tree planting at Kigezi Primary School, career guidance, team building and touring the Kigezi sub-region. Hosted by Prof. Augustus Nuwagaba, President of the Rotary Club of Muyenga (per KIU News).", stage: "IMPLEMENTATION", yearId: years["2021-2022"], ...prov(kigezi.source_url, "KIU News, 24 Jan 2022") },
        { projectId: retreat.id, date: new Date(Date.UTC(2022, 0, 24)), title: "Covered by KIU News", description: kigezi.milestones[0].description, stage: "UPDATE", yearId: years["2021-2022"], ...prov(kigezi.milestones[0].source_url, "KIU News, 24 Jan 2022") },
      ],
    });
    for (const org of ["Rotary Club of Muyenga", "Rotaract Club of KIU"]) {
      await db.projectPartner.create({ data: { projectId: retreat.id, organizationId: orgId[org], role: "Took part", sourceUrl: kigezi.source_url, verification: "NEEDS_VERIFICATION" } });
    }
  }

  const jrfr = await db.project.upsert({
    where: { slug: "jrfr16-fundraiser" },
    update: {},
    create: {
      slug: "jrfr16-fundraiser",
      title: "#JRFR16 Fundraiser",
      tagline: "A November 2016 fundraiser with team activities. The full name is yet to be confirmed.",
      summary: R.projects[1].summary,
      status: "COMPLETED",
      startDate: new Date(Date.UTC(2016, 10, 26)),
      yearId: years["2016-2017"],
      ...prov(R.projects[1].source_url, "Club Instagram, Nov 2016"),
    },
  });
  if (!(await db.projectMilestone.count({ where: { projectId: jrfr.id } }))) {
    await db.projectMilestone.create({ data: { projectId: jrfr.id, date: new Date(Date.UTC(2016, 10, 21)), title: "#JRFR16 announced for the weekend", description: "Posts promoting team activities and the post-fundraiser \"Sato package\".", stage: "FUNDRAISING", yearId: years["2016-2017"], ...prov(R.projects[1].milestones[0].source_url, "Club Instagram, 21 Nov 2016") } });
  }

  await db.project.upsert({
    where: { slug: "kanos-newsletter" },
    update: {},
    create: {
      slug: "kanos-newsletter",
      title: "#KanosNewsletter",
      tagline: "The club's 2016 newsletter series, published on Instagram.",
      summary: R.projects[2].summary,
      status: "COMPLETED",
      startDate: new Date(Date.UTC(2016, 9, 29)),
      yearId: years["2016-2017"],
      ...prov(R.projects[2].source_url, "Club Instagram, 29 Oct 2016"),
    },
  });

  // ── Events ──
  const typeMap: Record<string, EventType> = {
    club_meeting: "CLUB_MEETING", fellowship: "FELLOWSHIP", retreat: "SERVICE_PROJECT", district: "ROTARACT_DISTRICT_EVENT", training: "DISTRICT_TRAINING",
    forum: "LEADERSHIP", awareness: "OTHER", service: "SERVICE_PROJECT", international: "INTERNATIONAL", zone: "INTERNATIONAL", competition: "ROTARACT_DISTRICT_EVENT",
    vocational: "PROFESSIONAL_DEVELOPMENT", festival: "ROTARACT_DISTRICT_EVENT", assembly: "DISTRICT_ASSEMBLY", conference: "DISTRICT_CONFERENCE", health: "COMMUNITY_OUTREACH",
  };
  async function event(e: { title: string; date: string; start_time?: string | null; venue?: string | null; organizer?: string; type?: string; source_url: string; verification?: string; note?: string }, orgName: string, extra: Partial<Prisma.EventUncheckedCreateInput> = {}) {
    const d = parseDates(e.date);
    if (!d) return null;
    const title = e.title.replace(/^PAST:\s*/, "");
    const slug = slugify(`${title}-${d.start.toISOString().slice(0, 10)}`);
    let startTime: Date | null = null;
    if (e.start_time && /^\d{2}:\d{2}/.test(e.start_time)) {
      const [h, m] = e.start_time.split(":").map(Number);
      startTime = new Date(d.start.getTime() + (h - 3) * 3600000 + m * 60000); // Kampala = UTC+3
    }
    const ver: Verification = e.note?.toLowerCase().includes("conflict") ? "CONFLICTING" : e.verification ? v(e.verification) : "VERIFIED";
    const ev = await db.event.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        title,
        description: e.note || (e.organizer ? `Organised by ${e.organizer}.` : null),
        date: d.start,
        endDate: d.end,
        allDay: !startTime,
        startTime,
        venue: e.venue && !/^district 9213$/i.test(e.venue) ? e.venue : null,
        organizerId: orgId[orgName],
        type: typeMap[e.type || ""] || "OTHER",
        status: d.start < new Date() && !d.end ? "COMPLETED" : "SCHEDULED",
        yearId: years[rotaryYearOf(d.start)] || null,
        source: sourceName(e.source_url),
        sourceUrl: e.source_url,
        sourceType: "DISTRICT",
        importedAt: DISCOVERED,
        lastCheckedAt: DISCOVERED,
        verification: ver,
        ...extra,
      },
    });
    if (!(await db.eventSource.count({ where: { eventId: ev.id } }))) {
      await db.eventSource.create({ data: { eventId: ev.id, source: sourceName(e.source_url), sourceUrl: e.source_url, sourceType: "RESEARCH", rawTitle: e.title, rawData: e as Prisma.InputJsonValue, firstImported: DISCOVERED, lastChecked: DISCOVERED } });
    }
    return ev;
  }

  // Club events (2016 fellowships, 2022 retreat). The weekly meeting is represented by settings + attendance sessions.
  for (const e of R.events.slice(1)) {
    const ev = await event({ ...e, source_url: e.source_url }, "Rotaract Club Kampala North", { projectId: e.type === "retreat" ? retreat.id : null });
    if (!ev) continue;
    if (e.title.includes("Ivan Mwondha")) await db.event.update({ where: { id: ev.id }, data: { people: { connect: [{ id: mwondha.id }] }, title: "Fellowship with Rtn. Ivan Mwondha" } });
    if (e.title.includes("Innocent Mugerwa")) await db.event.update({ where: { id: ev.id }, data: { people: { connect: [{ id: mugerwa.id }] }, title: "Fellowship: basic life skills for youth, with Innocent Mugerwa Robin" } });
    if (e.title.includes("Eric Byenkya")) await db.event.update({ where: { id: ev.id }, data: { people: { connect: [{ id: eric.id }] }, title: "Fellowship with IPP Eric Byenkya" } });
    if (e.title.includes("retreat")) await db.event.update({ where: { id: ev.id }, data: { title: "New Year's Retreat, Kabale" } });
  }

  // District / ecosystem events
  const skipTitles = ["Rotary DG official visits", "Measles-Rubella"];
  for (const e of R.district.events as { title: string; date: string; organizer: string; type: string; venue?: string; source_url: string; note?: string }[]) {
    if (skipTitles.some((t) => e.title.startsWith(t))) continue;
    let org = e.source_url.includes("rotaryd9213.org") ? "Rotary District 9213" : "Rotaract District 9213";
    if (e.organizer === "Rotaract Africa") org = "Rotaract Africa";
    if (/Zone 22/.test(e.organizer)) org = "Rotary Zone 22";
    if (e.organizer === "Rotary International") org = "Rotary International";
    if (/District Conference|DISCON/.test(e.title)) org = "Rotary District 9213";
    await event({ ...e, verification: "verified" }, org);
  }

  // ── Social posts (Instagram 2016) — published to the feed as archive items ──
  for (const s of R.social_posts as { url: string; date: string; summary: string; platform: string }[]) {
    const d = new Date(s.date + "T09:00:00Z");
    const cat = s.summary.includes("#KanosNewsletter") ? "ANNOUNCEMENT" : s.summary.includes("#JRFR16") ? "PROJECT_UPDATE" : "FELLOWSHIP";
    await db.socialPost.upsert({
      where: { url: s.url },
      update: {},
      create: {
        platform: "INSTAGRAM",
        url: s.url,
        content: s.summary,
        postedAt: d,
        organizationId: SELF,
        category: cat,
        yearId: years[rotaryYearOf(d)],
        projectId: s.summary.includes("#JRFR16") ? jrfr.id : null,
        publishStatus: "PUBLISHED",
        source: "Instagram (@kanosug)",
        sourceType: "CLUB_SOCIAL",
        discoveredAt: DISCOVERED,
        verification: "VERIFIED",
      },
    });
  }

  // ── Achievements ──
  const achv: { title: string; detail?: string; date: string; source_url: string; verification: string; metricValue?: number; metricLabel?: string; yearSlug: string }[] = [
    { title: "Ranked first among district clubs with 40 or more members, August 2026", detail: "Clubs Monthly Performance Report (PIME), Rotaract District 9213, Tier 2 (40+ members). Total score: 66.", date: "2026-08-31", source_url: R.achievements[0].source_url, verification: "verified", metricValue: 1, metricLabel: "Tier 2 rank", yearSlug: "2026-2027" },
    { title: "Ranked second among district clubs with 40 or more members, July 2026", detail: "Clubs Monthly Performance Report, Rotaract District 9213, Tier 2. Total score: 41 (Upper Kololo led with 43).", date: "2026-07-31", source_url: R.achievements[1].source_url, verification: "verified", metricValue: 2, metricLabel: "Tier 2 rank", yearSlug: "2026-2027" },
    { title: "Three members on the Rotaract District 9213 team for 2026–27", detail: "Projects Chair, Deputy Public Image Chair and Rotaract Ladies Initiative (ROLI) Chair.", date: "2026-07-01", source_url: R.achievements[2].source_url, verification: "verified", metricValue: 3, metricLabel: "district roles", yearSlug: "2026-2027" },
    { title: "Members served on district committees in 2024–25", detail: "Rotaract PIME Chair; Qualification & Stewardship Chair; Youth Co-Chair on a Rotary District 9213 committee.", date: "2024-07-01", source_url: R.achievements[3].source_url, verification: "verified", metricValue: 3, metricLabel: "district roles", yearSlug: "2024-2025" },
  ];
  for (const a of achv) {
    if (await db.achievement.findFirst({ where: { title: a.title } })) continue;
    await db.achievement.create({
      data: { title: a.title, description: a.detail, date: new Date(a.date + "T00:00:00Z"), metricValue: a.metricValue, metricLabel: a.metricLabel, yearId: years[a.yearSlug], featured: a.metricValue === 1, ...prov(a.source_url, sourceName(a.source_url), v(a.verification)) },
    });
  }

  // ── Our Story timeline ──
  const history: (Partial<Prisma.HistoryEntryUncheckedCreateInput> & { title: string })[] = [
    { date: new Date(Date.UTC(2014, 11, 1)), title: "Chartered", description: "Rotaract Club Kampala North receives its charter (RI club ID 92123) in Rotary District 9213.", kind: "CHARTER", yearId: years["2014-2015"], ...prov(club.charter_date_sources[0], "Rotaract D9213 clubs list (RI export) & club Instagram bio", "VERIFIED") },
    { date: new Date(Date.UTC(2015, 6, 1)), dateLabel: "2015–16 (approx.)", title: "Eric Byenkya leads the club", description: "A November 2016 post refers to Eric Byenkya as Immediate Past President.", kind: "PRESIDENT", yearId: years["2015-2016"], ...prov(ppl["Eric Byenkya"].source_url, "Club Instagram, 16 Nov 2016") },
    { date: new Date(Date.UTC(2016, 9, 29)), title: "#KanosNewsletter goes out", description: "The club publishes a newsletter series on Instagram: \"Service above self\", \"Rotary My Family\" and pieces on personal growth and social selling.", kind: "INITIATIVE", yearId: years["2016-2017"], ...prov(R.projects[2].source_url, "Club Instagram, 29 Oct 2016", "VERIFIED") },
    { date: new Date(Date.UTC(2016, 10, 4)), dateLabel: "Autumn 2016", title: "Friday fellowships at Nommo Gallery", description: "Under President Julius Sse, the club meets on Fridays from 6 to 7pm at Nommo Gallery, next to State House, and hosts guest speakers such as Rtn. Ivan Mwondha.", kind: "MOMENT", yearId: years["2016-2017"], ...prov("https://www.instagram.com/kanosug/", "Club Instagram bio & posts, 2016") },
    { date: new Date(Date.UTC(2016, 10, 26)), dateLabel: "November 2016", title: "#JRFR16 fundraiser", description: "A weekend fundraiser with team activities, promoted on the club's Instagram.", kind: "PROJECT", yearId: years["2016-2017"], ...prov(R.projects[1].source_url, "Club Instagram, Nov 2016") },
    { date: new Date(Date.UTC(2022, 0, 1)), dateLabel: "January 2022", title: "New Year's retreat in Kigezi", description: "Three days in Kabale with the Rotary Club of Muyenga and the Rotaract Club of KIU: tree planting at Kigezi Primary School, career guidance and team building.", kind: "PROJECT", yearId: years["2021-2022"], ...prov(kigezi.source_url, "KIU News, 24 Jan 2022") },
    { date: new Date(Date.UTC(2024, 6, 1)), dateLabel: "2024–25", title: "Kampala North on the district stage", description: "Members serve as Rotaract District PIME Chair, as Qualification & Stewardship Chair, and as Youth Co-Chair on a Rotary District 9213 committee.", kind: "MOMENT", yearId: years["2024-2025"], ...prov(R.achievements[3].source_url, "Rotary District 9213 organisation chart 2024", "VERIFIED") },
    { date: new Date(Date.UTC(2026, 6, 1)), dateLabel: "July 2026", title: "A 100-member club", description: "The district's 2026–27 clubs list records 102 members, meeting on Fridays at Hotel Triangle on Buganda Road.", kind: "CURRENT", yearId: years["2026-2027"], ...prov(club.current_member_count_source, "Rotaract D9213 clubs list 2026–27", "VERIFIED") },
    { date: new Date(Date.UTC(2026, 7, 31)), dateLabel: "August 2026", title: "Top of the table", description: "Kampala North ranks first among district clubs with 40 or more members in the August 2026 Clubs Monthly Performance Report.", kind: "AWARD", yearId: years["2026-2027"], ...prov(R.achievements[0].source_url, "Rotaract D9213 PIME report, Aug 2026", "VERIFIED") },
  ];
  for (const h of history) {
    if (await db.historyEntry.findFirst({ where: { title: h.title } })) continue;
    await db.historyEntry.create({ data: h as Prisma.HistoryEntryUncheckedCreateInput });
  }
  const charterEntry = await db.historyEntry.findFirst({ where: { title: "Friday fellowships at Nommo Gallery" } });
  if (charterEntry) await db.historyEntry.update({ where: { id: charterEntry.id }, data: { people: { connect: [{ id: julius.id }, { id: mwondha.id }] } } });

  // ── Impact metrics: only what's documented ──
  await db.impactMetric.upsert({
    where: { key: "members_2026" },
    update: {},
    create: { key: "members_2026", label: "Members on the district roll", value: club.current_member_count, unit: null, description: "Rotaract D9213 clubs list, 2026–27", sortOrder: 1, source: "Rotaract District 9213", sourceUrl: club.current_member_count_source, verification: "VERIFIED", asOf: new Date(Date.UTC(2026, 6, 1)) },
  });

  // ── Event discovery feeds (inactive until an admin adds a real ICS/RSS URL) ──
  if (!(await db.eventFeed.count())) {
    await db.eventFeed.createMany({
      data: [
        { name: "Rotaract District 9213 calendar (add ICS URL)", url: "https://rotaractd9213.org/events.php?all=1", kind: "MANUAL", trust: "REVIEW", organizerId: orgId["Rotaract District 9213"], defaultType: "ROTARACT_DISTRICT_EVENT", active: false },
        { name: "Rotary District 9213 calendar (add ICS URL)", url: "https://rotaryd9213.org/events", kind: "MANUAL", trust: "REVIEW", organizerId: orgId["Rotary District 9213"], defaultType: "OTHER", active: false },
        { name: "Rotary-O fellowships (review queue)", url: "https://www.rotaryo.org/search/fellowships", kind: "MANUAL", trust: "REVIEW", defaultType: "FELLOWSHIP", active: false },
      ],
    });
  }

  // ── First admin (from env) ──
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const email = process.env.ADMIN_EMAIL.toLowerCase();
    if (!(await db.user.findUnique({ where: { email } }))) {
      await db.user.create({ data: { email, passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12), role: "SUPER_ADMIN" } });
      console.log(`Created super admin ${email}`);
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
