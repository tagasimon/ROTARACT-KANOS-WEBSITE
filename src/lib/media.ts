import "server-only";
import sharp from "sharp";
import path from "node:path";
import { db } from "./db";
import { storage, newKey, mimeFor } from "./storage";
import type { Prisma } from "@prisma/client";

export const IMAGE_WIDTHS = { sm: 480, md: 960, lg: 1600, xl: 2400 } as const;

/** Convert an uploaded image into responsive WebP variants in storage. */
export async function processImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed here");
  if (file.size > 20 * 1024 * 1024) throw new Error("Image too large (max 20 MB)");
  const input = Buffer.from(await file.arrayBuffer());
  const img = sharp(input, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  const base = newKey("images", "");
  const variants: Record<string, string> = {};
  for (const [name, w] of Object.entries(IMAGE_WIDTHS)) {
    if (meta.width && meta.width < w && name !== "sm") continue;
    const buf = await sharp(input, { failOn: "none" }).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    const key = `${base}-${name}.webp`;
    await storage().put(key, buf, "image/webp");
    variants[name] = key;
  }
  const largest = variants.xl || variants.lg || variants.md || variants.sm;
  return { storageKey: largest, variants, width: meta.width ?? null, height: meta.height ?? null, mimeType: "image/webp", provider: "UPLOAD" as const };
}

/** Store an uploaded image as responsive WebP variants and create a Media row. */
export async function saveImageUpload(file: File, extra: Partial<Prisma.MediaUncheckedCreateInput> = {}) {
  if (!file || file.size === 0) return null;
  const img = await processImage(file);
  return db.media.create({
    data: { kind: "IMAGE", ...img, alt: extra.alt ?? path.parse(file.name).name.replace(/[-_]+/g, " "), ...extra },
  });
}

export async function saveFileUpload(file: File, prefix = "documents") {
  if (!file || file.size === 0) return null;
  if (file.size > 50 * 1024 * 1024) throw new Error("File too large (max 50 MB)");
  const ext = path.extname(file.name).toLowerCase().slice(0, 8);
  const key = newKey(prefix, ext);
  await storage().put(key, Buffer.from(await file.arrayBuffer()), file.type || mimeFor(key));
  return { key, mimeType: file.type || mimeFor(key) };
}

type MediaLike = { storageKey?: string | null; url?: string | null; variants?: unknown; alt?: string | null; width?: number | null; height?: number | null } | null | undefined;

export function mediaSrc(m: MediaLike, size: keyof typeof IMAGE_WIDTHS = "lg") {
  if (!m) return null;
  const v = (m.variants as Record<string, string> | null) || null;
  if (v) {
    const order: (keyof typeof IMAGE_WIDTHS)[] = ["sm", "md", "lg", "xl"];
    const idx = order.indexOf(size);
    for (let i = idx; i >= 0; i--) if (v[order[i]]) return storage().publicUrl(v[order[i]]);
    for (const k of order) if (v[k]) return storage().publicUrl(v[k]);
  }
  if (m.storageKey) return storage().publicUrl(m.storageKey);
  return m.url || null;
}

export function mediaSrcSet(m: MediaLike) {
  const v = (m?.variants as Record<string, string> | null) || null;
  if (!v) return undefined;
  return Object.entries(IMAGE_WIDTHS)
    .filter(([k]) => v[k])
    .map(([k, w]) => `${storage().publicUrl(v[k])} ${w}w`)
    .join(", ");
}

export function youtubeId(url?: string | null) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m?.[1] ?? null;
}
