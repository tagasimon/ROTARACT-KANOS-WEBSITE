"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireArea } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getSettings, type SiteSettings } from "@/lib/settings";
import { saveImageUpload } from "@/lib/media";

export async function saveSettings(fd: FormData) {
  const user = await requireArea("settings");
  const cur = await getSettings();
  const str = (k: string) => String(fd.get(k) ?? "").trim();
  const num = (k: string) => (str(k) === "" ? null : Number(str(k)));
  let heroImageId = cur.heroImageId;
  const hero = fd.get("heroImage") as File | null;
  if (hero && typeof hero === "object" && hero.size) heroImageId = (await saveImageUpload(hero, { alt: str("heroAlt") || "Rotaract Club Kampala North" }))?.id ?? heroImageId;
  if (fd.get("heroRemove") === "on") heroImageId = null;
  let logoImageId = cur.logoImageId;
  const logo = fd.get("logoImage") as File | null;
  if (logo && typeof logo === "object" && logo.size) logoImageId = (await saveImageUpload(logo, { alt: "Club logo" }))?.id ?? logoImageId;
  if (fd.get("logoRemove") === "on") logoImageId = null;
  const next: SiteSettings = {
    ...cur,
    clubName: str("clubName") || cur.clubName,
    shortName: str("shortName") || cur.shortName,
    legalNote: str("legalNote"),
    tagline: str("tagline"),
    description: str("description"),
    heroHeadline: str("heroHeadline") || cur.heroHeadline,
    heroSubhead: str("heroSubhead"),
    heroImageId,
    logoImageId,
    charterDate: str("charterDate") || null,
    charterVerified: fd.get("charterVerified") === "on",
    district: str("district"),
    riClubId: str("riClubId"),
    meetingDay: str("meetingDay") || "Friday",
    meetingTime: str("meetingTime"),
    meetingVenue: str("meetingVenue"),
    meetingAddress: str("meetingAddress"),
    meetingLat: num("meetingLat"),
    meetingLng: num("meetingLng"),
    meetingVerified: fd.get("meetingVerified") === "on",
    email: str("email"),
    phone: str("phone"),
    socials: { x: str("x"), instagram: str("instagram"), facebook: str("facebook"), linkedin: str("linkedin"), youtube: str("youtube"), tiktok: str("tiktok") },
    sponsorNote: str("sponsorNote"),
    joinIntro: str("joinIntro"),
    donationInstructions: str("donationInstructions"),
    attendanceFollowUpThreshold: Number(str("attendanceFollowUpThreshold") || 50),
  };
  await db.siteSetting.upsert({ where: { key: "site" }, create: { key: "site", value: next as unknown as Prisma.InputJsonValue }, update: { value: next as unknown as Prisma.InputJsonValue } });
  await audit(user.id, "update", "settings", "site");
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}
