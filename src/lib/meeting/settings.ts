import "server-only";
import { getSettings } from "@/lib/settings";
import { MEETING, WEEKDAYS, parseClock } from "./config";

/** The regular meeting as currently set in Admin → Settings, with the config as fall-back. */
export async function meetingSettings() {
  const s = await getSettings();
  const idx = WEEKDAYS.findIndex((d) => d.toLowerCase() === (s.meetingDay || "").trim().toLowerCase());
  const weekday = idx >= 0 ? idx : MEETING.MEETING_WEEKDAY;
  const time = s.meetingTime?.trim() || MEETING.MEETING_TIME;
  const venue = [s.meetingVenue, s.meetingAddress].filter((x) => x && x.trim()).join(", ") || MEETING.VENUE;
  return { weekday, weekdayName: WEEKDAYS[weekday], time, clock: parseClock(time), venue };
}
