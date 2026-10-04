import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const TZ = "Africa/Kampala";

export function fmtDate(d?: Date | string | null, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).format(new Date(d));
}
export function fmtMonthYear(d?: Date | string | null) {
  return fmtDate(d, { month: "long", year: "numeric" });
}
export function fmtTime(d?: Date | string | null) {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(d));
}
export function fmtShort(d?: Date | string | null) {
  return fmtDate(d, { day: "numeric", month: "short", year: "numeric" });
}
export function fmtNumber(n: number) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1, notation: n >= 100000 ? "compact" : "standard" }).format(n);
}

export function humanize(e?: string | null) {
  if (!e) return "";
  return e.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function truncate(s: string | null | undefined, n: number) {
  if (!s) return "";
  const t = s.replace(/[#*_>`]/g, "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/**
 * Public base URL from APP_URL. Tolerates a missing scheme ("example.org"), quotes,
 * whitespace and trailing slashes; never throws (a bad value used to crash every page).
 */
export function baseUrl() {
  const raw = (process.env.APP_URL || "").trim().replace(/^["']|["']$/g, "");
  if (!raw) return "http://localhost:3000";
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`);
    if (!u.hostname) throw new Error("no host");
    return u.origin;
  } catch {
    return "http://localhost:3000";
  }
}

export function absoluteUrl(path = "/") {
  return baseUrl() + (path.startsWith("/") ? path : "/" + path);
}

/** Dice coefficient on character bigrams — used for duplicate detection. */
export function similarity(a: string, b: string) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const x = norm(a), y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const bigrams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) || 0) + 1);
    }
    return m;
  };
  const bx = bigrams(x), by = bigrams(y);
  let inter = 0;
  for (const [g, c] of bx) inter += Math.min(c, by.get(g) || 0);
  return (2 * inter) / (x.length - 1 + (y.length - 1));
}

export function daysBetween(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime()) / 86400000;
}
