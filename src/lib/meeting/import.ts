import "server-only";
import ExcelJS from "exceljs";
import type { Affiliation, MeetingType, MemberStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { parseCsv } from "@/lib/csv";
import { isEmail, normalisePhone } from "@/lib/phone";
import { uniqueSlug } from "@/lib/admin/crud";
import { buddyGroupId } from "@/lib/admin/member-import";
import { MEETING, parseClock } from "./config";
import { findClub, foldName } from "./clubs";
import { dayValue, localParts, localToUtc, longDate, planMeetingFor } from "./today";
import { rotaryYearStart } from "./stats";

/**
 * Importing sign-ins from the club's old attendance sheet (one row per sign-in: name, email,
 * member yes/no, club, buddy group, date and time, phone). GPS and visit counts are ignored.
 * Planning writes nothing; applying the same plan twice adds nothing the second time.
 */

export const MAX_SIGNIN_ROWS = 20000;
/** Sign-ins after midnight but before this hour belong to the previous evening's meeting. */
const LATE_NIGHT_HOUR = 5;

/* ── Reading the file ─────────────────────────────────────────────── */

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
/** Excel stores wall-clock times; exceljs hands them over as if they were UTC. */
const wallClock = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;

function cellText(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return wallClock(v);
  if (typeof v === "object") {
    const o = v as { result?: unknown; text?: unknown; richText?: { text: string }[] };
    if (Array.isArray(o.richText)) return o.richText.map((t) => t.text).join("");
    if ("result" in o) return cellText(o.result);
    if (o.text != null) return cellText(o.text);
    return "";
  }
  return String(v);
}

/** The rows of an uploaded .xlsx or .csv file, as text (trailing empty cells dropped). */
export async function readSheet(file: File): Promise<{ rows: string[][] } | { error: string }> {
  const name = file.name.toLowerCase();
  let rows: string[][];
  if (/\.(csv|txt)$/.test(name)) rows = parseCsv(await file.text());
  else if (/\.xlsx$/.test(name)) {
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ExcelJS.Buffer);
    } catch {
      return { error: "Couldn't open that Excel file. Open it in Excel or Google Sheets, save it again as .xlsx or CSV, and retry." };
    }
    const ws = wb.worksheets.filter((w) => w.state !== "hidden" && w.state !== "veryHidden").sort((a, b) => b.actualRowCount - a.actualRowCount)[0];
    if (!ws) return { error: "That workbook has no sheets." };
    rows = [];
    ws.eachRow({ includeEmpty: true }, (row, n) => {
      const values = Array.isArray(row.values) ? (row.values as unknown[]).slice(1) : [];
      rows[n - 1] = Array.from(values, (v) => cellText(v).trim());
    });
    for (let i = 0; i < rows.length; i++) rows[i] ??= [];
  } else if (/\.xls$/.test(name)) return { error: "That's an old-style .xls file. Open it in Excel and save it as .xlsx (or CSV), then upload that." };
  else return { error: "Upload the sign-in sheet as an Excel (.xlsx) or CSV file." };
  rows = rows.map((r) => {
    let n = r.length;
    while (n > 0 && !String(r[n - 1] ?? "").trim()) n--;
    return r.slice(0, n).map((c) => String(c ?? ""));
  });
  return { rows };
}

/* ── Columns ──────────────────────────────────────────────────────── */

type Col = "name" | "email" | "member" | "club" | "group" | "date" | "phone";
const ALIASES: Record<Col, string[]> = {
  name: ["name", "fullname", "names", "membername", "yourname"],
  email: ["email", "emailaddress", "mail"],
  member: ["isclubmember", "clubmember", "ismember", "member", "kanosmember", "areyouamember", "membership"],
  club: ["clubname", "club", "homeclub", "yourclub"],
  group: ["buddygroup", "buddy", "buddies", "group"],
  date: ["date", "datetime", "timestamp", "time", "signedin", "signedinat", "signintime", "checkedin", "checkedinat", "createdat", "when"],
  phone: ["phone", "phonenumber", "mobile", "mobilenumber", "tel", "telephone", "contact", "whatsapp"],
};
const COL_LABEL: Record<Col, string> = { name: "name", email: "email", member: "member or visitor", club: "club", group: "buddy group", date: "date and time", phone: "phone" };
/** Columns the old system kept that the club no longer uses. */
const NOT_NEEDED = ["visits", "lattitude", "latitude", "longitude", "lat", "lng", "long", "gps", "location", "accuracy"];
const norm = (h: string) => h.toLowerCase().replace(/[^a-z]/g, "");
const colLetter = (i: number): string => (i >= 26 ? colLetter(Math.floor(i / 26) - 1) : "") + String.fromCharCode(65 + (i % 26));

/* ── Values ───────────────────────────────────────────────────────── */

const clip = (s: string, n: number) => s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const tokens = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, " ").trim().split(" ").filter(Boolean);
/** Same letters, any order or capitalisation: "Rogers Waneloba" = "WANELOBA ROGERS". */
const nameKey = (s: string) => tokens(s).sort().join(" ");

