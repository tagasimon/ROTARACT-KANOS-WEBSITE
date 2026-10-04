/**
 * Imports content curated from the club's own X account (@kanosug):
 * prisma/seed-data/x-kanosug.json + the photos in prisma/seed-data/x-media/.
 *
 *  - every record keeps provenance (source "X (@kanosug)", sourceUrl = the post)
 *  - idempotent: records are matched by slug / title / url and only created once
 *  - one-off corrections to earlier research (sponsor, presidents) run once per
 *    data "version" and are remembered in site_settings.xImport
 *  - photos become responsive WebP variants in the configured storage
 *    (local volume or S3); nothing is fetched from X at runtime
 *
 * Run: npm run db:seed-x   (the Docker entrypoint runs it after the main seed)
 */
import { PrismaClient, type Prisma, type Verification } from "@prisma/client";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const db = new PrismaClient();
const DIR = path.join(__dirname, "seed-data");
const X = JSON.parse(fs.readFileSync(path.join(DIR, "x-kanosug.json"), "utf8"));
const MEDIA_DIR = path.join(DIR, "x-media");
const SOURCE = "X (@kanosug)";
const COLLECTED = new Date(X.collected_at);
const postUrl = (id: string) => `https://x.com/kanosug/status/${id}`;
const imgRef = (id: string) => `https://pbs.twimg.com/media/${id}.jpg`;

const slugify = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const day = (s: string) => new Date(`${s}T00:00:00Z`);
const rotaryYearOf = (d: Date) => {
  const y = d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return `${y}-${y + 1}`;
};
const prov = (post: string | undefined, verification: Verification = "VERIFIED") => ({
  source: SOURCE,
  sourceUrl: post ? postUrl(post) : X.account,
  sourceType: "CLUB_SOCIAL",
  discoveredAt: COLLECTED,
  lastCheckedAt: COLLECTED,
  verification,
});

// ── storage (mirrors src/lib/storage.ts without the Next.js "server-only" guard) ──
type Put = (key: string, body: Buffer, type: string) => Promise<void>;
let putFile: Put;
async function initStorage() {
  if (process.env.STORAGE_DRIVER === "s3") {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: !!process.env.S3_ENDPOINT,
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID || "", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "" },
    });
    putFile = async (key, body, type) => {
      await client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET || "", Key: key, Body: body, ContentType: type, CacheControl: "public, max-age=31536000, immutable" }));
    };
  } else {
    const root = path.resolve(process.env.STORAGE_LOCAL_DIR || "./storage");
    putFile = async (key, body) => {
      const file = path.join(root, key);
      await fsp.mkdir(path.dirname(file), { recursive: true });
      await fsp.writeFile(file, body);
    };
  }
}

type Sharp = typeof import("sharp").default;
let sharp: Sharp | null = null;
const WIDTHS = { sm: 480, md: 960, lg: 1600 } as const;

// ── image lookup tables built from the albums ──
type Img = { id: string; post: string; caption?: string; phase?: "BEFORE" | "DURING" | "AFTER" | "CURRENT" };
const imgInfo = new Map<string, Img & { album: string }>();
for (const a of X.albums) for (const im of a.images as Img[]) if (!imgInfo.has(im.id)) imgInfo.set(im.id, { ...im, album: a.slug });
const postDate = new Map<string, Date>((X.posts as { id: string; date: string }[]).map((p) => [p.id, new Date(p.date)]));
/** X post ids are snowflakes: the creation time is encoded in the id. */
const snowflakeDate = (id: string) => new Date(Number((BigInt(id) >> 22n) + 1288834974657n));

const mediaIds = new Map<string, string>(); // x media id → Media.id
let newPhotos = 0;

