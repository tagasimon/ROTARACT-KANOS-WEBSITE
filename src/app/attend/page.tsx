import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { MEETING } from "@/lib/meeting/config";
import { meetingSettings } from "@/lib/meeting/settings";
import { clockTime, longDate, previewTodaysMeeting } from "@/lib/meeting/today";
import { AttendForm } from "./AttendForm";

export const metadata: Metadata = { title: { absolute: `Meeting sign-in | ${MEETING.CLUB_NAME}` }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AttendPage() {
  const [meeting, ms, groups] = await Promise.all([previewTodaysMeeting(), meetingSettings(), db.buddyGroup.findMany({ select: { id: true, name: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })]);
  const today = longDate(new Date());
  return (
    <div className="min-h-dvh bg-paper-2">
      <header className="border-t-4 border-t-gold bg-white">
        <div className="mx-auto flex max-w-xl items-center justify-between px-5 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MEETING.LOGO_PNG} alt={MEETING.CLUB_NAME} width={442} height={100} className="h-9 w-auto" />
          <Link href="/" className="text-sm font-semibold text-royal hover:underline">Club website</Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-xl px-5 pb-16 pt-8">
        <p className="font-cond text-sm font-bold uppercase tracking-wider text-cranberry">Sign in · {today}</p>
        <h1 className="mt-2 text-4xl font-bold leading-tight text-royal">{meeting.title}</h1>
        {meeting.type !== "GATHERING" && (
          <p className="mt-2 text-base text-stone">{clockTime(meeting.date)}{meeting.venue ? ` · ${meeting.venue}` : ""}</p>
        )}
        <div className="mt-8">
          <AttendForm meetingDay={ms.weekdayName} groups={groups} />
        </div>
      </main>
    </div>
  );
}