/** Capitalises words typed all in lower or upper case ("walter omukonzo" → "Walter Omukonzo"); leaves "McDonald" alone. */
export function tidyName(s: string) {
  return clip(s, 120)
    .split(" ")
    .map((w) => w.split(/([-'’])/).map((p) => (p.length > 1 && (p === p.toLowerCase() || p === p.toUpperCase()) ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p.length === 1 && /[a-z]/.test(p) ? p.toUpperCase() : p)).join(""))
    .join(" ");
}
const looksTidy = (s: string) => s.split(" ").every((w) => /^[\p{Lu}][\p{L}'’.-]*$/u.test(w) && w !== w.toUpperCase()) || false;

const COMMON_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "live.com", "ymail.com"];
function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
/** "gmail.con", "gmqil.com": a near miss of a common provider. */
const typoDomain = (email: string) => {
  const dom = email.split("@")[1] || "";
  return !COMMON_DOMAINS.includes(dom) && COMMON_DOMAINS.some((c) => distance(dom, c) <= 2);
};
const goodEmail = (e: string) => isEmail(e) && /\.[a-z]{2,}$/.test(e);

const TRUE_WORDS = /^(true|yes|y|1|member|kanos|x|✓)$/i;

type When = { at: Date; iso: string; hh: number };
function wall(y: number, mo: number, d: number, hh: number, mi: number, ss = 0, ms = 0): When | null {
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || check.getUTCDate() !== d || hh > 23 || mi > 59 || ss > 59) return null;
  const iso = `${y}-${pad(mo)}-${pad(d)}`;
  return { at: new Date(localToUtc(iso, hh, mi).getTime() + ss * 1000 + ms), iso, hh };
}
/** "2025-07-04 18:45:30.180" (club time), "4/7/2025 6:45 PM" (day first), an Excel serial number, or an ISO time with offset. */
function parseWhen(raw: string): When | null {
  const s = raw.trim();
  const [dh, dm] = parseClock(MEETING.MEETING_TIME);
  let m: RegExpMatchArray | null;
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = Number(s);
    if (serial < 36526 || serial > 73051) return null;
    const t = new Date(Math.round((serial - 25569) * 86400000));
    return wall(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes(), t.getUTCSeconds());
  }
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,6}))?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i))) {
    if (m[8]) {
      const at = new Date(s.replace(" ", "T"));
      if (isNaN(at.getTime())) return null;
      const p = localParts(at);
      const hh = Number(new Intl.DateTimeFormat("en-GB", { timeZone: MEETING.TIMEZONE, hour: "2-digit", hourCycle: "h23" }).format(at));
      return { at, iso: p.iso, hh };
    }
    const time = m[4] !== undefined;
    return wall(+m[1], +m[2], +m[3], time ? +m[4] : dh, time ? +m[5] : dm, m[6] ? +m[6] : 0, m[7] ? Math.round(Number(`0.${m[7]}`) * 1000) : 0);
  }
  if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\.?m\.?)?)?$/i))) {
    let hh = m[4] !== undefined ? +m[4] : dh;
    const ap = m[7]?.replace(/\./g, "").toLowerCase();
    if (ap === "pm" && hh < 12) hh += 12;
    if (ap === "am" && hh === 12) hh = 0;
    return wall(+m[3], +m[2], +m[1], hh, m[5] !== undefined ? +m[5] : dm, m[6] ? +m[6] : 0);
  }
  return null;
}
const previousDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
};

/** Rotarian, Rotaractor or prospect, and the club as the club list spells it. */
function visitorOf(rawClub: string): { affiliation: Affiliation; clubName: string | null } {
  const club = clip(rawClub, 140);
  const f = foldName(club);
  const isHome = f.includes(foldName("Kampala North")) && f.startsWith("rotaract");
  if (!club || /^(no ?club|none|n\/?a|-|nil|not applicable)$/i.test(club) || isHome) return { affiliation: "PROSPECT", clubName: null };
  const type = /^rotary\b/i.test(club) ? "ROTARY" : /^rotaract\b/i.test(club) ? "ROTARACT" : undefined;
  const listed = findClub(club, type);
  const affiliation: Affiliation = (listed?.type ?? type) === "ROTARY" ? "ROTARIAN" : (listed?.type ?? type) === "ROTARACT" ? "ROTARACTOR" : "PROSPECT";
  if (affiliation === "PROSPECT") return { affiliation, clubName: null };
  return { affiliation, clubName: listed?.name ?? tidyName(club).replace(/ (Of|And|The|At) /g, (w) => w.toLowerCase()) };
}

