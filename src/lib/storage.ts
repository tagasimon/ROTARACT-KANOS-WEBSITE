import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Storage abstraction: local VPS disk (a persistent Coolify volume) today,
 * any S3-compatible bucket tomorrow — switch with STORAGE_DRIVER=s3.
 */
export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: Buffer; contentType?: string } | null>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".avif": "image/avif", ".gif": "image/gif", ".svg": "image/svg+xml", ".pdf": "application/pdf",
  ".mp4": "video/mp4", ".webm": "video/webm", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
export const mimeFor = (key: string) => MIME[path.extname(key).toLowerCase()] || "application/octet-stream";

function safeKey(key: string) {
  const k = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (k.split("/").some((p) => p === ".." || p === "")) throw new Error("Invalid storage key");
  return k;
}

class LocalDriver implements StorageDriver {
  root = path.resolve(process.env.STORAGE_LOCAL_DIR || "./storage");
  async put(key: string, body: Buffer) {
    const file = path.join(this.root, safeKey(key));
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
  }
  async get(key: string) {
    try {
      const body = await fs.readFile(path.join(this.root, safeKey(key)));
      return { body, contentType: mimeFor(key) };
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    await fs.rm(path.join(this.root, safeKey(key)), { force: true });
  }
  publicUrl(key: string) {
    return `/media/${safeKey(key)}`;
  }
}

class S3Driver implements StorageDriver {
  client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID || "", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "" },
  });
  bucket = process.env.S3_BUCKET || "";
  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: safeKey(key), Body: body, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
  }
  async get(key: string) {
    try {
      const r = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }));
      const body = Buffer.from(await r.Body!.transformToByteArray());
      return { body, contentType: r.ContentType };
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }));
  }
  publicUrl(key: string) {
    const base = process.env.S3_PUBLIC_URL;
    return base ? `${base.replace(/\/$/, "")}/${safeKey(key)}` : `/media/${safeKey(key)}`;
  }
}

let driver: StorageDriver | null = null;
export function storage(): StorageDriver {
  if (!driver) driver = process.env.STORAGE_DRIVER === "s3" ? new S3Driver() : new LocalDriver();
  return driver;
}

export function newKey(prefix: string, ext: string) {
  const d = new Date();
  return `${prefix}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomBytes(8).toString("hex")}${ext}`;
}
