"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { clientIp, createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { ADMIN_ROLES } from "@/lib/rbac";

export type AuthState = { error?: string };

let _dummy: Promise<string> | null = null;
const dummyHash = () => (_dummy ||= bcrypt.hash("not-a-real-password", 12));

function safeNext(n: FormDataEntryValue | null) {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "";
}

export async function login(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const password = String(fd.get("password") || "");
  const ip = (await clientIp()) || "unknown";
  const rl = await rateLimit(`login:${ip}`, 10, 900);
  if (!rl.ok) return { error: "Too many attempts. Please wait 15 minutes and try again." };
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    if (!user) await bcrypt.compare(password, await dummyHash()); // equalise timing for unknown emails
    return { error: "That email and password don't match." };
  }
  await createSession(user.id);
  await audit(user.id, "login", "user", user.id);
  redirect(safeNext(fd.get("next")) || (ADMIN_ROLES.includes(user.role) ? "/admin" : "/account"));
}

const activateSchema = z.object({
  memberNumber: z.string().trim().min(1).max(40),
  pin: z.string().trim().regex(/^\d{4,8}$/, "Your PIN is 4–8 digits"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

/** First-time account creation for an existing member record (Member ID + PIN from the club). */
export async function activate(_: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = activateSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { memberNumber, pin, email, password } = parsed.data;
  const ip = (await clientIp()) || "unknown";
  if (!(await rateLimit(`activate:${ip}`, 8, 900)).ok) return { error: "Too many attempts. Please wait 15 minutes." };
  const member = await db.member.findUnique({ where: { memberNumber: memberNumber.toUpperCase() }, include: { user: true } });
  if (!member || !member.pinHash || !(await bcrypt.compare(pin, member.pinHash))) return { error: "That Member ID and PIN don't match our records. Ask the club secretary or attendance officer." };
  if (member.user) return { error: "This member already has an account. Sign in instead." };
  if (await db.user.findUnique({ where: { email } })) return { error: "That email is already used by another account." };
  const user = await db.user.create({ data: { email, passwordHash: await hashPassword(password), role: "MEMBER", memberId: member.id } });
  if (!member.email) await db.member.update({ where: { id: member.id }, data: { email } });
  await createSession(user.id);
  await audit(user.id, "activate", "member", member.id);
  redirect(safeNext(fd.get("next")) || "/account");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