/** Same person's name typed differently: "simeone" ~ "Simon Kazooba", "Kizzajanet" ~ "Janet Kizza", "Brendah" ~ "Brenda". */
function sameishName(a: string, b: string) {
  const ta = tokens(a), tb = tokens(b);
  const close = (x: string, y: string) => {
    const n = Math.min(x.length, y.length);
    return x === y || (n >= 4 && (x.includes(y) || y.includes(x))) || (n >= 4 && distance(x, y) <= 1) || (n >= 5 && distance(x, y) <= 2);
  };
  if (ta.some((x) => tb.some((y) => close(x, y)))) return true;
  const sa = ta.join(""), sb = tb.join("");
  return ta.some((x) => x.length >= 4 && sb.includes(x)) || tb.some((y) => y.length >= 4 && sa.includes(y));
}
/** Every word of the shorter name matches a word of the longer one: "Simeone Kazooba" ~ "Simon Kazooba". */
function likelySame(a: string, b: string) {
  const [ta, tb] = [tokens(a), tokens(b)].sort((x, y) => x.length - y.length);
  if (ta.length < 2) return false;
  return ta.every((x) => tb.some((y) => x === y || (Math.min(x.length, y.length) >= 5 && distance(x, y) <= 2)));
}
/** The most used name (as a name key); on a tie, the fuller one. */
function majority(names: string[]) {
  const c = new Map<string, number>();
  for (const n of names) c.set(nameKey(n), (c.get(nameKey(n)) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1] || b[0].split(" ").length - a[0].split(" ").length)[0][0];
}

/* ── The plan ─────────────────────────────────────────────────────── */

type Entry = { line: number; name: string; email: string | null; phone: string | null; member: boolean; club: string; group: string; at: Date; day: string };

type PersonOut = {
  key: string;
  name: string;
  action: "new" | "existing";
  memberNumber: string;
  status: MemberStatus;
  emails: string[];
  phone: string | null;
  group: string | null;
  signIns: number;
  first: string;
  last: string;
  notes: string[];
  /** other people in the file with a look-alike name: the admin can say they're the same person */
  lookalikes: { key: string; name: string; memberNumber: string }[];
  /** how many separate people the admin merged into this one */
  merged: number;
  /** for someone already in the register: what the import fills in */
  changes: string[];
};
export type ImportPreview = {
  fileRows: number;
  columns: { column: string; heading: string; as: string }[];
  ignored: string[];
  counts: { signIns: number; members: number; visitors: number; duplicates: number; already: number; skipped: number; newMeetings: number; existingMeetings: number; newPeople: number; existingPeople: number; updates: number; newGroups: number };
  meetings: { day: string; label: string; title: string; type: MeetingType; members: number; visitors: number; existing: boolean; already: number }[];
  people: PersonOut[];
  groups: { name: string; isNew: boolean; people: number }[];
  skipped: { line: number; name: string; reason: string }[];
  notes: { line: number; name: string; note: string }[];
};
type Writes = {
  groups: string[];
  people: { key: string; memberId?: string; personId?: string; name: string; memberNumber: string; email: string | null; phone: string | null; status: MemberStatus; notes: string; group: string | null; update: { email?: string; phone?: string; group?: string } }[];
  meetings: { day: string; existingId?: string; create?: { title: string; type: MeetingType; date: Date; venue: string | null; eventId: string | null } }[];
  records: { day: string; personKey: string | null; name: string; email: string | null; phone: string | null; isGuest: boolean; affiliation: Affiliation; clubName: string | null; group: string | null; at: Date }[];
};
export type ImportPlan = { error?: string; preview?: ImportPreview; writes?: Writes };