async function ensureMedia(id: string, link: Partial<Prisma.MediaUncheckedCreateInput> = {}) {
  if (mediaIds.has(id)) return mediaIds.get(id)!;
  const existing = await db.media.findFirst({ where: { url: imgRef(id) }, select: { id: true } });
  if (existing) {
    mediaIds.set(id, existing.id);
    return existing.id;
  }
  const file = path.join(MEDIA_DIR, `${id}.webp`);
  if (!fs.existsSync(file)) return null;
  const input = await fsp.readFile(file);
  const variants: Record<string, string> = {};
  let width: number | null = null;
  let height: number | null = null;
  if (sharp) {
    const meta = await sharp(input).metadata();
    width = meta.width ?? null;
    height = meta.height ?? null;
    for (const [name, w] of Object.entries(WIDTHS)) {
      if (width && width < w && name !== "sm") continue;
      const buf = name === "lg" ? input : await sharp(input).resize({ width: w, withoutEnlargement: true }).webp({ quality: 76 }).toBuffer();
      const key = `images/x/${id}-${name}.webp`;
      await putFile(key, buf, "image/webp");
      variants[name] = key;
    }
  } else {
    const key = `images/x/${id}-lg.webp`;
    await putFile(key, input, "image/webp");
    variants.lg = key;
  }
  const info = imgInfo.get(id);
  const post = info?.post;
  const date = post ? postDate.get(post) || snowflakeDate(post) : null;
  const m = await db.media.create({
    data: {
      kind: "IMAGE",
      provider: "UPLOAD",
      url: imgRef(id), // stable identity; the page serves the stored variants
      storageKey: variants.lg || variants.md || variants.sm,
      variants,
      mimeType: "image/webp",
      width,
      height,
      caption: info?.caption || null,
      alt: info?.caption?.replace(/\.$/, "") || "Photo from Rotaract Club of Kampala North on X",
      credit: "Rotaract Club of Kampala North (@kanosug)",
      date,
      phase: info?.phase || null,
      yearId: date ? yearIds[rotaryYearOf(date)] || null : null,
      source: SOURCE,
      sourceUrl: post ? postUrl(post) : X.account,
      verification: "VERIFIED",
      ...link,
    },
  });
  mediaIds.set(id, m.id);
  newPhotos++;
  return m.id;
}

let yearIds: Record<string, string> = {};
const orgIds: Record<string, string> = {};
const personIds: Record<string, string> = {};
const projectIds: Record<string, string> = {};
const eventIds: Record<string, string> = {};

