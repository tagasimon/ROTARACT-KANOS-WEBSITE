import type { Prisma } from "@prisma/client";

export const publicBusiness = { publishStatus: "PUBLISHED" } satisfies Prisma.BusinessWhereInput;

export const businessCardInclude = {
  logo: true,
  owner: { select: { slug: true, name: true, honorific: true, isPublic: true } },
} satisfies Prisma.BusinessInclude;

export type BusinessCardData = Prisma.BusinessGetPayload<{ include: typeof businessCardInclude }>;

export const KIND_LABEL = { MEMBER_BUSINESS: "Member business", CORPORATE_MEMBER: "Corporate member" } as const;

/** "Services" is stored one per line. */
export function servicesOf(b: { services: string | null }) {
  return (b.services || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}