export async function planSignInImport(rows: string[][], opts: { now?: Date; sameAs?: [string, string][] } = {}): Promise<ImportPlan> {
  const now = opts.now ?? new Date();
  const headerAt = rows.findIndex((r) => r.some((c) => c.trim()));
  if (headerAt < 0 || rows.length - headerAt < 2) return { error: "The file needs a row of column headings and at least one sign-in." };
  const header = rows[headerAt];
  const body = rows.slice(headerAt + 1).map((r, i) => ({ r, line: headerAt + i + 2 })).filter(({ r }) => r.some((c) => c.trim()));
  if (body.length > MAX_SIGNIN_ROWS) return { error: `The file has ${body.length} rows; the limit is ${MAX_SIGNIN_ROWS}. Split it into smaller files.` };

  /* columns */
  const col: Partial<Record<Col, number>> = {};
  const columns: ImportPreview["columns"] = [];
  const ignored: string[] = [];
  const width = Math.max(...rows.map((r) => r.length));
  for (let i = 0; i < width; i++) {
    const h = (header[i] || "").trim();
    const key = norm(h);
    const field = (Object.keys(ALIASES) as Col[]).find((f) => ALIASES[f].includes(key) && col[f] === undefined);
    if (field) {
      col[field] = i;
      columns.push({ column: colLetter(i), heading: h, as: COL_LABEL[field] });
    } else if (h) ignored.push(NOT_NEEDED.includes(key) ? `${h} (not used any more)` : h);
  }
  // The old sheet added phone numbers in a column with no heading.
  if (col.phone === undefined) {
    for (let i = 0; i < width; i++) {
      if ((header[i] || "").trim() || Object.values(col).includes(i)) continue;
      const vals = body.map(({ r }) => (r[i] || "").trim()).filter(Boolean);
      if (vals.length >= 3 && vals.every((v) => /^[+\d][\d\s().-]{6,}$/.test(v)) && vals.filter((v) => normalisePhone(v)).length >= vals.length * 0.8) {
        col.phone = i;
        columns.push({ column: colLetter(i), heading: "(no heading)", as: "phone" });
        break;
      }
    }
  }
  if (col.name === undefined) return { error: 'No "Name" column found. The first row must hold the column headings, including Name and Date.' };
  if (col.date === undefined) return { error: 'No date column found. The sheet needs a column called Date (or Timestamp) with when each person signed in.' };

  /* rows → entries */
  const get = (r: string[], c: Col) => (col[c] !== undefined ? (r[col[c]!] || "").trim() : "");
  const skipped: ImportPreview["skipped"] = [];
  const notes: ImportPreview["notes"] = [];
  const entries: Entry[] = [];
  const latest = now.getTime() + 24 * 3600 * 1000;
  for (const { r, line } of body) {
    const rawName = clip(get(r, "name"), 120);
    if (rawName.length < 2) {
      skipped.push({ line, name: "(no name)", reason: "No name." });
      continue;
    }
    const rawDate = get(r, "date");
    const when = rawDate ? parseWhen(rawDate) : null;
    if (!when) {
      skipped.push({ line, name: rawName, reason: rawDate ? `Couldn't read the date "${clip(rawDate, 40)}".` : "No date." });
      continue;
    }
    if (when.at.getTime() > latest) {
      skipped.push({ line, name: rawName, reason: "The date is in the future." });
      continue;
    }
    const rawEmail = clip(get(r, "email"), 200).toLowerCase().replace(/\s+/g, "");
    const email = rawEmail && goodEmail(rawEmail) ? rawEmail : null;
    if (rawEmail && !email) notes.push({ line, name: rawName, note: `"${rawEmail}" isn't a valid email address; left it out.` });
    const rawPhone = clip(get(r, "phone"), 40);
    const phone = rawPhone ? normalisePhone(rawPhone) : null;
    if (rawPhone && !phone) notes.push({ line, name: rawName, note: `"${rawPhone}" is too short for a phone number; left it out.` });
    const rawMember = get(r, "member");
    const club = get(r, "club");
    const member = col.member !== undefined ? TRUE_WORDS.test(rawMember) : foldName(club).includes(foldName("Kampala North")) && /^rotaract/i.test(club);
    const day = when.hh < LATE_NIGHT_HOUR ? previousDay(when.iso) : when.iso;
    entries.push({ line, name: rawName, email, phone, member, club, group: clip(get(r, "group"), 60), at: when.at, day });
  }

  /* what the club already has */
  const days = [...new Set(entries.map((e) => e.day))].sort();
  const [members, freePeople, groupsNow, meetingsNow, usedEmails] = await Promise.all([
    db.member.findMany({ select: { id: true, memberNumber: true, email: true, phone: true, status: true, buddyGroup: { select: { name: true } }, person: { select: { name: true } } } }),
    db.person.findMany({ where: { member: null, type: "MEMBER" }, select: { id: true, name: true } }),
    db.buddyGroup.findMany({ select: { name: true } }),
    db.meeting.findMany({ where: { day: { in: days.map(dayValue) } }, include: { records: { select: { memberId: true, email: true, name: true } } } }),
    // addresses members have signed in with before (including ones merged from typos)
    db.attendanceRecord.findMany({ where: { memberId: { not: null }, email: { not: null } }, select: { email: true, memberId: true }, distinct: ["email", "memberId"] }),
  ]);
  const memberByEmail = new Map(members.filter((m) => m.email).map((m) => [m.email!.toLowerCase(), m]));
  const memberById = new Map(members.map((m) => [m.id, m]));
  const signInOwners = new Map<string, Set<string>>();
  for (const u of usedEmails) signInOwners.set(u.email!.toLowerCase(), (signInOwners.get(u.email!.toLowerCase()) || new Set()).add(u.memberId!));
  /** a member this address belongs to: their own email, or one only they have signed in with */
  const memberForEmail = (em: string) => {
    const direct = memberByEmail.get(em);
    if (direct) return direct;
    const owners = signInOwners.get(em);
    return owners?.size === 1 ? memberById.get([...owners][0]) : undefined;
  };
  const memberByPhone = new Map(members.filter((m) => normalisePhone(m.phone)).map((m) => [normalisePhone(m.phone)!, m]));
  const membersByName = new Map<string, typeof members>();
  for (const m of members) membersByName.set(nameKey(m.person.name), [...(membersByName.get(nameKey(m.person.name)) || []), m]);
  const freeByName = new Map<string, typeof freePeople>();
  for (const p of freePeople) freeByName.set(nameKey(p.name), [...(freeByName.get(nameKey(p.name)) || []), p]);
  const groupName = new Map(groupsNow.map((g) => [g.name.toLowerCase(), g.name]));
  const meetingByDay = new Map(meetingsNow.map((m) => [m.day.toISOString().slice(0, 10), m]));

  /* who is who: member rows grouped into people, despite typos in names and emails */
  const memberRows = entries.filter((e) => e.member);
  const byEmail = new Map<string, Entry[]>();
  for (const e of memberRows) if (e.email) byEmail.set(e.email, [...(byEmail.get(e.email) || []), e]);
  const emailName = new Map([...byEmail.entries()].map(([em, list]) => [em, majority(list.map((e) => e.name))]));
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    const p = parent.get(k) ?? k;
    if (p === k) return k;
    const root = find(p);
    parent.set(k, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };
  const rowKey = new Map<Entry, string>();
  const ownNames = new Map<string, Set<string>>(); // email → names used with it by its owner
  for (const e of memberRows) {
    const own = e.email ? emailName.get(e.email)! : null;
    // Someone signing in with another member's email ("Annet" on Richard's address) is identified by name.
    const k = e.email && own && sameishName(e.name, own) ? `e:${e.email}` : `n:${nameKey(e.name)}`;
    rowKey.set(e, k);
    find(k);
    if (k.startsWith("e:")) ownNames.set(e.email!, (ownNames.get(e.email!) || new Set()).add(nameKey(e.name)));
  }
  // Addresses that share a name are one person (typos, a second address) …
  const nameAnchor = new Map<string, string>();
  for (const k of new Set(rowKey.values())) {
    const names = k.startsWith("e:") ? [...ownNames.get(k.slice(2))!] : [k.slice(2)];
    for (const nk of names) {
      if (nameAnchor.has(nk)) union(nameAnchor.get(nk)!, k);
      else nameAnchor.set(nk, k);
    }
  }
  // … and so are the same address at a mistyped provider ("marvlyn22a@mail.com" = "@gmail.com").
  const owned = [...new Set([...rowKey.values()].filter((k) => k.startsWith("e:")).map((k) => k.slice(2)))];
  for (const a of owned)
    for (const b of owned) {
      if (a >= b) continue;
      const [la, da] = a.split("@"), [lb, db_] = b.split("@");
      if (la === lb && la.length >= 4 && distance(da, db_) <= 2) union(`e:${a}`, `e:${b}`);
    }
  // People the admin said are the same (keys from the previous preview).
  const roots = new Set(memberRows.map((e) => find(rowKey.get(e)!)));
  const mergedCount = new Map<string, number>();
  for (const [a, b] of opts.sameAs || []) {
    if (!roots.has(a) || !roots.has(b) || find(a) === find(b)) continue;
    const before = (mergedCount.get(find(a)) || 1) + (mergedCount.get(find(b)) || 1);
    union(a, b);
    mergedCount.set(find(a), before);
  }
  // People in the file whose own email or phone belongs to the same register entry are that one member.
  const owner = new Map<string, string>(); // member id → a key in that person's group
  for (const e of memberRows) {
    const k = rowKey.get(e)!;
    const m = (k.startsWith("e:") ? memberForEmail(e.email!) : undefined) ?? (e.phone ? memberByPhone.get(e.phone) : undefined);
    if (!m) continue;
    if (owner.has(m.id)) union(owner.get(m.id)!, k);
    else owner.set(m.id, k);
  }
  const clusters = new Map<string, Entry[]>();
  for (const e of memberRows) {
    const root = find(rowKey.get(e)!);
    clusters.set(root, [...(clusters.get(root) || []), e]);
  }

  let nextNo = Math.max(0, ...members.map((m) => Number(m.memberNumber.match(/^KN-(\d+)$/i)?.[1] || 0)));
  const usedNumbers = new Set(members.map((m) => m.memberNumber.toUpperCase()));
  const newNumber = () => {
    let id: string;
    do id = `KN-${String(++nextNo).padStart(4, "0")}`;
    while (usedNumbers.has(id));
    usedNumbers.add(id);
    return id;
  };
  const yearStart = rotaryYearStart(now);
  const groupsSeen = new Map<string, { name: string; people: number }>();
  const canonicalGroup = (g: string) => {
    if (!g) return null;
    const name = groupName.get(g.toLowerCase()) ?? groupsSeen.get(g.toLowerCase())?.name ?? g;
    return name;
  };

  const people: PersonOut[] = [];
  const writePeople: Writes["people"] = [];
  const claimed = new Map<string, string>(); // existing member id → person key
  const personOf = new Map<Entry, string>();
  const nameOf = new Map<string, string>();

  for (const [key, list] of [...clusters.entries()].sort((a, b) => a[1][0].at.getTime() - b[1][0].at.getTime())) {
    list.sort((a, b) => a.at.getTime() - b.at.getTime());
    for (const e of list) personOf.set(e, key);
    const pnotes: string[] = [];
    // name: the tidiest common spelling of the most-used name
    // A full name beats a single word, however often the single word was used ("Simeone" → "Simon Kazooba").
    const full = list.filter((e) => tokens(e.name).length >= 2);
    const named = full.length ? full : list;
    const mk = majority(named.map((e) => e.name));
    const variants = new Map<string, number>();
    for (const e of named) if (nameKey(e.name) === mk) variants.set(e.name, (variants.get(e.name) || 0) + 1);
    const pick = [...variants.entries()].sort((a, b) => Number(looksTidy(b[0])) - Number(looksTidy(a[0])) || b[1] - a[1])[0][0];
    const name = tidyName(pick);
    if (name.split(" ").length < 2) pnotes.push("Only one name was given in the sign-ins; add their full name.");
    // emails: most used first, near-miss domains ("gmail.con") last
    const emailUse = new Map<string, { n: number; last: number }>();
    // Only addresses this person signed in with as themselves: not another member's, borrowed for one evening.
    for (const e of list) if (e.email && rowKey.get(e)!.startsWith("e:")) emailUse.set(e.email, { n: (emailUse.get(e.email)?.n || 0) + 1, last: e.at.getTime() });
    const emails = [...emailUse.entries()].sort((a, b) => Number(typoDomain(a[0])) - Number(typoDomain(b[0])) || b[1].n - a[1].n || b[1].last - a[1].last).map(([em]) => em);
    const phone = [...list].reverse().find((e) => e.phone)?.phone ?? null;
    const grouped = list.filter((e) => e.group);
    const latestGroup = grouped.length ? grouped[grouped.length - 1].group : "";
    const distinctGroups = [...new Set(grouped.map((e) => e.group.toLowerCase()))];
    const group = canonicalGroup(latestGroup);
    if (distinctGroups.length > 1) pnotes.push(`Signed in under ${distinctGroups.length} buddy groups (${[...new Set(grouped.map((e) => e.group))].join(", ")}); used the latest, ${group}.`);
    if (emails.length > 1) pnotes.push(`Also signed in as ${emails.slice(1).join(", ")}.`);
    const borrowed = [...new Set(list.filter((e) => e.email && rowKey.get(e)!.startsWith("n:")).map((e) => e.email!))];
    if (borrowed.length) pnotes.push(`Once signed in with someone else's email (${borrowed.join(", ")}); that address isn't added to their record.`);
    const lastAt = list[list.length - 1].at;
    const firstDay = list[0].day;

    // the same person in the register?
    let existing = emails.map((em) => memberForEmail(em)).find(Boolean) ?? (phone ? memberByPhone.get(phone) : undefined);
    if (!existing) {
      const same = membersByName.get(nameKey(name)) || [];
      if (same.length === 1) existing = same[0];
      else if (same.length > 1) pnotes.push(`${same.length} members in the register are called "${name}"; added a new record. Merge by hand if it's one of them.`);
    }
    if (existing && claimed.has(existing.id)) {
      pnotes.push(`Matched the same register entry as another person in the file (${existing.person.name}); added separately.`);
      existing = undefined;
    }
    const g = group ? groupsSeen.get(group.toLowerCase()) : undefined;
    if (group) groupsSeen.set(group.toLowerCase(), { name: group, people: (g?.people || 0) + 1 });

    if (existing) {
      claimed.set(existing.id, key);
      const update: Writes["people"][number]["update"] = {};
      if (!existing.email && emails[0]) update.email = emails[0];
      if (!existing.phone && phone) update.phone = phone;
      if (group && !existing.buddyGroup) update.group = group;
      if (group && existing.buddyGroup && existing.buddyGroup.name.toLowerCase() !== group.toLowerCase())
        pnotes.push(`The register has buddy group ${existing.buddyGroup.name}; the old sheet says ${group}. Kept ${existing.buddyGroup.name}.`);
      if (nameKey(existing.person.name) !== nameKey(name)) pnotes.push(`Signed in as "${name}"; the register calls them "${existing.person.name}".`);
      nameOf.set(key, existing.person.name);
      writePeople.push({ key, memberId: existing.id, name: existing.person.name, memberNumber: existing.memberNumber, email: existing.email, phone: existing.phone, status: existing.status, notes: "", group, update });
      people.push({ key, name: existing.person.name, action: "existing", memberNumber: existing.memberNumber, status: existing.status, emails, phone, group: existing.buddyGroup?.name ?? group, signIns: list.length, first: firstDay, last: list[list.length - 1].day, notes: pnotes, lookalikes: [], merged: mergedCount.get(key) || 1, changes: [update.email && "email added", update.phone && "phone added", update.group && `buddy group ${update.group}`].filter((x): x is string => !!x) });
    } else {
      const free = freeByName.get(nameKey(name)) || [];
      const reuse = free.length === 1 ? free[0] : undefined;
      if (reuse) freeByName.delete(nameKey(name));
      const status: MemberStatus = lastAt >= yearStart ? "ACTIVE" : "INACTIVE";
      const memberNumber = newNumber();
      nameOf.set(key, name);
      const memberNote = `Added from the old sign-in records. First signed in as a member on ${longDate(list[0].at)}.`;
      writePeople.push({ key, personId: reuse?.id, name, memberNumber, email: emails[0] ?? null, phone, status, notes: memberNote, group, update: {} });
      people.push({ key, name, action: "new", memberNumber, status, emails, phone, group, signIns: list.length, first: firstDay, last: list[list.length - 1].day, notes: reuse ? [`Linked to the existing hidden profile "${reuse.name}".`, ...pnotes] : pnotes, lookalikes: [], merged: mergedCount.get(key) || 1, changes: [] });
    }
  }

  // Look-alike names that weren't merged automatically: flag them for a person to decide.
  const knownGroups = new Set([...groupsSeen.keys(), ...groupName.keys()]);
  for (const a of people) {
    if (knownGroups.has(a.name.toLowerCase())) a.notes.push("The name is the same as a buddy group's; check who this is.");
    for (const b of people) if (a !== b && likelySame(a.name, b.name)) a.lookalikes.push({ key: b.key, name: b.name, memberNumber: b.memberNumber });
  }

  /* meetings and sign-ins */
  const records: Writes["records"] = [];
  const perDay = new Map<string, { members: number; visitors: number; already: number }>();
  const seen = new Set<string>();
  let duplicates = 0, already = 0;
  const bump = (day: string, k: "members" | "visitors" | "already") => {
    const d = perDay.get(day) || { members: 0, visitors: 0, already: 0 };
    d[k]++;
    perDay.set(day, d);
  };
  const ordered = [...entries].sort((a, b) => Number(b.member) - Number(a.member) || a.at.getTime() - b.at.getTime());
  for (const e of ordered) {
    const existingMeeting = meetingByDay.get(e.day);
    if (e.member) {
      const pk = personOf.get(e)!;
      const wp = writePeople.find((p) => p.key === pk)!;
      const k = `${e.day}|p:${pk}`;
      if (seen.has(k)) { duplicates++; continue; }
      seen.add(k);
      if (e.email) seen.add(`${e.day}|e:${e.email}`);
      seen.add(`${e.day}|n:${nameKey(nameOf.get(pk)!)}`);
      if (existingMeeting && existingMeeting.records.some((r) => (wp.memberId && r.memberId === wp.memberId) || (e.email && r.email?.toLowerCase() === e.email))) { already++; bump(e.day, "already"); continue; }
      const ownEmail = rowKey.get(e)!.startsWith("e:") ? e.email : null;
      records.push({ day: e.day, personKey: pk, name: nameOf.get(pk)!, email: ownEmail, phone: e.phone, isGuest: false, affiliation: MEETING.CLUB_TYPE === "ROTARY" ? "ROTARIAN" : "ROTARACTOR", clubName: MEETING.CLUB_NAME, group: canonicalGroup(e.group), at: e.at });
      bump(e.day, "members");
    } else {
      const name = tidyName(e.name);
      const k = e.email ? `${e.day}|e:${e.email}` : `${e.day}|n:${nameKey(name)}`;
      if (seen.has(k)) { duplicates++; continue; }
      seen.add(k);
      if (existingMeeting && existingMeeting.records.some((r) => (e.email ? r.email?.toLowerCase() === e.email : nameKey(r.name) === nameKey(name)))) { already++; bump(e.day, "already"); continue; }
      const v = visitorOf(e.club);
      records.push({ day: e.day, personKey: null, name, email: e.email, phone: e.phone, isGuest: true, affiliation: v.affiliation, clubName: v.clubName, group: null, at: e.at });
      bump(e.day, "visitors");
    }
  }

  const meetings: ImportPreview["meetings"] = [];
  const writeMeetings: Writes["meetings"] = [];
  for (const day of days) {
    const ex = meetingByDay.get(day);
    const counts = perDay.get(day) || { members: 0, visitors: 0, already: 0 };
    if (ex) {
      writeMeetings.push({ day, existingId: ex.id });
      meetings.push({ day, label: longDate(ex.date), title: ex.title, type: ex.type, ...counts, existing: true });
    } else {
      const first = entries.filter((e) => e.day === day).sort((a, b) => a.at.getTime() - b.at.getTime())[0];
      // plan by the day itself (noon), so a sign-in just after midnight still lands on the evening's meeting
      const plan = await planMeetingFor(localToUtc(day, 12, 0));
      const create = { ...plan, date: plan.type === "GATHERING" ? first.at : plan.date };
      writeMeetings.push({ day, create });
      meetings.push({ day, label: longDate(create.date), title: create.title, type: create.type, ...counts, existing: false });
    }
  }

  const groups = [...groupsSeen.values()].map((g) => ({ name: g.name, isNew: !groupName.has(g.name.toLowerCase()), people: g.people })).sort((a, b) => b.people - a.people);
  const preview: ImportPreview = {
    fileRows: body.length,
    columns,
    ignored,
    counts: {
      signIns: records.length,
      members: records.filter((r) => !r.isGuest).length,
      visitors: records.filter((r) => r.isGuest).length,
      duplicates,
      already,
      skipped: skipped.length,
      newMeetings: meetings.filter((m) => !m.existing).length,
      existingMeetings: meetings.filter((m) => m.existing).length,
      newPeople: people.filter((p) => p.action === "new").length,
      existingPeople: people.filter((p) => p.action === "existing").length,
      updates: people.filter((p) => p.changes.length).length,
      newGroups: groups.filter((g) => g.isNew).length,
    },
    meetings: meetings.reverse(),
    people: people.sort((a, b) => a.name.localeCompare(b.name)),
    groups,
    skipped,
    notes: notes.slice(0, 300),
  };
  return { preview, writes: { groups: groups.map((g) => g.name), people: writePeople, meetings: writeMeetings, records } };
}

