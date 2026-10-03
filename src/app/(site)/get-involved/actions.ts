"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/auth";

const schema = z.object({
  type: z.enum(["ATTEND", "VOLUNTEER", "PARTNER", "SUPPORT_PROJECT", "JOIN", "CONTACT"]),
  name: z.string().trim().min(2, "Please tell us your name").max(120),
  email: z.string().trim().email("Please enter a valid email").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  organization: z.string().trim().max(160).optional().or(z.literal("")),
  message: z.string().trim().max(3000).optional().or(z.literal("")),
  projectId: z.string().optional().or(z.literal("")),
});

export type InquiryState = { ok?: boolean; error?: string; fields?: Record<string, string> };

export async function submitInquiry(_: InquiryState, fd: FormData): Promise<InquiryState> {
  if (fd.get("website")) return { ok: true }; // honeypot
  const raw = Object.fromEntries(fd.entries()) as Record<string, string>;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Please check the form", fields: raw };
  const ip = (await clientIp()) || "unknown";
  const rl = await rateLimit(`inquiry:${ip}`, 5, 3600);
  if (!rl.ok) return { error: "Too many submissions from this connection. Please try again later.", fields: raw };
  const d = parsed.data;
  await db.inquiry.create({ data: { type: d.type, name: d.name, email: d.email, phone: d.phone || null, organization: d.organization || null, message: d.message || null, projectId: d.projectId || null } });
  return { ok: true };
}
