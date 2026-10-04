import "server-only";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { processImage, saveFileUpload, saveImageUpload } from "@/lib/media";
import { yearIdForDate } from "@/lib/years";
import { allFields, type Field, type Resource } from "./resources";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Delegate = any;
export const delegate = (model: string): Delegate => (db as unknown as Record<string, Delegate>)[model];

export const PAGE_SIZE = 40;

export async function listRows(r: Resource, opts: { q?: string; page?: number; filters?: Record<string, string>; }) {
  const where: Record<string, unknown> = { ...(r.where || {}) };
  const and: Record<string, unknown>[] = [];
  if (opts.q) and.push({ OR: r.searchFields.map((f) => ({ [f]: { contains: opts.q, mode: "insensitive" } })) });
  for (const [k, v] of Object.entries(opts.filters || {})) {
    if (!v) continue;
    const field = allFields(r).find((f) => f.name === k);
    if (!field) continue;
    and.push({ [k]: field.type === "boolean" ? v === "true" : v });
  }
  if (and.length) where.AND = and;
  const include: Record<string, unknown> = {};
  for (const lf of r.listFields) if (lf.type === "rel" && lf.rel) include[lf.name] = { select: { [lf.rel]: true } };
  const page = Math.max(1, opts.page || 1);
  const d = delegate(r.model);
  const [rows, total] = await Promise.all([
    d.findMany({ where, include: Object.keys(include).length ? include : undefined, orderBy: r.orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    d.count({ where }),
  ]);
  return { rows: rows as Record<string, unknown>[], total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getRow(r: Resource, id: string) {
  const include: Record<string, unknown> = {};
  for (const f of allFields(r)) if (f.type === "relations") include[f.name] = { select: { id: true } };
  return (await delegate(r.model).findUnique({ where: { id }, include: Object.keys(include).length ? include : undefined })) as Record<string, unknown> | null;
}

export async function relationOptions(f: Field) {
  if (!f.relation) return [];
  const rows = await delegate(f.relation.model).findMany({
    where: f.relation.where,
    select: { id: true, [f.relation.label]: true },
    orderBy: f.relation.orderBy,
    take: 1000,
  });
  return (rows as Record<string, unknown>[]).map((x) => ({ id: String(x.id), label: String(x[f.relation!.label] ?? x.id) }));
}

async function uniqueSlug(model: string, base: string, id?: string | null) {
  const root = slugify(base) || "item";
  let slug = root;
  for (let i = 2; i < 200; i++) {
    const hit = await delegate(model).findFirst({ where: { slug, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
    if (!hit) return slug;
    slug = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

/** Kampala is UTC+3 year-round: interpret date/datetime inputs as Kampala wall-clock. */
function parseDate(v: string, withTime: boolean) {
  if (!v) return null;
  if (withTime) return new Date(`${v}:00+03:00`);
  return new Date(`${v}T00:00:00+03:00`);
}

export class ValidationError extends Error {}

export const VERIFIABLE = new Set(["person", "leadershipAssignment", "project", "projectMilestone", "projectMetric", "event", "districtVisit", "story", "socialPost", "achievement", "historyEntry"]);

/** Build prisma data from FormData according to the resource's field config, then create/update. */
export async function saveRow(r: Resource, id: string | null, fd: FormData, userId: string) {
  const fields = allFields(r);
  const data: Record<string, unknown> = {};
  const isCreate = !id;
  const existing = id ? await getRow(r, id) : null;

  for (const f of fields) {
    const raw = fd.get(f.name);
    const v = typeof raw === "string" ? raw.trim() : "";
    switch (f.type) {
      case "readonly":
        break;
      case "text":
      case "textarea":
      case "markdown":
      case "url":
      case "email":
        if (f.name.startsWith("__")) break;
        if (f.required && !v) throw new ValidationError(`${f.label} is required`);
        if (f.type === "url" && v && !/^https?:\/\//i.test(v)) throw new ValidationError(`${f.label} must start with http:// or https://`);
        data[f.name] = v || null;
        break;
      case "slug":
        data[f.name] = v ? slugify(v) : null;
        break;
      case "number":
        if (f.required && v === "") throw new ValidationError(`${f.label} is required`);
        if (v !== "" && Number.isNaN(Number(v))) throw new ValidationError(`${f.label} must be a number`);
        data[f.name] = v === "" ? (f.name === "sortOrder" ? 0 : null) : Number(v);
        break;
      case "date":
      case "datetime":
        if (f.required && !v) throw new ValidationError(`${f.label} is required`);
        data[f.name] = parseDate(v, f.type === "datetime");
        break;
      case "boolean":
        data[f.name] = fd.get(f.name) === "on";
        break;
      case "select":
        if (f.required && !v) throw new ValidationError(`${f.label} is required`);
        data[f.name] = v || null;
        break;
      case "relation":
        if (f.required && !v) throw new ValidationError(`${f.label} is required`);
        data[f.name] = v || null;
        break;
      case "multiselect": {
        const vals = fd.getAll(f.name).map(String).filter((x) => !f.options || (f.options as readonly string[]).includes(x));
        data[f.name] = vals;
        break;
      }
      case "relations": {
        const ids = fd.getAll(f.name).map(String).filter(Boolean);
        data[f.name] = isCreate ? { connect: ids.map((x) => ({ id: x })) } : { set: ids.map((x) => ({ id: x })) };
        break;
      }
      case "image": {
        const file = fd.get(`${f.name}__file`) as File | null;
        if (fd.get(`${f.name}__remove`) === "on") data[f.name] = null;
        if (file && typeof file === "object" && file.size > 0) {
          const m = await saveImageUpload(file);
          if (m) data[f.name] = m.id;
        }
        break;
      }
      case "pin": {
        if (v) {
          if (!/^\d{4,8}$/.test(v)) throw new ValidationError("PIN must be 4–8 digits");
          data.pinHash = await bcrypt.hash(v, 10);
        }
        break;
      }
      case "file": {
        const file = fd.get(f.name) as File | null;
        if (file && typeof file === "object" && file.size > 0) {
          if (r.key === "photos") Object.assign(data, await processImage(file));
          else {
            const saved = await saveFileUpload(file, r.key === "videos" ? "videos" : "documents");
            if (saved) {
              data.storageKey = saved.key;
              data.mimeType = saved.mimeType;
              if (r.key === "videos") data.provider = "UPLOAD";
            }
          }
        } else if (isCreate && r.key === "photos") throw new ValidationError("Choose an image to upload (or use Upload photos)");
        break;
      }
    }
  }

  // empty select with default on create
  for (const f of fields) if (isCreate && f.type === "select" && data[f.name] == null && f.default != null) data[f.name] = f.default;

  // slug
  if (r.slugFrom && fields.some((f) => f.name === "slug")) {
    const base = (data.slug as string) || (existing?.slug as string) || (data[r.slugFrom] as string) || "";
    data.slug = await uniqueSlug(r.model, base, id);
  }
  // year auto-assign
  if (r.yearFrom && "yearId" in data && !data.yearId && data[r.yearFrom]) data.yearId = await yearIdForDate(data[r.yearFrom] as Date);
  // verification bookkeeping (only on models that track who verified)
  if ("verification" in data && VERIFIABLE.has(r.model)) {
    if (data.verification === "VERIFIED" && existing?.verification !== "VERIFIED") {
      data.verifiedAt = new Date();
      data.verifiedById = userId;
    } else if (data.verification !== "VERIFIED") {
      data.verifiedAt = null;
      data.verifiedById = null;
    }
  }
  if (isCreate && r.provenance && !data.source) data.sourceType = data.sourceType || "MANUAL";

  // resource-specific
  if (r.key === "members") {
    const newName = String(fd.get("__newPersonName") || "").trim();
    if (!data.personId) {
      if (!newName) throw new ValidationError("Choose a person or enter a new person name");
      const p = await db.person.create({ data: { name: newName, slug: await uniqueSlug("person", newName), type: "MEMBER", isPublic: false, verification: "VERIFIED", sourceType: "MANUAL" } });
      data.personId = p.id;
    }
    data.memberNumber = String(data.memberNumber || "").toUpperCase();
  }
  if (r.key === "years" && data.isCurrent) await db.rotaractYear.updateMany({ where: { isCurrent: true, NOT: id ? { id } : undefined }, data: { isCurrent: false } });
  if (r.key === "years" && !data.slug && data.label) data.slug = slugify(String(data.label));
  if (r.key === "events" && data.startTime && data.date) {
    // keep date aligned with start time day
    data.date = parseDate(new Date((data.startTime as Date).getTime() + 3 * 3600000).toISOString().slice(0, 10), false);
  }
  if (r.defaults && isCreate) Object.assign(data, r.defaults);

  const d = delegate(r.model);
  const row = isCreate ? await d.create({ data }) : await d.update({ where: { id }, data });
  return { row: row as Record<string, unknown>, data };
}

export function rowTitle(r: Resource, row: Record<string, unknown>) {
  const t = row[r.titleField];
  return (typeof t === "string" && t) || String(row.title || row.name || row.label || row.id);
}

export type Diff = Prisma.InputJsonValue;
