import type { Metadata } from "next";
import Link from "next/link";
import { requireArea } from "@/lib/auth";
import { MEETING } from "@/lib/meeting/config";
import { qrSvg, signInUrl } from "@/lib/qr";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: { absolute: `Sign-in poster | ${MEETING.CLUB_NAME}` }, robots: { index: false, follow: false } };

/** One A4 page: print it for the venue, or put it on a screen. */
export default async function PosterPage() {
  await requireArea("attendance");
  const svg = await qrSvg();
  const short = signInUrl().replace(/^https?:\/\//, "");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-6 py-10 text-center text-fg print:min-h-0 print:p-0">
      <style>{"@page { size: A4; margin: 14mm; }"}</style>
      <div className="mb-8 flex gap-3 print:hidden">
        <PrintButton />
        <Link href="/admin/attendance" className="rounded-full border border-fg/20 px-5 py-2.5 text-sm font-semibold">Back to attendance</Link>
      </div>
      <div className="flex w-full max-w-[175mm] flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MEETING.LOGO_PNG} alt={MEETING.CLUB_NAME} className="h-20 w-auto print:h-[22mm]" />
        <h1 className="mt-10 text-6xl font-bold leading-tight text-royal print:mt-[12mm] print:text-[34pt]">Welcome to the meeting.</h1>
        <div className="mt-8 w-full max-w-[110mm] [&_svg]:h-auto [&_svg]:w-full print:mt-[10mm]" dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label="QR code for meeting sign-in" />
        <p className="mt-8 text-4xl font-bold text-cranberry print:mt-[8mm] print:text-[26pt]">Scan to sign in</p>
        <p className="mt-3 font-mono text-2xl text-stone print:text-[16pt]">{short}</p>
        <div className="mt-10 h-2 w-40 bg-gold print:mt-[10mm]" aria-hidden />
      </div>
    </div>
  );
}
