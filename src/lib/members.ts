import "server-only";
import type { MemberStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentYear } from "@/lib/years";
import { absoluteUrl } from "@/lib/utils";
import type { Cell } from "@/lib/csv";

export const STATUS_LABEL: Record<MemberStatus, string> = {
  ACTIVE: "Active",
  PENDING: "Pending",
  INACTIVE: "Inactive",
  ALUMNI: "Alumni",
  HONORARY: "Honorary",
  ARCHIVED: "Archived",
};
export const STATUS_ORDER: MemberStatus[] = ["ACTIVE", "PENDING", "INACTIVE", "ALUMNI", "HONORARY", "ARCHIVED"];

export type MemberFilter = { q?: string; status?: string };

/** "status" is a MemberStatus, or empty for everyone except archived members. */
export function memberWhere(f: MemberFilter): Prisma.MemberWhereInput {
  const status = STATUS_ORDER.includes(f.status as MemberStatus) ? (f.status as MemberStatus) : null;
  const where: Prisma.MemberWhereInput = status ? { status } : { status: { not: "ARCHIVED" } };
  const q = (f.q || "").trim().slice(0, 80);
  if (q) {
    const c = { contains: q, mode: "insensitive" as const };
    where.OR = [{ memberNumber: c }, { email: c }, { phone: { contains: q.replace(/\s+/g, "") } }, { person: { name: c } }, { person: { professionalTitle: c } }, { person: { organization: c } }];
  }
  return where;
}

export function listMembers(f: MemberFilter, take = 500) {
  return db.member.findMany({
    where: memberWhere(f),
    include: { person: { select: { id: true, slug: true, name: true, professionalTitle: true, organization: true, isPublic: true } }, user: { select: { id: true } } },
    orderBy: { person: { name: "asc" } },
    take,
  });
}

export const MEMBER_CSV_HEADER = ["Member ID", "Name", "Status", "Email", "Phone", "Membership date", "Profession", "Organisation", "Skills", "Committees", "Current club role", "Public profile", "Profile link", "Account activated", "Notes"];

/** Rows for the members CSV export, filtered the same way as the members page. */
export async function memberCsvRows(f: MemberFilter): Promise<Cell[][]> {
  const year = await getCurrentYear();
  const members = await db.member.findMany({
    where: memberWhere(f),
    include: {
      user: { select: { id: true } },
      person: {
        include: {
          skills: { select: { name: true }, orderBy: { name: "asc" } },
          committeeMemberships: { include: { committee: { select: { name: true } }, year: { select: { label: true } } } },
          leadership: { where: year ? { yearId: year.id } : { id: "__none__" }, include: { role: { select: { title: true } } } },
        },
      },
    },
    orderBy: { person: { name: "asc" } },
  });
  return [
    MEMBER_CSV_HEADER,
    ...members.map((m) => [
      m.memberNumber,
      m.person.name,
      STATUS_LABEL[m.status],
      m.email,
      m.phone,
      m.membershipDate,
      m.person.professionalTitle,
      m.person.organization,
      m.person.skills.map((s) => s.name).join("; "),
      m.person.committeeMemberships.map((c) => (c.year ? `${c.committee.name} (${c.year.label})` : c.committee.name)).join("; "),
      m.person.leadership.map((l) => l.customTitle || l.role.title).join("; "),
      m.person.isPublic,
      m.person.isPublic ? absoluteUrl(`/people/${m.person.slug}`) : "",
      !!m.user,
      m.notes,
    ]),
  ];
}
