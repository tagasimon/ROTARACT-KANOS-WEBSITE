"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { saveImageUpload } from "@/lib/media";
import { audit } from "@/lib/audit";
import { uniqueSlug } from "@/lib/admin/crud";
import { BUSINESS_CATEGORIES } from "@/lib/businesses";
import type { FormState } from "../actions";

const url = z.string().trim().max(300).refine((v) => !v || /^https?:\/\/\S+\.\S+/i.test(v), "Links must be full web addresses starting with https://").optional();
const schema = z.object({
  name: z.string().trim().min(2, "Enter the business name.").max(120),
  category: z.string().trim().refine((v) => !v || (BUSINESS_CATEGORIES as readonly string[]).includes(v), "Choose a category from the list.").optional(),
  tagline: z.string().trim().max(160, "Keep the one-line summary under 160 characters.").optional(),
  description: z.string().trim().max(5000).optional(),
  services: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(140).optional(),
  ownerRole: z.string().trim().max(80).optional(),
  website: url,
  contactUrl: url,
  linkedin: url,
  x: url,
  instagram: url,
  facebook: url,
});

/** A member adds or edits a business listing of their own. New listings wait for an admin to publish them. */
export async function saveMyBusiness(_: FormState, fd: FormData): Promise<FormState> {
  const id = String(fd.get("id") || "") || null;
  const user = await requireUser("/account");
  if (!user.member) return { error: "Your account isn't linked to a member profile. Ask a club admin to link it." };
  const personId = user.member.personId;
  const existing = id ? await db.business.findFirst({ where: { id, ownerId: personId } }) : null;
  if (id && !existing) return { error: "You can only edit your own listings." };

  const parsed = schema.safeParse(Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$"))));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const data = {
    name: d.name,
    category: d.category || null,
    tagline: d.tagline || null,
    description: d.description || null,
    services: d.services || null,
    location: d.location || null,
    ownerRole: d.ownerRole || null,
    website: d.website || null,
    contactUrl: d.contactUrl || null,
    linkedin: d.linkedin || null,
    x: d.x || null,
    instagram: d.instagram || null,
    facebook: d.facebook || null,
  };
  let logoId: string | undefined;
  try {
    const logo = fd.get("logo");
    if (logo instanceof File && logo.size) logoId = (await saveImageUpload(logo, { alt: `${d.name} logo` }))?.id;
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (!existing) {
    const b = await db.business.create({
      data: { ...data, ...(logoId ? { logoId } : {}), slug: await uniqueSlug("business", d.name), kind: "MEMBER_BUSINESS", ownerId: personId, publishStatus: "IN_REVIEW" },
    });
    await audit(user.id, "create", "business", b.id, `Member submitted a business listing: ${b.name}`);
    revalidatePath("/account");
    redirect(`/account/business/${b.id}?submitted=1`);
  }

  // A listing that was sent back, or drafted by an admin, goes (back) to review once the member edits it.
  const publishStatus = existing.publishStatus === "REJECTED" || existing.publishStatus === "DRAFT" ? "IN_REVIEW" : existing.publishStatus;
  await db.business.update({ where: { id: existing.id }, data: { ...data, ...(logoId ? { logoId } : {}), publishStatus } });
  await audit(user.id, "update", "business", existing.id, `Member edited their business listing: ${d.name}`);
  revalidatePath("/account");
  revalidatePath("/businesses");
  return { ok: publishStatus === "PUBLISHED" ? "Saved. Your changes are live." : "Saved. An admin will publish it after a quick check." };
}
