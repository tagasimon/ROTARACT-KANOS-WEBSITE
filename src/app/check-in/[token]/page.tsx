import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { clientIp, getCurrentUser } from "@/lib/auth";
import { checkSession, REASON_TEXT, signGrant, verifyGrant } from "@/lib/attendance";
import { fmtDate, fmtTime } from "@/lib/utils";
import { PinForm } from "./PinForm";
import { Done } from "./Done";

export const metadata: Metadata = { title: "Check in", robots: { index: false, follow: false } };

export default async function CheckInPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ c?: string; g?: string; t?: string }> }) {
  const { token } = await params;
  const { c, g, t } = await searchParams;
  const ip = await clientIp();
  let check = await checkSession(token, c, ip);
  // a recent valid scan (grant) survives the rotating code changing while the member signs in
  if (!check.ok && check.reason === "bad_code" && check.session && g && verifyGrant(token, Number(t), g)) check = { ok: true, session: check.session };

  if (!check.ok) {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-paper/10 text-4xl" aria-hidden>!</div>
        <h1 className="mt-6 text-3xl font-bold">{check.session?.title || "Check-in"}</h1>
        <p className="mt-3 text-lg text-paper/75">{REASON_TEXT[check.reason]}</p>
        <Link href="/check-in" className="btn-ghost-light mt-8">OK</Link>
      </div>
    );
  }
  const session = check.session;
  const user = await getCurrentUser();

  // Signed-in member → check in immediately (no form, no typing).
  if (user?.memberId && user.member) {
    const h = await headers();
    const rec = await db.attendanceRecord.upsert({
      where: { sessionId_memberId: { sessionId: session.id, memberId: user.memberId } },
      update: {},
      create: { sessionId: session.id, memberId: user.memberId, method: "QR_ACCOUNT", ip, userAgent: h.get("user-agent")?.slice(0, 250) },
    });
    const already = Date.now() - rec.checkedInAt.getTime() > 15000;
    return (
      <div className="mx-auto w-full max-w-sm">
        <Done name={user.member.person.name} at={rec.checkedInAt.toISOString()} already={already}>
          <p className="mt-2 text-paper/55">{session.title}</p>
          <Link href="/account/attendance" className="btn-ghost-light mt-8 w-full">See my attendance</Link>
        </Done>
      </div>
    );
  }

  const ts = Date.now();
  const grant = signGrant(token, ts);
  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/50">{fmtDate(session.startsAt, { weekday: "long", day: "numeric", month: "long" })} · {fmtTime(session.startsAt)}</p>
      <h1 className="mt-2 text-3xl font-bold leading-tight">{session.title}</h1>
      {user && !user.memberId && <p className="mt-3 rounded-md bg-paper/10 p-3 text-sm">Your account isn't linked to a member record. Use your Member ID and PIN below, or ask an admin to link it.</p>}
      <div className="mt-8"><PinForm token={token} ts={ts} grant={grant} /></div>
      {!user && (
        <p className="mt-8 text-center text-sm text-paper/60">
          Want this to be one tap? <Link href={`/login?next=${encodeURIComponent(`/check-in/${token}?g=${grant}&t=${ts}`)}`} className="font-semibold text-paper underline underline-offset-4">Sign in</Link> once on this phone.
        </p>
      )}
    </div>
  );
}
