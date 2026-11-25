import data from "@/data/clubs.json";
import { MEETING } from "./config";

export type ClubType = "ROTARY" | "ROTARACT";
export type Club = { name: string; district: string; type: ClubType };

/** Lower-case, accents and punctuation removed: "Rotaract Club of Kampala-Central" ≈ "rotaract club of kampala central". */
export const foldName = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "");
const stripPrefix = (s: string) => s.replace(/^\s*(the\s+)?rot(ary|aract)\s+club\s+of\s+/i, "");

/** Clubs a visitor can choose from. The home club is removed. */
export const CLUBS: Club[] = (data as Club[]).filter((c) => foldName(c.name) !== foldName(MEETING.HOME_CLUB_LISTED));

/**
 * The listed spelling of a club typed or chosen by a visitor, or undefined.
 * Matches case- and punctuation-insensitively, with or without "Rotary/Rotaract Club of".
 */
export function findClub(name: string, type?: ClubType): Club | undefined {
  const full = foldName(name);
  if (!full) return undefined;
  const short = foldName(stripPrefix(name));
  const pool = type ? CLUBS.filter((c) => c.type === type) : CLUBS;
  return pool.find((c) => foldName(c.name) === full) ?? pool.find((c) => foldName(stripPrefix(c.name)) === short);
}
