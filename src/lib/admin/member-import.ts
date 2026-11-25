import "server-only";
import type { MemberStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { kampalaDay, parseCsv } from "@/lib/csv";
import { isEmail, normalisePhone } from "@/lib/phone";
import { uniqueSlug } from "@/lib/admin/crud";

export const MAX_IMPORT_ROWS = 2000;

type Field = "name" | "firstName" | "lastName" | "memberNumber" | "email" | "phone" | "status" | "buddyGroup" | "membershipDate" | "professionalTitle" | "organization" | "notes";

/** Accepted column names (compared lower-case with spaces and punctuation removed). */
const ALIASES: Record<Field, string[]> = {
  name: ["name", "fullname", "membername", "names"],
  firstName: ["firstname", "givenname", "forename"],
  lastName: ["lastname", "surname", "familyname"],
  memberNumber: ["memberid", "membernumber", "memberno", "membershipnumber", "membershipid", "id"],
  email: ["email", "emailaddress", "mail", "e-mail"],
  phone: ["phone", "phonenumber", "mobile", "mobilenumber", "tel", "telephone", "whatsapp", "contact"],
  status: ["status", "membershipstatus", "memberstatus"],
  buddyGroup: ["buddygroup", "buddy", "buddies", "group", "buddygroupname"],
  membershipDate: ["membershipdate", "joined", "datejoined", "joindate", "joiningdate", "inducted", "inductiondate", "membersince"],
  professionalTitle: ["profession", "occupation", "jobtitle", "professionaltitle", "job", "role", "position"],
  organization: ["organisation", "organization", "employer", "company", "workplace", "business"],
  notes: ["notes", "note", "comments", "comment", "remarks"],
};
const norm = (h: string) => h.toLowerCase().replace(/[^a-z]/g, "");

const STATUS_WORDS: Record<string, MemberStatus> = {
  active: "ACTIVE", current: "ACTIVE", paid: "ACTIVE", member: "ACTIVE", yes: "ACTIVE",
  pending: "PENDING", prospect: "PENDING", new: "PENDING", probation: "PENDING", applicant: "PENDING",
  inactive: "INACTIVE", dormant: "INACTIVE", lapsed: "INACTIVE",
  alumni: "ALUMNI", alumnus: "ALUMNI", alumna: "ALUMNI", former: "ALUMNI", past: "ALUMNI", left: "ALUMNI", graduated: "ALUMNI",
  honorary: "HONORARY", honourary: "HONORARY",
  archived: "ARCHIVED", archive: "ARCHIVED",
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Day-first dates (as used in Uganda), ISO dates, "12 March 2020", "March 2020" and a bare year. */
function parseDate(raw: string): { date: Date | null; warning?: string } {
  const s = raw.trim().replace(/\s+/g, " ");
  let y: number, m: number, d = 1;
  let warning: string | undefined;
  let mt: RegExpMatchArray | null;
  const mon = (w: string) => MONTHS.indexOf(w.slice(0, 3).toLowerCase()) + 1;
  if ((mt = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) [y, m, d] = [+mt[1], +mt[2], +mt[3]];
  else if ((mt = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) [d, m, y] = [+mt[1], +mt[2], +mt[3]];
  else if ((mt = s.match(/^(\d{1,2})(?:st|nd|rd|th)? ([A-Za-z]{3,})\.?,? (\d{4})$/))) [d, m, y] = [+mt[1], mon(mt[2]), +mt[3]];
  else if ((mt = s.match(/^([A-Za-z]{3,})\.? (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})$/))) [m, d, y] = [mon(mt[1]), +mt[2], +mt[3]];
  else if ((mt = s.match(/^([A-Za-z]{3,})\.?,? (\d{4})$/))) [m, y] = [mon(mt[1]), +mt[2]];
  else if ((mt = s.match(/^(\d{4})$/))) {
    [y, m] = [+mt[1], 1];
    warning = `Only the year was given for the membership date; recorded as 1 January ${y}.`;
  } else return { date: null, warning: `Couldn't read the membership date "${raw}"; left it out.` };
  const check = new Date(Date.UTC(y, m - 1, d));
  if (!m || y < 1950 || y > 2100 || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d)
    return { date: null, warning: `Couldn't read the membership date "${raw}"; left it out.` };
  return { date: new Date(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00+03:00`), warning };
}

type Existing = Awaited<ReturnType<typeof loadExisting>>;
async function loadExisting() {
  const [members, freePeople] = await Promise.all([
    db.member.findMany({ include: { person: { select: { id: true, name: true, professionalTitle: true, organization: true } }, buddyGroup: { select: { name: true } } } }),
    db.person.findMany({ where: { member: null, type: "MEMBER" }, select: { id: true, name: true, professionalTitle: true, organization: true } }),
  ]);
  return { members, freePeople };
}

export type PlanAction = "create" | "link" | "update" | "unchanged" | "skip";
export type PlanRow = {
  line: number;
  name: string;
  memberNumber: string;
  action: PlanAction;
  details: string[];
  warnings: string[];
  /** internal: what to write */
  apply?: {
    memberId?: string;
    personId?: string;
    member: { email?: string; phone?: string; status?: MemberStatus; membershipDate?: Date; notes?: string };
    /** buddy group by name; created on import if the club doesn't have it yet */
    buddyGroup?: string;
    person: { professionalTitle?: string; organization?: string };
  };
};
export type Plan = { rows: PlanRow[]; ignoredColumns: string[]; error?: string; counts: Record<PlanAction, number> };

const clip = (s: string, n: number) => s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const nameKey = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, " ").trim();

/** Read the CSV and work out, row by row, what an import would do. Writes nothing. */
export async function planMemberImport(csvText: string): Promise<Plan> {
  const counts: Record<PlanAction, number> = { create: 0, link: 0, update: 0, unchanged: 0, skip: 0 };
  const rows = parseCsv(csvText);
  if (rows.length < 2) return { rows: [], ignoredColumns: [], counts, error: "The file needs a header row and at least one member." };
  if (rows.length - 1 > MAX_IMPORT_ROWS) return { rows: [], ignoredColumns: [], counts, error: `The file has ${rows.length - 1} rows; the limit is ${MAX_IMPORT_ROWS}. Split it into smaller files.` };

  const header = rows[0];
  const col: Partial<Record<Field, number>> = {};
  const ignoredColumns: string[] = [];
  header.forEach((h, i) => {
    const key = norm(h);
    const field = (Object.keys(ALIASES) as Field[]).find((f) => ALIASES[f].includes(key));
    if (field && col[field] === undefined) col[field] = i;
    else if (h) ignoredColumns.push(h);
  });
  if (col.name === undefined && col.firstName === undefined) return { rows: [], ignoredColumns, counts, error: 'No "Name" column found. The first row must hold column names, including Name (or First name and Last name).' };

  const ex: Existing = await loadExisting();
  const groupNames = new Map((await db.buddyGroup.findMany({ select: { name: true } })).map((g) => [g.name.toLowerCase(), g.name]));
  const newGroups = new Set<string>();
  /** The club's spelling of a buddy group, or the file's spelling for a new one (noted once). */
  const groupFor = (raw: string, details: string[]) => {
    const name = clip(raw, 60);
    if (!name) return undefined;
    const known = groupNames.get(name.toLowerCase());
    if (known) return known;
    if (!newGroups.has(name.toLowerCase())) {
      newGroups.add(name.toLowerCase());
      details.push(`new buddy group "${name}"`);
    }
    return name;
  };
  const byNumber = new Map(ex.members.map((m) => [m.memberNumber.toUpperCase(), m]));
  const byEmail = new Map(ex.members.filter((m) => m.email).map((m) => [m.email!.toLowerCase(), m]));
  const byPhone = new Map(ex.members.map((m) => [normalisePhone(m.phone), m]).filter(([k]) => !!k) as [string, (typeof ex.members)[number]][]);
  const freeByName = new Map<string, typeof ex.freePeople>();
  for (const p of ex.freePeople) freeByName.set(nameKey(p.name), [...(freeByName.get(nameKey(p.name)) || []), p]);

  // Member IDs given in the file are reserved before any are generated.
  const given = new Set(rows.slice(1).map((r) => (col.memberNumber !== undefined ? clip(r[col.memberNumber] || "", 40).toUpperCase() : "")).filter(Boolean));
  // New IDs continue from the highest existing KN- number, skipping any the file already uses.
  let nextNo = Math.max(0, ...ex.members.map((m) => Number(m.memberNumber.match(/^KN-(\d+)$/i)?.[1] || 0)));
  const newId = () => {
    let id: string;
    do id = `KN-${String(++nextNo).padStart(4, "0")}`;
    while (byNumber.has(id) || given.has(id));
    return id;
  };

  const seen = { number: new Map<string, number>(), email: new Map<string, number>(), phone: new Map<string, number>(), person: new Map<string, number>() };
  const get = (r: string[], f: Field) => (col[f] !== undefined ? r[col[f]!] || "" : "");
  const out: PlanRow[] = [];

  rows.slice(1).forEach((r, idx) => {
    const line = idx + 2;
    const warnings: string[] = [];
    const name = clip(get(r, "name") || `${get(r, "firstName")} ${get(r, "lastName")}`, 120);
    const memberNumber = clip(get(r, "memberNumber"), 40).toUpperCase();
    const skip = (why: string) => {
      counts.skip++;
      out.push({ line, name: name || "(no name)", memberNumber, action: "skip", details: [why], warnings });
    };
    if (name.length < 2) return skip("No name.");

    const rawEmail = clip(get(r, "email"), 200).toLowerCase();
    const email = rawEmail && isEmail(rawEmail) ? rawEmail : undefined;
    if (rawEmail && !email) warnings.push(`"${rawEmail}" isn't a valid email address; left it out.`);
    const rawPhone = clip(get(r, "phone"), 40);
    const phone = normalisePhone(rawPhone) || undefined;
    if (rawPhone && !phone) warnings.push(`"${rawPhone}" is too short for a phone number; left it out.`);
    const rawStatus = clip(get(r, "status"), 40);
    const status = rawStatus ? STATUS_WORDS[rawStatus.toLowerCase().split(/[\s/(]/)[0]] : undefined;
    if (rawStatus && !status) warnings.push(`Unknown status "${rawStatus}": a new member is set to Active, an existing one keeps their status.`);
    let membershipDate: Date | undefined;
    const rawDate = clip(get(r, "membershipDate"), 40);
    if (rawDate) {
      const pd = parseDate(rawDate);
      if (pd.date) membershipDate = pd.date;
      if (pd.warning) warnings.push(pd.warning);
    }
    const professionalTitle = clip(get(r, "professionalTitle"), 120) || undefined;
    const organization = clip(get(r, "organization"), 140) || undefined;
    const notes = clip(get(r, "notes"), 1000) || undefined;

    // The same person twice in one file
    const dupe = (memberNumber && seen.number.get(memberNumber)) || (email && seen.email.get(email)) || (phone && seen.phone.get(phone));
    if (dupe) return skip(`Same person as row ${dupe}.`);

    // Find who this is
    const byId = memberNumber ? byNumber.get(memberNumber) : undefined;
    const byContact = (email && byEmail.get(email)) || (phone && byPhone.get(phone)) || undefined;
    if (byId && byContact && byId.id !== byContact.id)
      return skip(`Member ID ${memberNumber} belongs to ${byId.person.name}, but this email or phone belongs to ${byContact.person.name} (${byContact.memberNumber}). Fix the row, then import again.`);
    if (!byId && memberNumber && byContact)
      return skip(`This email or phone belongs to ${byContact.person.name} (${byContact.memberNumber}), but the row gives Member ID ${memberNumber}. Fix the row, then import again.`);
    // With no ID, email or phone to go on, an exact name match with one existing member counts (so re-importing doesn't duplicate).
    const sameName = !memberNumber && !email && !phone ? ex.members.filter((m) => nameKey(m.person.name) === nameKey(name)) : [];
    const target = byId || byContact || (sameName.length === 1 ? sameName[0] : undefined);

    const mark = (n: number) => {
      if (memberNumber) seen.number.set(memberNumber, n);
      if (email) seen.email.set(email, n);
      if (phone) seen.phone.set(phone, n);
    };

    if (target) {
      if (seen.person.get(target.id)) return skip(`Same person as row ${seen.person.get(target.id)}.`);
      seen.person.set(target.id, line);
      mark(line);
      const member: NonNullable<PlanRow["apply"]>["member"] = {};
      const person: NonNullable<PlanRow["apply"]>["person"] = {};
      const details: string[] = [];
      if (email && email !== (target.email || "").toLowerCase()) (member.email = email), details.push(`email → ${email}`);
      if (phone && phone !== normalisePhone(target.phone)) (member.phone = phone), details.push(`phone → ${phone}`);
      if (status && status !== target.status) (member.status = status), details.push(`status → ${status.toLowerCase()}`);
      const group = groupFor(get(r, "buddyGroup"), details);
      if (group && group.toLowerCase() !== (target.buddyGroup?.name || "").toLowerCase()) details.push(`buddy group → ${group}`);
      if (membershipDate && membershipDate.getTime() !== target.membershipDate?.getTime()) (member.membershipDate = membershipDate), details.push(`joined → ${kampalaDay(membershipDate)}`);
      if (notes && !(target.notes || "").includes(notes)) (member.notes = target.notes ? `${target.notes}\n${notes}` : notes), details.push("note added");
      if (professionalTitle && !target.person.professionalTitle) (person.professionalTitle = professionalTitle), details.push(`profession → ${professionalTitle}`);
      if (organization && !target.person.organization) (person.organization = organization), details.push(`organisation → ${organization}`);
      if (nameKey(name) !== nameKey(target.person.name)) warnings.push(`The file says "${name}"; the record keeps "${target.person.name}".`);
      const action: PlanAction = details.length ? "update" : "unchanged";
      counts[action]++;
      const buddyGroup = group && group.toLowerCase() !== (target.buddyGroup?.name || "").toLowerCase() ? group : undefined;
      out.push({ line, name: target.person.name, memberNumber: target.memberNumber, action, details: details.length ? details : ["Already up to date"], warnings, apply: { memberId: target.id, member, person, buddyGroup } });
      return;
    }

    // New member: reuse a member profile with this exact name if there is exactly one
    const candidates = freeByName.get(nameKey(name)) || [];
    const reuse = candidates.length === 1 && !seen.person.get(candidates[0].id) ? candidates[0] : undefined;
    if (candidates.length > 1) warnings.push(`${candidates.length} existing profiles are called "${name}"; created a new one. Merge them by hand if they're the same person.`);
    if (reuse) seen.person.set(reuse.id, line);
    mark(line);
    const id = memberNumber || newId();
    const details = [reuse ? `Linked to the existing profile "${reuse.name}"` : "New hidden profile"];
    if (!memberNumber) details.push(`Member ID ${id} assigned`);
    const buddyGroup = groupFor(get(r, "buddyGroup"), details);
    if (buddyGroup) details.push(`buddy group ${buddyGroup}`);
    if (!email && !phone) warnings.push("No email or phone, so they can't be contacted or matched later.");
    const action: PlanAction = reuse ? "link" : "create";
    counts[action]++;
    out.push({
      line,
      name,
      memberNumber: id,
      action,
      details,
      warnings,
      apply: {
        personId: reuse?.id,
        member: { email, phone, status: status || "ACTIVE", membershipDate, notes },
        buddyGroup,
        person: reuse
          ? { professionalTitle: reuse.professionalTitle ? undefined : professionalTitle, organization: reuse.organization ? undefined : organization }
          : { professionalTitle, organization },
      },
    });
  });

  return { rows: out, ignoredColumns, counts };
}

/** Id of the buddy group with this name (any capitalisation), creating it if needed. */
export async function buddyGroupId(name: string) {
  const found = await db.buddyGroup.findFirst({ where: { name: { equals: name, mode: "insensitive" } }, select: { id: true } });
  if (found) return found.id;
  try {
    return (await db.buddyGroup.create({ data: { name }, select: { id: true } })).id;
  } catch {
    // created by a parallel request a moment ago
    return (await db.buddyGroup.findFirstOrThrow({ where: { name: { equals: name, mode: "insensitive" } }, select: { id: true } })).id;
  }
}

/** Carry out a plan. Each row is written on its own, so one failure doesn't stop the rest. */
export async function applyMemberImport(plan: Plan) {
  const done: Record<"created" | "linked" | "updated", number> = { created: 0, linked: 0, updated: 0 };
  const failed: { line: number; name: string; error: string }[] = [];
  for (const r of plan.rows) {
    if (!r.apply || r.action === "skip" || r.action === "unchanged") continue;
    const { person } = r.apply;
    const member = { ...r.apply.member, ...(r.apply.buddyGroup ? { buddyGroupId: await buddyGroupId(r.apply.buddyGroup) } : {}) };
    const personData = Object.fromEntries(Object.entries(person).filter(([, v]) => v !== undefined));
    try {
      if (r.action === "update") {
        await db.member.update({ where: { id: r.apply.memberId }, data: member });
        if (Object.keys(personData).length) await db.member.update({ where: { id: r.apply.memberId }, data: { person: { update: personData } } });
        done.updated++;
      } else {
        let personId = r.apply.personId;
        if (personId) {
          if (Object.keys(personData).length) await db.person.update({ where: { id: personId }, data: personData });
        } else {
          const p = await db.person.create({
            data: { name: r.name, slug: await uniqueSlug("person", r.name), type: "MEMBER", isPublic: false, verification: "VERIFIED", sourceType: "IMPORT", ...personData },
          });
          personId = p.id;
        }
        await db.member.create({ data: { personId, memberNumber: r.memberNumber, ...member } });
        done[r.action === "link" ? "linked" : "created"]++;
      }
    } catch (e) {
      failed.push({ line: r.line, name: r.name, error: (e as Error).message.split("\n").pop()?.slice(0, 200) || "Unknown error" });
    }
  }
  return { ...done, failed };
}
