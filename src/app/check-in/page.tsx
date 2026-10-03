import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Attendance check-in", robots: { index: false } };

export default async function CheckInHome() {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto w-full max-w-sm text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/50">Attendance</p>
      <h1 className="mt-3 text-4xl font-bold">Scan the QR code at the meeting.</h1>
      <p className="mt-4 text-paper/70">Point your phone camera at the code shown by the attendance officer. {user ? "You're signed in, so you'll be checked in instantly." : "Sign in first so future scans check you in automatically."}</p>
      <div className="mt-8 grid gap-3">
        {user ? <Link href="/account/attendance" className="btn-primary">My attendance</Link> : <Link href="/login?next=/check-in" className="btn-primary">Sign in</Link>}
        <Link href="/activate" className="btn-ghost-light">First time? Activate your account</Link>
      </div>
    </div>
  );
}
