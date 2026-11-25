/**
 * Everything club-specific about meeting sign-in, in one place.
 * The meeting day, time and venue are editable in Admin → Settings; these are the fall-backs.
 * Safe to import from client components (no secrets, no server-only code).
 */
export const MEETING = {
  CLUB_NAME: "Rotaract Club Kampala North",
  CLUB_SHORT_NAME: "KANOs",
  /** Members are recorded as ROTARACTOR (or ROTARIAN for a Rotary club). */
  CLUB_TYPE: "ROTARACT" as "ROTARACT" | "ROTARY",
  DISTRICT: "9213",
  CLUB_ID: "92123",
  /** Make-up card numbers: KANOs-20261127-ABC123 */
  CLUB_CODE: "KANOs",
  TIMEZONE: "Africa/Kampala",
  /** JavaScript weekday numbering: Sunday is 0, Friday is 5. */
  MEETING_WEEKDAY: 5,
  MEETING_TIME: "6:00 PM",
  VENUE: "Hotel Triangle, Buganda Road, Kampala",
  /** Reply-to address on thank-you emails. */
  CLUB_EMAIL: "hello@kanosug.org",
  /** Must be a PNG (pdf-lib can't embed other formats). Served from /public. */
  LOGO_PNG: "/brand/rotaract-kampala-north.png",
  /** How the home club is spelled in src/data/clubs.json; it is left out of the visitors' list. */
  HOME_CLUB_LISTED: "Rotaract Club of Kampala North",
  /**
   * Rate limit for the public form, per IP address. Higher than the usual 40 because
   * everyone on the venue Wi-Fi shares one address, and a full meeting can pass 40 sign-ins.
   */
  SIGN_INS_PER_HOUR: 120,
} as const;

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "6:00 PM" → [18, 0]. Falls back to the configured time. */
export function parseClock(time?: string | null): [number, number] {
  const m = (time || MEETING.MEETING_TIME).match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return [18, 0];
  let h = +m[1];
  const min = m[2] ? +m[2] : 0;
  if (m[3]?.toLowerCase() === "pm" && h < 12) h += 12;
  if (m[3]?.toLowerCase() === "am" && h === 12) h = 0;
  return [h, min];
}
