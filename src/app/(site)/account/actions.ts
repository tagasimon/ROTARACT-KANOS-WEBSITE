"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { saveImageUpload } from "@/lib/media";
import { audit } from "@/lib/audit";

export type FormState = { ok?: string; error?: string };

const url = z.string().trim().url("Links must be full URLs (https://…)").max(300).optional().or(z.literal(""));
const profileSchema = z.object({
  professionalTitle: z.string().trim().max(120).optional(),
  organization: z.string().trim().max(160).optional(),
  bio: z.string().trim().max(5000).optional(),
  interests: z.string().trim().max(500).optional(),
  expertise: z.string().trim().max(500).optional(),
  linkedin: url,
  x: url,
  instagram: url,
  website: url,
});

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!user.member) return { error: "Your account isn't linked to a member profile." };
  const parsed = profileSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const skills = fd.getAll("skills").map(String).filter(Boolean);
  const photo = fd.get("photo") as File | null;
  let photoId: string | undefined;
  try {
    if (photo && photo.size) photoId = (await saveImageUpload(photo, { alt: user.member.person.name }))?.id;
  } catch (e) {
    return { error: (e as Error).message };
  }
  const d = parsed.data;
  await db.person.update({
    where: { id: user.member.personId },
    data: {
      professionalTitle: d.professionalTitle || null,
      organization: d.organization || null,
      bio: d.bio || null,
      interests: d.interests || null,
      expertise: d.expertise || null,
      linkedin: d.linkedin || null,
      x: d.x || null,
      instagram: d.instagram || null,
      website: d.website || null,
      isPublic: fd.get("isPublic") === "on",
      skills: { set: skills.map((id) => ({ id })) },
      ...(photoId ? { photoId } : {}),
    },
  });
  await audit(user.id, "update", "person", user.member.personId, "Member edited own profile");
  revalidatePath("/account");
  return { ok: "Profile saved." };
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(fd.get("current") || "");
  const next = String(fd.get("next") || "");
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "Current password is incorrect." };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  await audit(user.id, "update", "user", user.id, "Changed password");
  return { ok: "Password changed." };
}