/** Carries out a plan. Safe to run again: anything already there is left alone. */
export async function applySignInImport(plan: ImportPlan, userId: string) {
  const w = plan.writes!;
  const failed: string[] = [];
  const groupIds = new Map<string, string>();
  const groupsBefore = await db.buddyGroup.count();
  for (const g of w.groups) groupIds.set(g.toLowerCase(), await buddyGroupId(g));
  const groupsCreated = (await db.buddyGroup.count()) - groupsBefore;

  const memberIds = new Map<string, string>();
  let peopleCreated = 0, peopleUpdated = 0;
  for (const p of w.people) {
    try {
      if (p.memberId) {
        const data: { email?: string; phone?: string; buddyGroupId?: string } = {};
        if (p.update.email) data.email = p.update.email;
        if (p.update.phone) data.phone = p.update.phone;
        if (p.update.group) data.buddyGroupId = groupIds.get(p.update.group.toLowerCase());
        if (Object.keys(data).length) {
          await db.member.update({ where: { id: p.memberId }, data });
          peopleUpdated++;
        }
        memberIds.set(p.key, p.memberId);
      } else {
        // Already added by an earlier run that stopped part-way? Then reuse it.
        const again = p.email ? await db.member.findFirst({ where: { email: { equals: p.email, mode: "insensitive" } }, select: { id: true } }) : null;
        if (again) {
          memberIds.set(p.key, again.id);
          continue;
        }
        const personId =
          p.personId ??
          (await db.person.create({ data: { name: p.name, slug: await uniqueSlug("person", p.name), type: "MEMBER", isPublic: false, verification: "VERIFIED", sourceType: "IMPORT" }, select: { id: true } })).id;
        const m = await db.member.create({
          data: { personId, memberNumber: p.memberNumber, email: p.email, phone: p.phone, status: p.status, notes: p.notes, buddyGroupId: p.group ? groupIds.get(p.group.toLowerCase()) : undefined },
          select: { id: true },
        });
        memberIds.set(p.key, m.id);
        peopleCreated++;
      }
    } catch (e) {
      failed.push(`${p.name}: ${(e as Error).message.split("\n").pop()?.slice(0, 160)}`);
    }
  }

  const meetingIds = new Map<string, string>();
  let meetingsCreated = 0;
  for (const m of w.meetings) {
    if (m.existingId) {
      meetingIds.set(m.day, m.existingId);
      continue;
    }
    const res = await db.meeting.createMany({ data: [{ ...m.create!, day: dayValue(m.day) }], skipDuplicates: true });
    meetingsCreated += res.count;
    meetingIds.set(m.day, (await db.meeting.findUniqueOrThrow({ where: { day: dayValue(m.day) }, select: { id: true } })).id);
  }

  const data = w.records
    .map((r) => ({
      meetingId: meetingIds.get(r.day)!,
      memberId: r.personKey ? memberIds.get(r.personKey) ?? null : null,
      name: r.name,
      email: r.email,
      phone: r.phone,
      isGuest: r.isGuest,
      affiliation: r.affiliation,
      clubName: r.clubName,
      // the group on that row; groups that weren't in the preview aren't created here
      buddyGroupId: r.group ? groupIds.get(r.group.toLowerCase()) ?? null : null,
      method: "IMPORT" as const,
      recordedById: userId,
      checkedInAt: r.at,
      skip: !!r.personKey && !memberIds.get(r.personKey),
    }))
    .filter((r) => !r.skip)
    .map(({ skip: _s, ...r }) => r);
  let recordsCreated = 0;
  for (let i = 0; i < data.length; i += 500) recordsCreated += (await db.attendanceRecord.createMany({ data: data.slice(i, i + 500), skipDuplicates: true })).count;
  return { groupsCreated, peopleCreated, peopleUpdated, meetingsCreated, recordsCreated, failed };
}