async function main() {
  console.log("Importing content from the club's X account…");
  await initStorage();
  try {
    sharp = ((await import("sharp")) as unknown as { default: Sharp }).default;
  } catch {
    console.warn("! sharp not available: storing the 1600px image only");
  }

  const state = await db.siteSetting.findUnique({ where: { key: "xImport" } });
  const doneVersion = (state?.value as { version?: number } | null)?.version ?? 0;
  const upgrade = doneVersion < X.version;

  const years = await db.rotaractYear.findMany({ select: { id: true, slug: true, coverId: true } });
  yearIds = Object.fromEntries(years.map((y) => [y.slug, y.id]));
  const roles = Object.fromEntries((await db.leadershipRole.findMany()).map((r) => [r.title, r.id]));

  // ── organisations ──
  for (const o of await db.organization.findMany({ select: { id: true, name: true } })) orgIds[o.name] = o.id;
  for (const o of X.organizations as { name: string; type: Prisma.OrganizationCreateInput["type"]; description?: string; website?: string }[]) {
    if (orgIds[o.name]) continue;
    const r = await db.organization.upsert({ where: { slug: slugify(o.name) }, update: {}, create: { name: o.name, slug: slugify(o.name), type: o.type, description: o.description, website: o.website } });
    orgIds[o.name] = r.id;
  }
  const SELF = (await db.organization.findFirst({ where: { isSelf: true }, select: { id: true } }))?.id ?? null;

  // ── one-off corrections ──
  if (upgrade) {
    const sp = X.corrections.sponsor;
    if (orgIds[sp.org]) await db.organization.update({ where: { id: orgIds[sp.org] }, data: { description: sp.description } });
    const site = await db.siteSetting.findUnique({ where: { key: "site" } });
    if (site) {
      const v = site.value as Record<string, unknown>;
      await db.siteSetting.update({ where: { key: "site" }, data: { value: { ...v, sponsorNote: sp.sponsorNote } as Prisma.InputJsonValue } });
    }
  }

  // ── people ──
  for (const p of X.people as { key: string; existing?: string; name: string; honorific?: string; x?: string; type?: Prisma.PersonCreateInput["type"]; organization?: string; professionalTitle?: string; post: string; note?: string; photo?: string }[]) {
    let row = p.existing ? await db.person.findUnique({ where: { slug: p.existing } }) : null;
    if (!row) row = await db.person.findUnique({ where: { slug: slugify(p.name) } });
    if (!row) {
      row = await db.person.create({
        data: {
          slug: slugify(p.name),
          name: p.name,
          honorific: p.honorific || null,
          type: p.type || "MEMBER",
          x: p.x || null,
          organization: p.organization || null,
          professionalTitle: p.professionalTitle || null,
          seoDescription: p.note || null,
          ...prov(p.post, p.name === "Bright" || p.name === "Dr. Katende" || p.key === "baguma" ? "NEEDS_VERIFICATION" : "VERIFIED"),
        },
      });
    } else if (upgrade) {
      const newSlug = slugify(p.name);
      const slugFree = newSlug === row.slug || !(await db.person.findUnique({ where: { slug: newSlug } }));
      row = await db.person.update({
        where: { id: row.id },
        data: {
          name: p.name,
          slug: slugFree ? newSlug : row.slug,
          honorific: p.honorific ?? row.honorific,
          x: row.x || p.x || null,
          professionalTitle: row.professionalTitle || p.professionalTitle || null,
          organization: row.organization || p.organization || null,
          ...(row.verification !== "VERIFIED" && p.key !== "baguma" ? { verification: "VERIFIED", source: SOURCE, sourceUrl: postUrl(p.post), sourceType: "CLUB_SOCIAL", lastCheckedAt: COLLECTED } : {}),
        },
      });
    }
    personIds[p.key] = row.id;
    if (p.photo && !row.photoId) {
      const mid = await ensureMedia(p.photo);
      if (mid) await db.person.update({ where: { id: row.id }, data: { photoId: mid } });
    }
  }

  // ── leadership ──
  for (const l of X.leadership as { person: string; role: string; year: string; verification: Verification; post: string; highlights?: string; customTitle?: string }[]) {
    const personId = personIds[l.person];
    const roleId = roles[l.role];
    const yearId = yearIds[l.year];
    if (!personId || !roleId || !yearId) continue;
    const data = { customTitle: l.customTitle || null, highlights: l.highlights || null, ...prov(l.post, l.verification) };
    const existing = await db.leadershipAssignment.findFirst({ where: { personId, roleId, yearId } });
    if (!existing) await db.leadershipAssignment.create({ data: { personId, roleId, yearId, ...data } });
    else if (upgrade) await db.leadershipAssignment.update({ where: { id: existing.id }, data });
  }
  if (upgrade) {
    // Rogers Waneloba: earlier research had a conflicting "Executive Secretary / Director" (2026-27) entry from ClubRunner.
    const es = await db.leadershipAssignment.findFirst({ where: { personId: personIds.rogers, roleId: roles["Executive Secretary / Director"], yearId: yearIds["2026-2027"] } });
    // The club's own posts (Sept 2026) call him Immediate Past President, so the stale directory entry is removed.
    if (es && es.verification !== "VERIFIED") await db.leadershipAssignment.delete({ where: { id: es.id } });
    const nommo = await db.historyEntry.findFirst({ where: { title: "Friday fellowships at Nommo Gallery" } });
    if (nommo?.description?.includes("Julius Sse,")) await db.historyEntry.update({ where: { id: nommo.id }, data: { description: nommo.description.replace("Julius Sse,", "Julius Ssekajja,") } });
    // Ezekiel Kiggundu's presidency is now confirmed by the club itself.
    const ez = await db.person.findFirst({ where: { id: personIds.ezekiel } });
    if (ez) await db.person.update({ where: { id: ez.id }, data: { verification: "VERIFIED" } });
  }

  // ── projects ──
  type MS = { date: string; dateLabel?: string; title: string; description: string; stage: Prisma.ProjectMilestoneCreateInput["stage"]; post: string; image?: string; people?: string[]; verification?: Verification };
  for (const p of X.projects) {
    let proj = await db.project.findUnique({ where: { slug: p.slug } });
    const start = day(p.startDate);
    if (!proj) {
      proj = await db.project.create({
        data: {
          slug: p.slug,
          title: p.title,
          tagline: p.tagline,
          summary: p.summary,
          status: p.status,
          featured: !!p.featured,
          need: p.need || null,
          idea: p.idea || null,
          beginning: p.beginning || null,
          impact: p.impact || null,
          today: p.today || null,
          quote: p.quote || null,
          quoteAttribution: p.quoteAttribution || null,
          startDate: start,
          locationName: p.locationName || null,
          beneficiaries: p.beneficiaries || null,
          yearId: yearIds[p.year] || null,
          seoDescription: p.summary.slice(0, 158),
          ...prov(p.post),
        },
      });
    }
    projectIds[p.slug] = proj.id;
    if (!proj.coverId && p.cover) {
      const mid = await ensureMedia(p.cover, { projectId: proj.id });
      if (mid) await db.project.update({ where: { id: proj.id }, data: { coverId: mid } });
    }
    if (!(await db.projectMilestone.count({ where: { projectId: proj.id, source: SOURCE } }))) {
      for (const [i, m] of (p.milestones as MS[]).entries()) {
        const d = day(m.date);
        const imageId = m.image ? await ensureMedia(m.image, { projectId: proj.id }) : null;
        await db.projectMilestone.create({
          data: {
            projectId: proj.id,
            date: d,
            dateLabel: m.dateLabel || null,
            title: m.title,
            description: m.description,
            stage: m.stage,
            imageId,
            yearId: yearIds[rotaryYearOf(d)] || null,
            sortOrder: i,
            people: m.people?.length ? { connect: m.people.filter((k) => personIds[k]).map((k) => ({ id: personIds[k] })) } : undefined,
            ...prov(m.post, m.verification || "VERIFIED"),
          },
        });
      }
    }
    if (!(await db.projectMetric.count({ where: { projectId: proj.id, source: SOURCE } }))) {
      for (const [i, m] of (p.metrics as { label: string; value: number; unit?: string; impactKey?: string; date?: string; post: string; showInImpact?: boolean }[]).entries()) {
        await db.projectMetric.create({
          data: { projectId: proj.id, label: m.label, value: m.value, unit: m.unit || null, impactKey: m.impactKey || null, date: m.date ? day(m.date) : null, showInImpact: m.showInImpact ?? !!m.impactKey, sortOrder: i, source: SOURCE, sourceUrl: postUrl(m.post), verification: "VERIFIED" },
        });
      }
    }
    for (const pt of p.partners as { org: string; role: string }[]) {
      const organizationId = orgIds[pt.org];
      if (!organizationId) continue;
      await db.projectPartner.upsert({
        where: { projectId_organizationId: { projectId: proj.id, organizationId } },
        update: {},
        create: { projectId: proj.id, organizationId, role: pt.role, sourceUrl: postUrl(p.post), verification: "VERIFIED" },
      });
    }
  }
  if (upgrade) {
    // The flagship project leads the home page; the 2022 retreat stays in the archive.
    await db.project.updateMany({ where: { slug: "kigezi-new-year-retreat-2022" }, data: { featured: false } });
    await db.project.updateMany({ where: { slug: "kanos-4-kakindu" }, data: { featured: true } });
  }

  // ── events ──
  type EV = { slug: string; title: string; date: string; endDate?: string; start?: string; venue?: string; onlineUrl?: string | null; type: Prisma.EventCreateInput["type"]; organizer?: string; project?: string; description: string; post: string; cover?: string; people?: string[] };
  const now = new Date();
  for (const e of X.events as EV[]) {
    let ev = await db.event.findUnique({ where: { slug: e.slug } });
    const d = day(e.date);
    if (!ev) {
      let startTime: Date | null = null;
      if (e.start) {
        const [h, m] = e.start.split(":").map(Number);
        startTime = new Date(d.getTime() + (h - 3) * 3600000 + m * 60000); // Kampala = UTC+3
      }
      const end = e.endDate ? day(e.endDate) : null;
      const past = (end || d).getTime() + 86400000 < now.getTime();
      ev = await db.event.create({
        data: {
          slug: e.slug,
          title: e.title,
          description: e.description,
          date: d,
          endDate: end,
          startTime,
          allDay: !startTime,
          venue: e.venue || null,
          onlineUrl: e.onlineUrl || null,
          organizerId: (e.organizer && orgIds[e.organizer]) || SELF,
          type: e.type,
          status: past ? "COMPLETED" : "SCHEDULED",
          projectId: e.project ? projectIds[e.project] || null : null,
          yearId: yearIds[rotaryYearOf(d)] || null,
          people: e.people?.length ? { connect: e.people.filter((k) => personIds[k]).map((k) => ({ id: personIds[k] })) } : undefined,
          source: SOURCE,
          sourceUrl: postUrl(e.post),
          sourceType: "CLUB_SOCIAL",
          importedAt: COLLECTED,
          lastCheckedAt: COLLECTED,
          verification: "VERIFIED",
        },
      });
      await db.eventSource.create({ data: { eventId: ev.id, source: SOURCE, sourceUrl: postUrl(e.post), sourceType: "CLUB_SOCIAL", rawTitle: e.title, rawData: e as unknown as Prisma.InputJsonValue, firstImported: COLLECTED, lastChecked: COLLECTED } });
    }
    eventIds[e.slug] = ev.id;
    if (!ev.coverId && e.cover) {
      const mid = await ensureMedia(e.cover, { eventId: ev.id, projectId: e.project ? projectIds[e.project] : undefined });
      if (mid) await db.event.update({ where: { id: ev.id }, data: { coverId: mid } });
    }
  }

  // ── district visits ──
  for (const v of X.visits as { visitorName: string; visitorTitle: string; person: string; date: string; venue: string; status: Prisma.DistrictVisitCreateInput["status"]; event: string; summary: string; post: string }[]) {
    const d = day(v.date);
    if (await db.districtVisit.findFirst({ where: { visitorName: v.visitorName, date: d } })) continue;
    await db.districtVisit.create({
      data: { visitorName: v.visitorName, visitorTitle: v.visitorTitle, personId: personIds[v.person] || null, date: d, venue: v.venue, status: v.status, summary: v.summary, yearId: yearIds[rotaryYearOf(d)] || null, eventId: eventIds[v.event] || null, ...prov(v.post) },
    });
  }

  // ── achievements ──
  for (const a of X.achievements as { title: string; date: string; year: string; description: string; post: string; image?: string; project?: string; person?: string; featured?: boolean }[]) {
    if (await db.achievement.findFirst({ where: { title: a.title } })) continue;
    const imageId = a.image ? await ensureMedia(a.image) : null;
    await db.achievement.create({
      data: { title: a.title, description: a.description, date: day(a.date), yearId: yearIds[a.year] || null, imageId, projectId: a.project ? projectIds[a.project] : null, personId: a.person ? personIds[a.person] : null, featured: !!a.featured, ...prov(a.post) },
    });
  }

  // ── Our Story ──
  for (const h of X.history as { date: string; dateLabel?: string; title: string; kind: Prisma.HistoryEntryCreateInput["kind"]; description: string; post: string; image?: string; projects?: string[]; people?: string[] }[]) {
    if (await db.historyEntry.findFirst({ where: { title: h.title } })) continue;
    const d = day(h.date);
    const imageId = h.image ? await ensureMedia(h.image) : null;
    await db.historyEntry.create({
      data: {
        date: d,
        dateLabel: h.dateLabel || null,
        title: h.title,
        description: h.description,
        kind: h.kind,
        imageId,
        yearId: yearIds[rotaryYearOf(d)] || null,
        projects: h.projects?.length ? { connect: h.projects.filter((s) => projectIds[s]).map((s) => ({ id: projectIds[s] })) } : undefined,
        people: h.people?.length ? { connect: h.people.filter((k) => personIds[k]).map((k) => ({ id: personIds[k] })) } : undefined,
        ...prov(h.post),
      },
    });
  }

  // ── albums & photos ──
  for (const a of X.albums as { slug: string; title: string; date: string; category: Prisma.PhotoAlbumCreateInput["category"]; project?: string; event?: string; images: Img[] }[]) {
    const d = day(a.date);
    const album = await db.photoAlbum.upsert({
      where: { slug: a.slug },
      update: {},
      create: {
        slug: a.slug,
        title: a.title,
        category: a.category,
        date: d,
        yearId: yearIds[rotaryYearOf(d)] || null,
        projectId: a.project ? projectIds[a.project] || null : null,
        eventId: a.event ? eventIds[a.event] || null : null,
        description: `Photos posted by the club on X (@kanosug).`,
        source: SOURCE,
        sourceUrl: X.account,
      },
    });
    for (const [i, im] of a.images.entries()) {
      const mid = await ensureMedia(im.id);
      if (!mid) continue;
      const evSlug = (X.posts as { id: string; event?: string }[]).find((p) => p.id === im.post)?.event || a.event;
      await db.media.update({
        where: { id: mid },
        data: {
          albumId: album.id,
          sortOrder: i,
          projectId: a.project ? projectIds[a.project] || undefined : undefined,
          eventId: evSlug ? eventIds[evSlug] || undefined : undefined,
        },
      });
    }
    if (!album.coverId) {
      const first = mediaIds.get(a.images[0].id);
      if (first) await db.photoAlbum.update({ where: { id: album.id }, data: { coverId: first } });
    }
  }

  // ── social posts (club's own X posts, published to the feed) ──
  for (const p of X.posts as { id: string; date: string; text: string; category: Prisma.SocialPostCreateInput["category"]; project?: string; event?: string; image?: string }[]) {
    const url = postUrl(p.id);
    if (await db.socialPost.findUnique({ where: { url } })) continue;
    const firstImg = p.image || [...imgInfo.values()].find((i) => i.post === p.id)?.id;
    const imageId = firstImg ? await ensureMedia(firstImg) : null;
    const d = new Date(p.date);
    await db.socialPost.create({
      data: {
        platform: "X",
        url,
        content: p.text,
        imageId,
        postedAt: d,
        organizationId: SELF,
        category: p.category,
        projectId: p.project ? projectIds[p.project] || null : null,
        eventId: p.event ? eventIds[p.event] || null : null,
        yearId: yearIds[rotaryYearOf(d)] || null,
        publishStatus: "PUBLISHED",
        externalId: p.id,
        sourceUrl: url,
        source: SOURCE,
        sourceType: "CLUB_SOCIAL",
        discoveredAt: COLLECTED,
        verification: "VERIFIED",
      },
    });
  }

  // ── covers for years and the home page (only where none is set) ──
  const yearCovers: Record<string, string> = {
    "2016-2017": "CjiKj-YWYAASQpt", "2017-2018": "DENBM5gXYAAuRsC", "2018-2019": "DtWRcNlW0AAYTtm", "2019-2020": "EOs9H2ZUEAA2yue",
    "2020-2021": "Ex-3DE-WEA4BKzt", "2021-2022": "E_4QCNbUYAMA29u", "2022-2023": "FhRd8VnWIAIAmtu", "2023-2024": "F8zMW54XEAE5qO5",
    "2024-2025": "GIyNmKiWMAAEsHv", "2025-2026": "GyEXcuQW8AElan2", "2026-2027": "HTHDRvnXYAAKzuE",
  };
  for (const y of years) {
    if (y.coverId || !yearCovers[y.slug]) continue;
    const mid = await ensureMedia(yearCovers[y.slug]);
    if (mid) await db.rotaractYear.update({ where: { id: y.id }, data: { coverId: mid } });
  }
  if (upgrade) {
    const site = await db.siteSetting.findUnique({ where: { key: "site" } });
    const v = (site?.value || {}) as Record<string, unknown>;
    if (site && !v.heroImageId) {
      const mid = await ensureMedia("Ex-3DE-WEA4BKzt");
      if (mid) await db.siteSetting.update({ where: { key: "site" }, data: { value: { ...v, heroImageId: mid } as Prisma.InputJsonValue } });
    }
  }

  await db.siteSetting.upsert({
    where: { key: "xImport" },
    update: { value: { version: Math.max(doneVersion, X.version), lastRun: new Date().toISOString() } },
    create: { key: "xImport", value: { version: X.version, lastRun: new Date().toISOString() } },
  });
  console.log(`X import complete (${mediaIds.size} photos linked, ${newPhotos} new).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
