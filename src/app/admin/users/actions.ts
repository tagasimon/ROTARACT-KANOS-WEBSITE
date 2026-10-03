"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { requireArea, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

const ROLES: Role[] = ["SUPER_ADMIN", "CLUB_ADMIN", "ATTENDANCE_OFFICER", "EDITOR", "MEMBER"];

export async function createUser(fd: FormData) {
  const me = await requireArea("users");
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const password = String(fd.get("password") || "");
  const role = String(fd.get("role")) as Role;
  const memberId = String(fd.get("memberId") || "") || null;
  if (!email || password.length < 8 || !ROLES.includes(role)) redirect("/admin/users?error=Email%2C%20a%208%2B%20character%20password%20and%20a%20role%20are%20required");
  if (await db.user.findUnique({ where: { email } })) redirect("/admin/users?error=That%20email%20already%20has%20an%20account");
  const u = await db.user.create({ data: { email, passwordHash: await hashPassword(password), role, memberId } });
  await audit(me.id, "create", "user", u.id, `${email} as ${role}`);
  revalidatePath("/admin/users");
  redirect("/admin/users?msg=User%20created");
}

export async function updateUser(id: string, fd: FormData) {
  const me = await requireArea("users");
  const role = String(fd.get("role")) as Role;
  const active = fd.get("active") === "on";
  const memberId = String(fd.get("memberId") || "") || null;
  if (id === me.id && (role !== "SUPER_ADMIN" || !active)) redirect("/admin/users?error=You%20can%27t%20demote%20or%20deactivate%20yourself");
  const pw = String(fd.get("password") || "");
  await db.user.update({ where: { id }, data: { role: ROLES.includes(role) ? role : undefined, active, memberId, ...(pw ? { passwordHash: await hashPassword(pw) } : {}) } });
  if (!active || pw) await db.session.deleteMany({ where: { userId: id } });
  await audit(me.id, "update", "user", id, `role=${role} active=${active}${pw ? " password reset" : ""}`);
  revalidatePath("/admin/users");
  redirect("/admin/users?msg=Saved");
}
