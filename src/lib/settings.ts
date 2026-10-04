import "server-only";
import { cache } from "react";
import { db } from "./db";

export type SiteSettings = {
  clubName: string;
  shortName: string;
  legalNote: string;
  tagline: string;
  description: string;
  heroHeadline: string;
  heroSubhead: string;
  heroImageId: string | null;
  logoImageId: string | null;
  charterDate: string | null; // ISO
  charterVerified: boolean;
  district: string;
  riClubId: string;
  meetingDay: string;
  meetingTime: string;
  meetingVenue: string;
  meetingAddress: string;
  meetingLat: number | null;
  meetingLng: number | null;
  meetingVerified: boolean;
  email: string;
  phone: string;
  socials: { x: string; instagram: string; facebook: string; linkedin: string; youtube: string; tiktok: string };
  sponsorNote: string;
  joinIntro: string;
  /** Support page: how to give (bank / mobile money / Rotary Foundation). Markdown, entered by an admin. */
  donationInstructions: string;
  attendanceFollowUpThreshold: number; // % below which a member needs follow-up
};

export const DEFAULT_SETTINGS: SiteSettings = {
  clubName: "Rotaract Club Kampala North",
  shortName: "Kampala North",
  legalNote: "A Rotaract club of Rotary District 9213, Uganda.",
  tagline: "Young professionals. Real service. A record that lasts.",
  description:
    "A community-based Rotaract club in Kampala where young professionals meet every week to serve, to grow and to build friendships that outlast their term.",
  heroHeadline: "Kampala North, in service since 2014.",
  heroSubhead: "",
  heroImageId: null,
  logoImageId: null,
  charterDate: "2014-12-01",
  charterVerified: true,
  district: "Rotary District 9213",
  riClubId: "92123",
  meetingDay: "Friday",
  meetingTime: "6:00 PM",
  meetingVenue: "Hotel Triangle",
  meetingAddress: "Buganda Road, Kampala",
  meetingLat: 0.3205,
  meetingLng: 32.5735,
  meetingVerified: true,
  email: "",
  phone: "",
  socials: { x: "https://x.com/kanosug", instagram: "https://www.instagram.com/kanosug/", facebook: "https://www.facebook.com/kanosug/", linkedin: "", youtube: "", tiktok: "" },
  sponsorNote: "",
  joinIntro:
    "Rotaract membership is not an online sign-up. Come to a Friday fellowship, meet the club, and we'll walk you through how joining works.",
  donationInstructions: "",
  attendanceFollowUpThreshold: 50,
};

export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const row = await db.siteSetting.findUnique({ where: { key: "site" } });
    const v = (row?.value as Partial<SiteSettings>) || {};
    return { ...DEFAULT_SETTINGS, ...v, socials: { ...DEFAULT_SETTINGS.socials, ...(v.socials || {}) } };
  } catch {
    return DEFAULT_SETTINGS;
  }
});
